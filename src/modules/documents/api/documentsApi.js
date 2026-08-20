import { supabase } from '../../../lib/supabaseClient'

// ============================================
// ENCRYPTION HELPERS
// ============================================

// Encrypt file content using AES-GCM via Web Crypto API
async function encryptFile(file, password) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      fileBytes
    )

    const encryptedBlob = new Blob(
      [salt, iv, new Uint8Array(encryptedContent)],
      { type: 'application/octet-stream' }
    )

    return encryptedBlob
  } catch (error) {
    console.error('Encryption failed:', error)
    throw error
  }
}

// Decrypt file content
async function decryptFile(encryptedBlob, password) {
  try {
    const arrayBuffer = await encryptedBlob.arrayBuffer()
    const fullBytes = new Uint8Array(arrayBuffer)

    const salt = fullBytes.slice(0, 16)
    const iv = fullBytes.slice(16, 28)
    const encryptedData = fullBytes.slice(28)

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    )

    return new Blob([decryptedContent])
  } catch (error) {
    console.error('Decryption failed:', error)
    throw error
  }
}

// Get encryption password for folder type
function getEncryptionPassword(folderType) {
  switch (folderType) {
    case 'contracts':
      return 'NDANDULENI_CONTRACTS_2025_SECURE'
    case 'finance':
      return 'NDANDULENI_FINANCE_2025_SECURE'
    case 'hr':
      return 'NDANDULENI_HR_2025_SECURE'
    default:
      return null
  }
}

// Check if folder requires encryption
function requiresEncryption(folderType) {
  return ['contracts', 'finance', 'hr'].includes(folderType)
}

export const documentsApi = {
  // ============================================
  // FOLDERS
  // ============================================
  async getFolders() {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .order('folder_name')
    return { data, error }
  },

  async createFolder(folderData) {
    const folderWithEncryption = {
      ...folderData,
      is_encrypted: requiresEncryption(folderData.folder_type),
      encryption_method: requiresEncryption(folderData.folder_type) ? 'AES-256-GCM' : null
    }
    
    const { data, error } = await supabase
      .from('document_folders')
      .insert([folderWithEncryption])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // DOCUMENTS
  // ============================================
  async getDocuments(folderId = null, filters = {}) {
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
    return { data, error }
  },

  async uploadDocument(file, metadata) {
    try {
      if (!file) return { error: 'No file provided' }

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

      // Encrypt if needed
      let fileToUpload = file
      if (isEncrypted && encryptionPassword) {
        fileToUpload = await encryptFile(file, encryptionPassword)
      }

      // Upload to storage
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `docs/${timestamp}-${randomStr}-${safeFileName}${isEncrypted ? '.enc' : ''}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: isEncrypted ? 'application/octet-stream' : (file.type || 'application/octet-stream')
        })

      if (uploadError) {
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('bucket')) {
          return { error: 'Storage bucket not configured. Please run the setup SQL in Supabase.' }
        }
        return { error: uploadError.message || 'Upload failed' }
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl

      if (!publicUrl) return { error: 'Failed to get public URL' }

      // Save to database
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

      if (dbError) {
        return { error: dbError.message || 'Failed to save document record' }
      }

      return { data: docData }
    } catch (error) {
      return { error: error.message || 'An unexpected error occurred' }
    }
  },

  // ============================================
  // DECRYPTED DOCUMENT ACCESS
  // ============================================
  async getDecryptedDocument(docId, password = null) {
    try {
      const { data: doc } = await supabase
        .from('managed_documents')
        .select('*, document_folders(folder_type, is_encrypted)')
        .eq('id', docId)
        .single()

      if (!doc) return { error: 'Document not found' }
      if (!doc.is_encrypted) return { data: doc, decrypted: false }

      let decryptionPassword = password
      if (!decryptionPassword) {
        decryptionPassword = getEncryptionPassword(doc.document_folders?.folder_type)
      }

      if (!decryptionPassword) {
        return { error: 'No decryption password available. Contact administrator.' }
      }

      const path = doc.file_url.split('/').pop()
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(path)

      if (downloadError) return { error: 'Failed to download encrypted file' }

      const decryptedBlob = await decryptFile(fileData, decryptionPassword)

      return {
        data: doc,
        decrypted: true,
        decryptedBlob,
        decryptedUrl: URL.createObjectURL(decryptedBlob)
      }
    } catch (error) {
      return { error: error.message || 'Failed to decrypt' }
    }
  },

  // ============================================
  // ACCESS CONTROL
  // ============================================
  async checkFolderAccess(folderId, userId) {
    try {
      const { data: folder } = await supabase
        .from('document_folders')
        .select('folder_type, is_encrypted')
        .eq('id', folderId)
        .single()

      if (!folder || !folder.is_encrypted) return { hasAccess: true }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const role = profile?.role
      const accessRules = {
        contracts: ['super_admin', 'operations_manager', 'finance_officer'],
        finance: ['super_admin', 'finance_officer'],
        hr: ['super_admin', 'hr_manager']
      }

      const allowedRoles = accessRules[folder.folder_type] || []
      const hasAccess = allowedRoles.includes(role)

      await supabase.from('document_access_logs').insert([{
        folder_id: folderId,
        user_id: userId,
        access_granted: hasAccess,
        access_type: 'check',
        accessed_at: new Date().toISOString()
      }])

      return { hasAccess, role, requiredRoles: allowedRoles }
    } catch (error) {
      return { hasAccess: false }
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
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // STATS
  // ============================================
  async getStats() {
    const [
      { count: totalDocs },
      { count: contracts },
      { count: policies },
      { count: sops },
      { count: encryptedDocs }
    ] = await Promise.all([
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'contract').neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'policy').neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'sop').neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('is_encrypted', true).neq('status', 'archived')
    ])
    
    return { 
      totalDocs: totalDocs || 0, 
      contracts: contracts || 0, 
      policies: policies || 0, 
      sops: sops || 0,
      encryptedDocs: encryptedDocs || 0
    }
  }
}
