// api/admin/upload.js
// Vercel Serverless Function: Secure upload handler for images, drawings, and PDF resumes

async function verifyAuth(req, supabaseUrl, supabaseAnonKey) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.split(' ')[1];
  try {
    const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userRes.ok) {
      return { authenticated: false, error: 'Invalid or expired auth session' };
    }

    const userData = await userRes.json();
    return { authenticated: true, user: userData, token };
  } catch (err) {
    return { authenticated: false, error: 'Failed to verify auth session: ' + err.message };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || serviceKey;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-media';

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase credentials are not configured in environment variables.'
    });
  }

  // Verify Admin Authentication
  const auth = await verifyAuth(req, supabaseUrl, anonKey);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  const { filename, fileData, mimeType, folder = 'uploads' } = req.body || {};

  if (!filename || !fileData) {
    return res.status(400).json({ success: false, error: 'filename and fileData (base64 string) are required.' });
  }

  // Validate allowed extensions and mime types
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf'];
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: `File type ${ext} is not allowed. Allowed types: ${allowedExts.join(', ')}`
    });
  }

  try {
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}-${cleanName}`;

    // Decode base64 buffer
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Max 15MB limit check
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File size exceeds maximum limit of 15MB.' });
    }

    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const uploadUrl = `${baseUrl}/storage/v1/object/${bucketName}/${filePath}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': mimeType || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: buffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error('Supabase Storage error: ' + errText);
    }

    // Public URL for accessing the uploaded object
    const publicUrl = `${baseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;

    // Record into public.media_library table
    try {
      await fetch(`${baseUrl}/rest/v1/media_library`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: cleanName,
          url: publicUrl,
          path: filePath,
          size: buffer.length,
          mime_type: mimeType || 'application/octet-stream',
          folder: folder,
          created_by: auth.user.id
        })
      });
    } catch (dbErr) {
      console.warn('Could not record into media_library table:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully!',
      url: publicUrl,
      path: filePath,
      size: buffer.length
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Upload failed: ' + err.message
    });
  }
};
