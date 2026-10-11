// admin/supabase-client.js
// Supabase Client Helper for Authentication, Database, and Media Storage

(function (window) {
  const STORAGE_KEY_CONFIG = 'pm_portfolio_supabase_cfg';
  const STORAGE_KEY_AUTH = 'pm_portfolio_supabase_token';

  // Default configuration or local overrides
  function getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return {
      url: window.__ENV_SUPABASE_URL || '',
      anonKey: window.__ENV_SUPABASE_ANON_KEY || ''
    };
  }

  function saveConfig(url, anonKey) {
    const cfg = { url: url.trim().replace(/\/$/, ''), anonKey: anonKey.trim() };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
    return cfg;
  }

  // Initialize Supabase SDK instance if available
  let supabaseInstance = null;
  function getClient() {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) return null;
    if (window.supabase && (!supabaseInstance || supabaseInstance._url !== cfg.url)) {
      try {
        supabaseInstance = window.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: {
            persistSession: true,
            storageKey: 'pm_supabase_auth_session'
          }
        });
        supabaseInstance._url = cfg.url;
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
      }
    }
    return supabaseInstance;
  }

  const SupabaseService = {
    getConfig,
    saveConfig,
    getClient,

    // Authentication
    async login(email, password) {
      const client = getClient();
      if (!client) {
        throw new Error('Supabase URL and Anon Key are not configured yet. Please configure credentials.');
      }
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        localStorage.setItem(STORAGE_KEY_AUTH, data.session.access_token);
      }
      return data;
    },

    async logout() {
      const client = getClient();
      if (client) {
        try { await client.auth.signOut(); } catch (e) {}
      }
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem('pm_supabase_auth_session');
      window.location.href = '/admin/login';
    },

    async getUser() {
      const client = getClient();
      if (!client) return null;
      try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) return null;
        return user;
      } catch (e) {
        return null;
      }
    },

    async getSessionToken() {
      const client = getClient();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.access_token) return session.access_token;
      }
      return localStorage.getItem(STORAGE_KEY_AUTH);
    },

    // Content Operations
    async getDraftContent() {
      const token = await this.getSessionToken();
      // Try serverless API first
      try {
        const res = await fetch('/api/admin/content', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.draft) return json;
        }
      } catch (apiErr) {}

      // Direct Supabase query as fallback
      const client = getClient();
      if (client) {
        const { data, error } = await client
          .from('portfolio_content')
          .select('*')
          .eq('id', 'draft')
          .single();
        if (!error && data?.content) {
          return { success: true, draft: data.content, draft_updated_at: data.updated_at, version: data.version };
        }
      }

      // If nothing in DB yet, fetch public content endpoint as baseline
      const pubRes = await fetch('/api/content');
      const pubData = await pubRes.json();
      return { success: true, draft: pubData.content, draft_updated_at: null, version: 1 };
    },

    async saveDraft(content) {
      const token = await this.getSessionToken();
      // Try API route
      try {
        const res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'save_draft', content })
        });
        if (res.ok) return await res.json();
      } catch (e) {}

      // Direct client fallback
      const client = getClient();
      if (!client) throw new Error('Database client not connected.');
      const user = await this.getUser();
      const { data, error } = await client
        .from('portfolio_content')
        .upsert({
          id: 'draft',
          content,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });
      if (error) throw error;
      return { success: true, message: 'Draft saved to database!' };
    },

    async publish(content) {
      const token = await this.getSessionToken();
      // Try API route
      try {
        const res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'publish', content })
        });
        if (res.ok) return await res.json();
      } catch (e) {}

      // Direct client fallback
      const client = getClient();
      if (!client) throw new Error('Database client not connected.');
      const user = await this.getUser();
      const now = new Date().toISOString();
      const { error } = await client
        .from('portfolio_content')
        .upsert({
          id: 'published',
          content,
          published_at: now,
          updated_at: now,
          updated_by: user?.id
        });
      if (error) throw error;
      return { success: true, message: 'Website published to live!', published_at: now };
    },

    async discardDraft() {
      const token = await this.getSessionToken();
      try {
        const res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'discard' })
        });
        if (res.ok) return await res.json();
      } catch (e) {}

      const client = getClient();
      if (!client) throw new Error('Database client not connected.');
      const { data: pubData, error: pubErr } = await client
        .from('portfolio_content')
        .select('content')
        .eq('id', 'published')
        .single();
      if (pubErr || !pubData) throw new Error('No published content to restore.');

      await client.from('portfolio_content').upsert({ id: 'draft', content: pubData.content });
      return { success: true, content: pubData.content };
    },

    // File Uploads
    async uploadFile(file, folder = 'uploads') {
      const token = await this.getSessionToken();
      // Try serverless API first
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            filename: file.name,
            fileData: base64,
            mimeType: file.type,
            folder
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.url;
        }
      } catch (apiErr) {}

      // Direct Supabase storage fallback
      const client = getClient();
      if (!client) throw new Error('Database storage is not connected.');

      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${folder}/${Date.now()}-${cleanName}`;
      const bucket = 'portfolio-media';

      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = client.storage
        .from(bucket)
        .getPublicUrl(path);

      return publicUrl;
    }
  };

  window.SupabaseService = SupabaseService;
})(window);
