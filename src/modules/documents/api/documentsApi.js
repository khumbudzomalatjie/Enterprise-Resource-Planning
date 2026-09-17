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

function getStoragePathFromUrl(url) {
  if (!url) return null
  const match = url.match(/\/documents\/(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

// ============================================
// API OBJECT
// ============================================
export const documentsApi = {

  // ============================================
  // FOLDERS
  // ============================================
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
      console.error('Upload exception:', error)
      return { error: error.message || 'An unexpected error occurred' }
    }
  },

  // ============================================
  // SIGNED URL (secure, time-limited)
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
  // ✅ GET DOCUMENT BLOB (handles encryption + returns Blob for rendering)
  // ============================================
  async getDocumentBlob(doc, userRole = null) {
    try {
      console.log('📥 getDocumentBlob called for:', doc.document_name, '| Encrypted:', doc.is_encrypted)

      // Encrypted — check permission, download, decrypt
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

        const path = getStoragePathFromUrl(doc.file_url)
        if (!path) return { error: 'Invalid file URL' }

        const { data: fileBlob, error } = await supabase.storage.from('documents').download(path)
        if (error) {
          console.error('Download error:', error)
          return { error: 'Failed to download encrypted file' }
        }

        const password = getEncryptionPassword(folderType)
        if (!password) return { error: 'No decryption key available' }

        const decryptedBlob = await decryptBlob(fileBlob, password)
        const typedBlob = new Blob([decryptedBlob], { type: doc.file_type || 'application/octet-stream' })
        console.log('✅ Decrypted successfully, size:', typedBlob.size)
        return { data: { blob: typedBlob, mimeType: doc.file_type } }
      }

      // Unencrypted — signed URL then fetch as Blob
      const { data: signedUrl } = await this.getSignedUrl(doc.file_url)
      const url = signedUrl || doc.file_url
      console.log('🔗 Fetching from:', url)

      const response = await fetch(url)
      if (!response.ok) return { error: `Failed to fetch document (${response.status})` }
      const blob = await response.blob()
      console.log('✅ Fetched blob, size:', blob.size, 'type:', blob.type)
      return { data: { blob, mimeType: doc.file_type || blob.type } }
    } catch (err) {
      console.error('getDocumentBlob error:', err)
      return { error: err.message || 'Failed to load document' }
    }
  },

  // ============================================
  // ✅ GET DOCUMENT FOR VIEWING (kept for compatibility)
  // ============================================
  async getDocumentForViewing(doc, userRole = null) {
    try {
      console.log('📄 Preparing document for viewing:', doc.document_name)

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

        const path = getStoragePathFromUrl(doc.file_url)
        const { data: fileBlob, error: downloadError } = await supabase.storage.from('documents').download(path)
        if (downloadError) return { error: 'Failed to download encrypted file' }

        const password = getEncryptionPassword(folderType)
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

      const { data: signedUrl, error } = await this.getSignedUrl(doc.file_url)
      if (error) {
        return { data: { ...doc, viewUrl: doc.file_url, isBlob: false, mimeType: doc.file_type } }
      }

      return { data: { ...doc, viewUrl: signedUrl, isBlob: false, mimeType: doc.file_type } }
    } catch (err) {
      console.error('View preparation error:', err)
      return { error: err.message }
    }
  },

  // ============================================
  // ✅ DOWNLOAD ORIGINAL (encrypted or not)
  // ============================================
  async downloadDocument(doc, userRole = null) {
    try {
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
        const { data: fileBlob, error } = await supabase.storage.from('documents').download(path)
        if (error) return { error: 'Download failed' }

        const password = getEncryptionPassword(folderType)
        const decryptedBlob = await decryptBlob(fileBlob, password)

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

      // Unencrypted
      const { data: signedUrl } = await this.getSignedUrl(doc.file_url)
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
  // ✅ DOWNLOAD AS PDF
  // ============================================
  async downloadAsPdf(doc, userRole = null) {
    try {
      const { jsPDF } = await import('jspdf')

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
        const password = getEncryptionPassword(folderType)
        blob = await decryptBlob(fileBlob, password)
      } else {
        const { data: signedUrl } = await this.getSignedUrl(doc.file_url)
        const response = await fetch(signedUrl || doc.file_url)
        blob = await response.blob()
      }

      const baseName = doc.document_name.replace(/\.[^.]+$/, '')
      const fileType = doc.file_type || blob.type
      const lowerName = doc.document_name.toLowerCase()

      // PDF — download directly
      if (fileType === 'application/pdf' || lowerName.endsWith('.pdf')) {
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

      // Image → PDF
      if (fileType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lowerName)) {
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

      // Text → PDF
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

      // Office docs — open in new tab, user can print → Save as PDF
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        setTimeout(() => {
          try { win.print() } catch (e) {}
        }, 1500)
      }
      return {
        success: true,
        note: 'Document opened. Use "Print" → "Save as PDF" in the new tab to download as PDF.'
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
      totalDocs: totalDocs || 0,
      contracts: contracts || 0,
      policies: policies || 0,
      sops: sops || 0,
      encryptedDocs: encryptedDocs || 0
    }
  }
}

export default documentsApi
