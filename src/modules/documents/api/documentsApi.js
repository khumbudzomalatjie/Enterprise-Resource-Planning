import { supabase } from '../../../lib/supabaseClient'

// ============================================
// ENCRYPTION HELPERS
// ============================================
async function encryptFile(file, password) {
  const arrayBuffer = await file.arrayBuffer()
  const fileBytes = new Uint8Array(arrayBuffer)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt']
  )
  const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBytes)
  return new Blob([salt, iv, new Uint8Array(encryptedContent)], { type: 'application/octet-stream' })
}

async function decryptBlob(encryptedBlob, password) {
  const arrayBuffer = await encryptedBlob.arrayBuffer()
  const fullBytes = new Uint8Array(arrayBuffer)
  const salt = fullBytes.slice(0, 16)
  const iv = fullBytes.slice(16, 28)
  const encryptedData = fullBytes.slice(28)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['decrypt']
  )
  const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedData)
  return new Blob([decryptedContent])
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

// Extract storage path from public URL
function getStoragePathFromUrl(url) {
  if (!url) return null
  // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/docs/filename
  const match = url.match(/\/documents\/(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export const documentsApi = {
  // Folders
  async getFolders() {
    const { data, error } = await supabase.from('document_folders').select('*').order('folder_name')
    return { data, error }
  },

  async createFolder(folderData) {
    const folderWithEncryption = {
      ...folderData,
      is_encrypted: requiresEncryption(folderData.folder_type),
      encryption_method: requiresEncryption(folderData.folder_type) ? 'AES-256-GCM' : null
    }
    const { data, error } = await supabase.from('document_folders').insert([folderWithEncryption]).select().single()
    return { data, error }
  },

  // Documents
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
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('bucket')) {
          return { error: 'Storage bucket not configured. Please run the setup SQL in Supabase.' }
        }
        return { error: uploadError.message || 'Upload failed' }
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) return { error: 'Failed to get public URL' }

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

      if (dbError) return { error: dbError.message || 'Failed to save document record' }
      return { data: docData }
    } catch (error) {
      return { error: error.message || 'An unexpected error occurred' }
    }
  },

  // ============================================
  // ✅ NEW: Get signed URL (secure, time-limited)
  // ============================================
  async getSignedUrl(fileUrl, expiresIn = 3600) {
    try {
      const path = getStoragePathFromUrl(fileUrl)
      if (!path) return { error: 'Invalid file URL' }

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, expiresIn)

      if (error) return { error: error.message }
      return { data: data.signedUrl }
    } catch (err) {
      return { error: err.message }
    }
  },

  // ============================================
  // ✅ NEW: Get document for viewing (handles encryption)
  // ============================================
  async getDocumentForViewing(doc, userRole = null) {
    try {
      console.log('📄 Preparing document for viewing:', doc.document_name)

      // Check RBAC for encrypted documents
      if (doc.is_encrypted) {
        const folderType = doc.document_folders?.folder_type || doc.document_type
        const accessRules = {
          contracts: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
          contract: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
          finance: ['super_admin', 'finance_officer'],
          financial: ['super_admin', 'finance_officer'],
          hr: ['super_admin', 'hr_manager']
        }
        const allowedRoles = accessRules[folderType] || ['super_admin']
        
        if (userRole && !allowedRoles.includes(userRole)) {
          return { error: 'You do not have permission to view this encrypted document' }
        }

        // Download encrypted blob
        const path = getStoragePathFromUrl(doc.file_url)
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('documents')
          .download(path)

        if (downloadError) return { error: 'Failed to download encrypted file' }

        // Decrypt
        const folderTypeForPassword = doc.document_folders?.folder_type || doc.document_type
        const password = getEncryptionPassword(folderTypeForPassword)
        if (!password) return { error: 'No decryption key available' }

        const decryptedBlob = await decryptBlob(fileBlob, password)
        const blobUrl = URL.createObjectURL(decryptedBlob)

        console.log('✅ Decrypted successfully')
        return {
          data: {
            ...doc,
            viewUrl: blobUrl,
            isBlob: true,
            blob: decryptedBlob,
            mimeType: doc.file_type
          }
        }
      }

      // Unencrypted: use signed URL
      const { data: signedUrl, error } = await this.getSignedUrl(doc.file_url)
      if (error) {
        // Fallback to public URL
        return {
          data: { ...doc, viewUrl: doc.file_url, isBlob: false, mimeType: doc.file_type }
        }
      }

      return {
        data: { ...doc, viewUrl: signedUrl, isBlob: false, mimeType: doc.file_type }
      }
    } catch (err) {
      console.error('View preparation error:', err)
      return { error: err.message }
    }
  },

  // ============================================
  // ✅ NEW: Download document (encrypted or not)
  // ============================================
  async downloadDocument(doc, userRole = null) {
    try {
      if (doc.is_encrypted) {
        // RBAC check
        const folderType = doc.document_folders?.folder_type || doc.document_type
        const accessRules = {
          contracts: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
          contract: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
          finance: ['super_admin', 'finance_officer'],
          financial: ['super_admin', 'finance_officer'],
          hr: ['super_admin', 'hr_manager']
        }
        const allowedRoles = accessRules[folderType] || ['super_admin']
        
        if (userRole && !allowedRoles.includes(userRole)) {
          return { error: 'Permission denied' }
        }

        const path = getStoragePathFromUrl(doc.file_url)
        const { data: fileBlob, error } = await supabase.storage.from('documents').download(path)
        if (error) return { error: 'Download failed' }

        const folderTypeForPassword = doc.document_folders?.folder_type || doc.document_type
        const password = getEncryptionPassword(folderTypeForPassword)
        const decryptedBlob = await decryptBlob(fileBlob, password)

        // Trigger download
        const url = URL.createObjectURL(decryptedBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.document_name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        return { success: true }
      }

      // Unencrypted: signed URL download
      const { data: signedUrl, error } = await this.getSignedUrl(doc.file_url)
      const url = signedUrl || doc.file_url

      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = doc.document_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      return { success: true }
    } catch (err) {
      return { error: err.message }
    }
  },

  // ============================================
  // ✅ NEW: Download as PDF
  // ============================================
  async downloadAsPdf(doc, userRole = null) {
    try {
      const { jsPDF } = await import('jspdf')

      // Get file first (decrypted if needed)
      let blob
      if (doc.is_encrypted) {
        const folderType = doc.document_folders?.folder_type || doc.document_type
        const accessRules = {
          contracts: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
          contract: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
          finance: ['super_admin', 'finance_officer'],
          financial: ['super_admin', 'finance_officer'],
          hr: ['super_admin', 'hr_manager']
        }
        const allowedRoles = accessRules[folderType] || ['super_admin']
        if (userRole && !allowedRoles.includes(userRole)) {
          return { error: 'Permission denied' }
        }
        const path = getStoragePathFromUrl(doc.file_url)
        const { data: fileBlob } = await supabase.storage.from('documents').download(path)
        const folderTypeForPassword = doc.document_folders?.folder_type || doc.document_type
        const password = getEncryptionPassword(folderTypeForPassword)
        blob = await decryptBlob(fileBlob, password)
      } else {
        const { data: signedUrl } = await this.getSignedUrl(doc.file_url)
        const response = await fetch(signedUrl || doc.file_url)
        blob = await response.blob()
      }

      const baseName = doc.document_name.replace(/\.[^.]+$/, '')
      const fileType = doc.file_type || blob.type

      // Already a PDF → download as is
      if (fileType === 'application/pdf' || doc.document_name.toLowerCase().endsWith('.pdf')) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${baseName}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return { success: true }
      }

      // Image → convert to PDF
      if (fileType.startsWith('image/')) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })

        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = dataUrl
        })

        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: 'a4'
        })

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height)
        const imgWidth = img.width * ratio
        const imgHeight = img.height * ratio
        const x = (pageWidth - imgWidth) / 2
        const y = (pageHeight - imgHeight) / 2

        pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight)
        pdf.save(`${baseName}.pdf`)
        return { success: true }
      }

      // Text files
      if (fileType.startsWith('text/') || fileType === 'application/json') {
        const text = await blob.text()
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
        const margin = 40
        const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
        const pageHeight = pdf.internal.pageSize.getHeight()
        
        pdf.setFontSize(12)
        const lines = pdf.splitTextToSize(text, pageWidth)
        let y = margin + 20
        for (const line of lines) {
          if (y > pageHeight - margin) {
            pdf.addPage()
            y = margin + 20
          }
          pdf.text(line, margin, y)
          y += 16
        }
        pdf.save(`${baseName}.pdf`)
        return { success: true }
      }

      // Office docs - open print dialog (browser can save as PDF)
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        // Give browser time to load, then trigger print (user can "Save as PDF")
        setTimeout(() => {
          try { win.print() } catch (e) {}
        }, 1500)
      }
      return { 
        success: true, 
        note: 'Document opened in new tab. Use "Print" → "Save as PDF" to download as PDF.' 
      }
    } catch (err) {
      console.error('PDF conversion error:', err)
      return { error: err.message || 'Failed to generate PDF' }
    }
  },

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
      totalDocs: totalDocs || 0, contracts: contracts || 0, policies: policies || 0, 
      sops: sops || 0, encryptedDocs: encryptedDocs || 0
    }
  }
}
