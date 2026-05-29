import { supabase } from '../../../lib/supabaseClient'

export const documentsApi = {
  // Folders
  async getFolders() {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .order('folder_name')
    return { data, error }
  },

  async createFolder(folderData) {
    const { data, error } = await supabase
      .from('document_folders')
      .insert([folderData])
      .select()
      .single()
    return { data, error }
  },

  // Documents
  async getDocuments(folderId = null, filters = {}) {
    let query = supabase
      .from('managed_documents')
      .select('*, document_folders(folder_name)')
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
      // Validate file
      if (!file) {
        return { error: 'No file provided' }
      }

      // Create unique file path
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `docs/${timestamp}-${randomStr}-${safeFileName}`

      console.log('Uploading file:', filePath, 'Size:', file.size, 'Type:', file.type)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        
        // Check if bucket doesn't exist
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('bucket')) {
          return { error: 'Storage bucket not configured. Please run the setup SQL in Supabase.' }
        }
        
        return { error: uploadError.message || 'Upload failed' }
      }

      console.log('Upload successful, getting public URL...')

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const publicUrl = urlData?.publicUrl

      if (!publicUrl) {
        return { error: 'Failed to get public URL' }
      }

      console.log('Public URL:', publicUrl)

      // Save document record to database
      const { data: docData, error: dbError } = await supabase
        .from('managed_documents')
        .insert([{
          document_name: metadata.document_name || file.name,
          folder_id: metadata.folder_id || null,
          document_type: metadata.document_type || 'other',
          description: metadata.description || '',
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          status: 'published',
          version_number: 1
        }])
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        return { error: dbError.message || 'Failed to save document record' }
      }

      console.log('Document saved successfully:', docData?.id)
      return { data: docData }

    } catch (error) {
      console.error('Upload exception:', error)
      return { error: error.message || 'An unexpected error occurred' }
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
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    return { error }
  },

  async getStats() {
    const [
      { count: totalDocs },
      { count: contracts },
      { count: policies },
      { count: sops }
    ] = await Promise.all([
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'contract').neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'policy').neq('status', 'archived'),
      supabase.from('managed_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'sop').neq('status', 'archived')
    ])
    
    return { 
      totalDocs: totalDocs || 0, 
      contracts: contracts || 0, 
      policies: policies || 0, 
      sops: sops || 0 
    }
  }
}
