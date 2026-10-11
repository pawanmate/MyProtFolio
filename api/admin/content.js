// api/admin/content.js
// Vercel Serverless Function: Secure Admin endpoint for Draft, Preview, and Publish operations

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || serviceKey;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase environment variables (SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY) are not configured.'
    });
  }

  // Verify Admin Authentication
  const auth = await verifyAuth(req, supabaseUrl, anonKey);
  if (!auth.authenticated) {
    return res.status(401).json({
      success: false,
      error: auth.error
    });
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 1. GET: Return Draft Content (for Admin Dashboard and Preview Mode)
  if (req.method === 'GET') {
    try {
      const draftRes = await fetch(`${baseUrl}/rest/v1/portfolio_content?id=eq.draft&select=*`, {
        headers
      });
      const publishedRes = await fetch(`${baseUrl}/rest/v1/portfolio_content?id=eq.published&select=*`, {
        headers
      });

      const drafts = await draftRes.json();
      const published = await publishedRes.json();

      const draftRecord = drafts?.[0] || null;
      const publishedRecord = published?.[0] || null;

      return res.status(200).json({
        success: true,
        draft: draftRecord?.content || null,
        draft_updated_at: draftRecord?.updated_at || null,
        published_at: publishedRecord?.published_at || null,
        version: draftRecord?.version || 1
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch content from database: ' + err.message
      });
    }
  }

  // 2. POST: Handle Save Draft, Publish, Discard
  if (req.method === 'POST') {
    const { action, content } = req.body || {};

    if (!action) {
      return res.status(400).json({ success: false, error: 'Missing action parameter ("save_draft", "publish", or "discard").' });
    }

    try {
      if (action === 'save_draft') {
        if (!content || typeof content !== 'object') {
          return res.status(400).json({ success: false, error: 'Invalid content payload provided.' });
        }

        const upsertRes = await fetch(`${baseUrl}/rest/v1/portfolio_content`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            id: 'draft',
            content: content,
            updated_at: new Date().toISOString(),
            updated_by: auth.user.id
          })
        });

        if (!upsertRes.ok) {
          const errText = await upsertRes.text();
          throw new Error('Supabase error: ' + errText);
        }

        const data = await upsertRes.json();
        return res.status(200).json({
          success: true,
          message: 'Draft saved successfully.',
          updated_at: data[0]?.updated_at
        });
      }

      if (action === 'publish') {
        // Fetch current draft first
        const draftRes = await fetch(`${baseUrl}/rest/v1/portfolio_content?id=eq.draft&select=*`, { headers });
        const drafts = await draftRes.json();
        const draftContent = content || drafts?.[0]?.content;

        if (!draftContent) {
          return res.status(400).json({ success: false, error: 'No draft content found to publish.' });
        }

        const now = new Date().toISOString();

        // Save to published record
        const pubRes = await fetch(`${baseUrl}/rest/v1/portfolio_content`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            id: 'published',
            content: draftContent,
            published_at: now,
            updated_at: now,
            updated_by: auth.user.id
          })
        });

        if (!pubRes.ok) {
          const errText = await pubRes.text();
          throw new Error('Supabase error publishing: ' + errText);
        }

        return res.status(200).json({
          success: true,
          message: 'Live website published successfully!',
          published_at: now
        });
      }

      if (action === 'discard') {
        // Copy published into draft
        const pubRes = await fetch(`${baseUrl}/rest/v1/portfolio_content?id=eq.published&select=*`, { headers });
        const published = await pubRes.json();
        const pubContent = published?.[0]?.content;

        if (!pubContent) {
          return res.status(400).json({ success: false, error: 'No published content found to restore.' });
        }

        await fetch(`${baseUrl}/rest/v1/portfolio_content`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            id: 'draft',
            content: pubContent,
            updated_at: new Date().toISOString(),
            updated_by: auth.user.id
          })
        });

        return res.status(200).json({
          success: true,
          message: 'Unsaved draft changes discarded. Restored to published version.',
          content: pubContent
        });
      }

      return res.status(400).json({ success: false, error: 'Unknown action: ' + action });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Operation failed: ' + err.message
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
