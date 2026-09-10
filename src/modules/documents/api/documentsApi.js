import { supabase } from '../../../lib/supabaseClient'

// ============================================
// ENCRYPTION HELPERS
// ============================================

async function encryptFile(file, password) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    )

    const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, fileBytes)
    return new Blob([salt, iv, new Uint8Array(encryptedContent)], { type: 'application/octet-stream' })
  } catch (error) {
    console.error('Encryption failed:', error)
    throw error
  }
}

async function decryptFile(encryptedBlob, password) {
  try {
    const arrayBuffer = await encryptedBlob.arrayBuffer()
    const fullBytes = new Uint8Array(arrayBuffer)
    const salt = fullBytes.slice(0, 16)
    const iv = fullBytes.slice(16, 28)
    const encryptedData = fullBytes.slice(28)

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    )

    const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, encryptedData)
    return new Blob([decryptedContent])
  } catch (error) {
    console.error('Decryption failed:', error)
    throw error
  }
}

function getEncryptionPassword(folderType) {
  switch (folderType) {
    case 'contracts': return 'NDANDULENI_CONTRACTS_2025_SECURE'
    case 'finance': return 'NDANDULENI_FINANCE_2025_SECURE'
    case 'hr': return 'NDANDULENI_HR_2025_SECURE'
    default: return null
  }
}

function requiresEncryption(folderType) {
  return ['contracts', 'finance', 'hr'].includes(folderType)
}

// ✅ NEW: Extract storage path from URL
function extractStoragePath(fileUrl) {
  if (!fileUrl) return null
  
  try {
    // Handle full URLs like: https://xxx.supabase.co/storage/v1/object/public/documents/docs/123-file.enc
    if (fileUrl.startsWith('http')) {
      const url = new URL(fileUrl)
      const pathParts = url.pathname.split('/')
      // Find 'documents' in path (bucket name) and get everything after
      const bucketIndex = pathParts.indexOf('documents')
      if (bucketIndex !== -1) {
        return pathParts.slice(bucketIndex + 1).join('/')
      }
      // Fallback: return last 2 parts
      return pathParts.slice(-2).join('/')
    }
    return fileUrl
  } catch (err) {
    console.error('Path extraction error:', err)
    return null
  }
}

// ✅ NEW: Try all passwords if unknown folder type
async function tryAllPasswords(encryptedBlob) {
  const passwords = [
    'NDANDULENI_CONTRACTS_2025_SECURE',
    'NDANDULENI_FINANCE_2025_SECURE',
    'NDANDULENI_HR_2025_SECURE',
  ]
  
  for (const pwd of passwords) {
    try {
      const blob = await decryptFile(encryptedBlob, pwd)
      if (blob) return { blob, password: pwd }
    } catch (e) {
      continue
    }
  }
  return null
}

// ============================================
// ACCESS CONTROL RULES
// ONLY SUPER ADMIN CAN ACCESS ENCRYPTED FOLDERS
// ============================================
const ENCRYPTED_FOLDER_ACCESS = {
  contracts: ['super_admin'],
  finance: ['super_admin'],
  hr: ['super_admin']
}

export const documentsApi = {
  // ============================================
  // GET CURRENT USER ROLE
  // ============================================
  async getCurrentUserRole() {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()

      return profile?.role || null
    } catch (err) {
      console.error('Role fetch error:', err)
      return null
    }
  },

  canAccessEncryptedFolder(userRole, folderType) {
    if (!userRole) return false
    if (userRole === 'super_admin') return true
    return false
  },

  // ============================================
  // GET FOLDERS - Filtered by user role
  // ============================================
  async getFolders() {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .order('folder_name')

    if (error) return { data: [], error }

    const userRole = await this.getCurrentUserRole()
    
    const filteredFolders = (data || []).filter(folder => {
      if (!folder.is_encrypted) return true
      return userRole === 'super_admin'
    })

    return { data: filteredFolders, error: null }
  },

  async createFolder(folderData) {
    const userRole = await this.getCurrentUserRole()
    const isEncrypted = requiresEncryption(folderData.folder_type)
    
    if (isEncrypted && userRole !== 'super_admin') {
      return { error: 'Access denied: Only Super Admin can create encrypted folders.' }
    }

    const folderWithEncryption = {
      ...folderData,
      is_encrypted: isEncrypted,
      encryption_method: isEncrypted ? 'AES-256-GCM' : null
    }
    
    const { data, error } = await supabase
      .from('document_folders')
      .insert([folderWithEncryption])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // GET DOCUMENTS - Filtered by user role
  // ============================================
  async getDocuments(folderId = null, filters = {}) {
    const userRole = await this.getCurrentUserRole()

    let query = supabase
      .from('managed_documents')
      .select('*')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
    
    if (folderId) query = query.eq('folder_id', folderId)
    if (filters.type) query = query.eq('document_type', filters.type)
    if (filters.search) {
      query = query.or(`document_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) return { data: [], error }

    // Get folder info
    const folderIds = [...new Set((data || []).map(d => d.folder_id).filter(Boolean))]
    let folders = []
    if (folderIds.length > 0) {
      const { data: f } = await supabase.from('document_folders').select('*').in('id', folderIds)
      folders = f || []
    }

    const filteredDocs = (data || []).filter(doc => {
      if (!doc.is_encrypted) return true
      return userRole === 'super_admin'
    }).map(doc => ({
      ...doc,
      document_folders: folders.find(f => f.id === doc.folder_id) || null
    }))

    return { data: filteredDocs, error: null }
  },

  // ============================================
  // UPLOAD DOCUMENT
  // ============================================
  async uploadDocument(file, metadata) {
    try {
      if (!file) return { error: 'No file provided' }

      if (metadata.folder_id) {
        const userRole = await this.getCurrentUserRole()
        const { data: folder } = await supabase
          .from('document_folders')
          .select('folder_type, is_encrypted')
          .eq('id', metadata.folder_id)
          .single()

        if (folder?.is_encrypted && userRole !== 'super_admin') {
          return { error: 'Access denied: Only Super Admin can upload to encrypted folders.' }
        }
      }

      let isEncrypted = false
      let encryptionPassword = null

      if (metadata.folder_id) {
        const { data: folder } = await supabase
          .from('document_folders')
          .select('folder_type, is_encrypted')
          .eq('id', metadata.folder_id)
          .single()

        if (folder) {
          isEncrypted = folder.is_encrypted || requiresEncryption(folder.folder_type)
          encryptionPassword = getEncryptionPassword(folder.folder_type)
        }
      }

      if (!isEncrypted && ['contract', 'financial', 'hr'].includes(metadata.document_type)) {
        isEncrypted = true
        encryptionPassword = getEncryptionPassword(
          metadata.document_type === 'contract' ? 'contracts' :
          metadata.document_type === 'financial' ? 'finance' : 'hr'
        )
      }

      let fileToUpload = file
      if (isEncrypted && encryptionPassword) {
        fileToUpload = await encryptFile(file, encryptionPassword)
      }

      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `docs/${timestamp}-${randomStr}-${safeFileName}${isEncrypted ? '.enc' : ''}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: isEncrypted ? 'application/octet-stream' : (file.type || 'application/octet-stream')
        })

      if (uploadError) {
        if (uploadError.message?.includes('not found')) {
          return { error: 'Storage bucket not configured. Run setup SQL.' }
        }
        return { error: uploadError.message }
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl

      const { data: docData, error: dbError } = await supabase
        .from('managed_documents')
        .insert([{
          document_name: metadata.document_name || file.name,
          folder_id: metadata.folder_id || null,
          document_type: metadata.document_type || 'other',
          description: metadata.description || '',
          file_url: publicUrl,
          file_size: fileToUpload.size,
          file_type: file.type || 'application/octet-stream',
          status: 'published',
          version_number: 1,
          is_encrypted: isEncrypted,
          encryption_method: isEncrypted ? 'AES-256-GCM' : null
        }])
        .select()
        .single()

      if (dbError) return { error: dbError.message }
      return { data: docData }
    } catch (error) {
      return { error: error.message }
    }
  },

  // ============================================
  // GET DECRYPTED DOCUMENT (For view/download)
  // ============================================
  async getDecryptedDocument(docId, password = null) {
    try {
      // Get document
      const { data: doc, error: docError } = await supabase
        .from('managed_documents')
        .select('*')
        .eq('id', docId)
        .single()

      if (docError) {
        console.error('Doc fetch error:', docError)
        return { error: 'Document not found: ' + docError.message }
      }

      if (!doc) return { error: 'Document not found' }

      // Not encrypted - return as is
      if (!doc.is_encrypted) {
        return { data: doc, decrypted: false, decryptedUrl: doc.file_url }
      }

      // Check access - user must be super_admin
      const userRole = await this.getCurrentUserRole()
      if (userRole !== 'super_admin') {
        return { error: `Access denied: Only Super Admin can access encrypted documents. Your role: ${userRole}` }
      }

      // Determine password
      let decryptionPassword = password
      
      if (!decryptionPassword && doc.folder_id) {
        const { data: folder } = await supabase
          .from('document_folders')
          .select('folder_type')
          .eq('id', doc.folder_id)
          .single()
        decryptionPassword = getEncryptionPassword(folder?.folder_type)
      }

      // Extract storage path
      const storagePath = extractStoragePath(doc.file_url)
      if (!storagePath) {
        return { error: 'Invalid file URL' }
      }

      console.log('📥 Downloading from storage:', storagePath)

      // Download encrypted file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (downloadError) {
        console.error('Download error:', downloadError)
        
        // Try alternative path
        const altPath = doc.file_url.split('/documents/').pop()
        if (altPath && altPath !== storagePath) {
          console.log('🔄 Trying alternative path:', altPath)
          const { data: altData, error: altError } = await supabase.storage
            .from('documents')
            .download(altPath)
          
          if (!altError && altData) {
            const decrypted = await tryDecrypt(altData, decryptionPassword)
            if (decrypted) {
              return { 
                data: doc, 
                decrypted: true, 
                decryptedBlob: decrypted.blob,
                decryptedUrl: URL.createObjectURL(decrypted.blob),
                usedPassword: decrypted.password
              }
            }
          }
        }
        
        return { error: 'Failed to download encrypted file: ' + downloadError.message }
      }

      // Decrypt
      const decrypted = await tryDecrypt(fileData, decryptionPassword)
      
      if (!decrypted) {
        return { error: 'Failed to decrypt file. Password may be incorrect.' }
      }

      return { 
        data: doc, 
        decrypted: true, 
        decryptedBlob: decrypted.blob,
        decryptedUrl: URL.createObjectURL(decrypted.blob),
        usedPassword: decrypted.password
      }
    } catch (error) {
      console.error('Decryption exception:', error)
      return { error: error.message || 'Failed to decrypt document' }
    }
  },

  // ============================================
  // GET ACCESS RULES
  // ============================================
  async getAccessRules() {
    return ENCRYPTED_FOLDER_ACCESS
  },

  // ============================================
  // UPDATE / DELETE
  // ============================================
  async updateDocument(id, updates) {
    const { data, error } = await supabase
      .from('managed_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteDocument(id) {
    const { error } = await supabase
      .from('managed_documents')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // STATS
  // ============================================
  async getStats() {
    const userRole = await this.getCurrentUserRole()
    
    const { data: allDocs } = await supabase
      .from('managed_documents')
      .select('*')
      .neq('status', 'archived')

    const { data: allFolders } = await supabase
      .from('document_folders')
      .select('*')

    const visibleDocs = (allDocs || []).filter(doc => {
      if (!doc.is_encrypted) return true
      return userRole === 'super_admin'
    })

    const visibleFolders = (allFolders || []).filter(folder => {
      if (!folder.is_encrypted) return true
      return userRole === 'super_admin'
    })

    return {
      totalDocs: visibleDocs.length,
      contracts: visibleDocs.filter(d => d.document_type === 'contract').length,
      policies: visibleDocs.filter(d => d.document_type === 'policy').length,
      sops: visibleDocs.filter(d => d.document_type === 'sop').length,
      encryptedDocs: visibleDocs.filter(d => d.is_encrypted).length,
      totalFolders: visibleFolders.length,
      encryptedFolders: visibleFolders.filter(f => f.is_encrypted).length,
      userRole
    }
  },

  async logDocumentAccess(docId, userId, accessType = 'view') {
    try {
      await supabase.from('document_access_logs').insert([{
        document_id: docId,
        user_id: userId,
        access_granted: true,
        access_type: accessType,
        accessed_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Access log error:', error)
    }
  }
}

// ✅ Helper: Try decryption with password or all passwords
async function tryDecrypt(encryptedBlob, preferredPassword) {
  // Try preferred password first
  if (preferredPassword) {
    try {
      const blob = await decryptFile(encryptedBlob, preferredPassword)
      if (blob) return { blob, password: preferredPassword }
    } catch (e) {
      console.log('Preferred password failed, trying all...')
    }
  }
  
  // Try all known passwords
  const allPasswords = [
    'NDANDULENI_CONTRACTS_2025_SECURE',
    'NDANDULENI_FINANCE_2025_SECURE',
    'NDANDULENI_HR_2025_SECURE',
  ]
  
  for (const pwd of allPasswords) {
    if (pwd === preferredPassword) continue
    try {
      const blob = await decryptFile(encryptedBlob, pwd)
      if (blob) return { blob, password: pwd }
    } catch (e) {
      continue
    }
  }
  
  return null
}
