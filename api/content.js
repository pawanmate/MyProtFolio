// api/content.js
// Vercel Serverless Function: Public endpoint to fetch published portfolio content
const fs = require('fs');
const path = require('path');

function getFallbackContent() {
  try {
    const contentDir = path.join(process.cwd(), 'content');
    const read = (name) => {
      const file = path.join(contentDir, name);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      return null;
    };

    const site = read('site.json') || {};
    const skills = read('skills.json')?.items || [];
    const hero = read('hero.json')?.items || [];
    const projects = read('projects.json')?.items || [];

    return {
      site,
      skills,
      hero,
      projects,
      appearance: {
        theme: "civil-sunset",
        accent_color: "#ff9a4a",
        bg_color: "#0b1020",
        panel_color: "#141725",
        text_color: "#fff3e3",
        muted_color: "#c6b7aa",
        border_color: "#4b352f",
        blueprint_overlay: true,
        cursor_glow: true,
        motion_animations: true,
        hero_bg: "assets/infrastructure-hero-bg.jpg"
      },
      sections: [
        { id: "hero", name: "Hero Section", visible: true, order: 1 },
        { id: "about", name: "About Me", visible: true, order: 2 },
        { id: "skills", name: "Skills & Software", visible: true, order: 3 },
        { id: "projects", name: "Engineering Projects", visible: true, order: 4 },
        { id: "cv", name: "CV / Résumé", visible: true, order: 5 },
        { id: "contact", name: "Contact Section", visible: true, order: 6 }
      ]
    };
  } catch (err) {
    console.error('Error reading fallback files:', err);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Try to fetch from Supabase if configured
  if (supabaseUrl && supabaseKey) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/portfolio_content?id=eq.published&select=*`;
      const response = await fetch(endpoint, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0 && data[0].content) {
          res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
          res.setHeader('X-Data-Source', 'supabase-published');
          return res.status(200).json({
            success: true,
            source: 'supabase',
            published_at: data[0].published_at,
            version: data[0].version,
            content: data[0].content
          });
        }
      } else {
        console.warn('Supabase responded with status:', response.status);
      }
    } catch (err) {
      console.warn('Could not query Supabase, using local fallback:', err.message);
    }
  }

  // 2. Safe Fallback to local files so website is 100% reliable
  const fallback = getFallbackContent();
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  res.setHeader('X-Data-Source', 'static-fallback');
  return res.status(200).json({
    success: true,
    source: 'fallback',
    content: fallback
  });
};
