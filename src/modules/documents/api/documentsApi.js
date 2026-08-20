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

// ============================================
// ACCESS CONTROL RULES
// ✅ ONLY SUPER ADMIN CAN ACCESS ENCRYPTED FOLDERS
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
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.id) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    return profile?.role || null
  },

  // ============================================
  // CHECK IF USER CAN ACCESS ENCRYPTED FOLDER
  // ============================================
  canAccessEncryptedFolder(userRole, folderType) {
    if (!userRole) return false
    // Super Admin can access everything
    if (userRole === 'super_admin') return true
    // All other roles cannot access encrypted folders
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
      if (!folder.is_encrypted) return true // Everyone sees non-encrypted
      // Only Super Admin sees encrypted folders
      return userRole === 'super_admin'
    })

    return { data: filteredFolders, error: null }
  },

  async createFolder(folderData) {
    // Only Super Admin can create encrypted folders
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
      .select('*, document_folders(folder_name, folder_type, is_encrypted)')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
    
    if (folderId) query = query.eq('folder_id', folderId)
    if (filters.type) query = query.eq('document_type', filters.type)
    if (filters.search) {
      query = query.or(`document_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) return { data: [], error }

    // Filter out encrypted documents from non-Super Admin users
    const filteredDocs = (data || []).filter(doc => {
      if (!doc.is_encrypted) return true
      return userRole === 'super_admin'
    })

    return { data: filteredDocs, error: null }
  },

  // ============================================
  // CHECK ACCESS BEFORE UPLOAD
  // ============================================
  async checkUploadAccess(folderId) {
    if (!folderId) return { hasAccess: true } // Root upload is allowed

    const userRole = await this.getCurrentUserRole()
    const { data: folder } = await supabase
      .from('document_folders')
      .select('folder_type, is_encrypted')
      .eq('id', folderId)
      .single()

    if (!folder || !folder.is_encrypted) return { hasAccess: true }
    
    const hasAccess = userRole === 'super_admin'
    return { hasAccess, role: userRole, folderType: folder.folder_type }
  },

  async uploadDocument(file, metadata) {
    try {
      if (!file) return { error: 'No file provided' }

      // Check access before uploading to encrypted folder
      if (metadata.folder_id) {
        const accessCheck = await this.checkUploadAccess(metadata.folder_id)
        if (!accessCheck.hasAccess) {
          return { error: 'Access denied: Only Super Admin can upload to encrypted folders.' }
        }
      }

      // Check if encryption is needed
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

      // If encrypted, verify Super Admin
      if (isEncrypted) {
        const userRole = await this.getCurrentUserRole()
        if (userRole !== 'super_admin') {
          return { error: 'Access denied: Only Super Admin can upload encrypted documents.' }
        }
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
  // CHECK ACCESS BEFORE VIEWING/DOWNLOADING
  // ============================================
  async checkDocumentAccess(docId) {
    const userRole = await this.getCurrentUserRole()
    const { data: doc } = await supabase
      .from('managed_documents')
      .select('is_encrypted, document_folders(folder_type)')
      .eq('id', docId)
      .single()

    if (!doc || !doc.is_encrypted) return { hasAccess: true }

    const hasAccess = userRole === 'super_admin'
    return { hasAccess, role: userRole, folderType: doc.document_folders?.folder_type }
  },

  async getDecryptedDocument(docId, password = null) {
    try {
      const accessCheck = await this.checkDocumentAccess(docId)
      if (!accessCheck.hasAccess) {
        return { error: `Access denied: Only Super Admin can view encrypted documents. Your role: ${accessCheck.role}` }
      }

      const { data: doc } = await supabase
        .from('managed_documents')
        .select('*, document_folders(folder_type, is_encrypted)')
        .eq('id', docId)
        .single()

      if (!doc) return { error: 'Document not found' }
      if (!doc.is_encrypted) return { data: doc, decrypted: false }

      let decryptionPassword = password || getEncryptionPassword(doc.document_folders?.folder_type)
      if (!decryptionPassword) return { error: 'No decryption password available.' }

      const path = doc.file_url.split('/').pop()
      const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(path)
      if (downloadError) return { error: 'Failed to download encrypted file' }

      const decryptedBlob = await decryptFile(fileData, decryptionPassword)
      return { data: doc, decrypted: true, decryptedBlob, decryptedUrl: URL.createObjectURL(decryptedBlob) }
    } catch (error) {
      return { error: error.message }
    }
  },

  // ============================================
  // GET ACCESS RULES FOR DISPLAY
  // ============================================
  async getAccessRules() {
    return {
      contracts: ['super_admin'],
      finance: ['super_admin'],
      hr: ['super_admin']
    }
  },

  // ============================================
  // UPDATE / DELETE
  // ============================================
  async updateDocument(id, updates) {
    const accessCheck = await this.checkDocumentAccess(id)
    if (!accessCheck.hasAccess) {
      return { error: 'Access denied: Only Super Admin can edit encrypted documents.' }
    }

    const { data, error } = await supabase
      .from('managed_documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteDocument(id) {
    const accessCheck = await this.checkDocumentAccess(id)
    if (!accessCheck.hasAccess) {
      return { error: 'Access denied: Only Super Admin can delete encrypted documents.' }
    }

    const { error } = await supabase
      .from('managed_documents')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // STATS - Filtered by role
  // ============================================
  async getStats() {
    const userRole = await this.getCurrentUserRole()
    
    const { data: allDocs } = await supabase
      .from('managed_documents')
      .select('*, document_folders(folder_type, is_encrypted)')
      .neq('status', 'archived')

    const visibleDocs = (allDocs || []).filter(doc => {
      if (!doc.is_encrypted) return true
      return userRole === 'super_admin'
    })

    const { data: allFolders } = await supabase
      .from('document_folders')
      .select('*')

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

  // ============================================
  // LOG ACCESS
  // ============================================
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
