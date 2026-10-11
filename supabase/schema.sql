-- ==============================================================================
-- PAWAN MATE ENGINEERING PORTFOLIO — SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It sets up:
-- 1. portfolio_content table with 'draft' and 'published' states
-- 2. media_library table for tracking uploaded images and drawings
-- 3. Row Level Security (RLS) policies protecting draft data and write operations
-- 4. Storage bucket 'portfolio-media' with public read & authenticated write
-- 5. Complete seed migration data with all existing projects, skills, and details
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PORTFOLIO CONTENT TABLE (Draft vs Published workflow)
CREATE TABLE IF NOT EXISTS public.portfolio_content (
  id TEXT PRIMARY KEY,                       -- 'draft' or 'published'
  content JSONB NOT NULL,                   -- Complete portfolio JSON structure
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. MEDIA LIBRARY TABLE (Tracks uploaded documents, drawings, photos)
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  folder TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.portfolio_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Portfolio Content Policies:
-- Anonymous (public visitors) can ONLY view the 'published' record.
DROP POLICY IF EXISTS "Public can view published portfolio content" ON public.portfolio_content;
CREATE POLICY "Public can view published portfolio content"
  ON public.portfolio_content
  FOR SELECT
  TO public
  USING (id = 'published');

-- Authenticated Admin can view both draft and published records.
DROP POLICY IF EXISTS "Admins can view all portfolio content" ON public.portfolio_content;
CREATE POLICY "Admins can view all portfolio content"
  ON public.portfolio_content
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated Admin can insert or update draft and published records.
DROP POLICY IF EXISTS "Admins can insert portfolio content" ON public.portfolio_content;
CREATE POLICY "Admins can insert portfolio content"
  ON public.portfolio_content
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update portfolio content" ON public.portfolio_content;
CREATE POLICY "Admins can update portfolio content"
  ON public.portfolio_content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Media Library Policies:
DROP POLICY IF EXISTS "Public can view media library" ON public.media_library;
CREATE POLICY "Public can view media library"
  ON public.media_library
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage media library" ON public.media_library;
CREATE POLICY "Admins can manage media library"
  ON public.media_library
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET: portfolio-media
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-media', 'portfolio-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: Public can read, authenticated can insert/update/delete
DROP POLICY IF EXISTS "Public can view portfolio media" ON storage.objects;
CREATE POLICY "Public can view portfolio media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'portfolio-media');

DROP POLICY IF EXISTS "Admins can upload portfolio media" ON storage.objects;
CREATE POLICY "Admins can upload portfolio media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portfolio-media');

DROP POLICY IF EXISTS "Admins can update portfolio media" ON storage.objects;
CREATE POLICY "Admins can update portfolio media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'portfolio-media');

DROP POLICY IF EXISTS "Admins can delete portfolio media" ON storage.objects;
CREATE POLICY "Admins can delete portfolio media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio-media');

-- ==============================================================================
-- INITIAL SEED DATA (MIGRATING ALL EXISTING PORTFOLIO DATA INTO SUPABASE)
-- ==============================================================================
DO $$
DECLARE
  initial_payload JSONB := '{
    "site": {
      "brand": "PAWAN.",
      "brand_subtitle": "Civil Engineering Portfolio",
      "footer": "© 2026 Pawan Sanjay Mate · Civil Engineering · BIM · Structural Design"
    },
    "appearance": {
      "theme": "civil-sunset",
      "accent_color": "#ff9a4a",
      "bg_color": "#0b1020",
      "panel_color": "#141725",
      "text_color": "#fff3e3",
      "muted_color": "#c6b7aa",
      "border_color": "#4b352f",
      "blueprint_overlay": true,
      "cursor_glow": true,
      "motion_animations": true,
      "hero_bg": "assets/infrastructure-hero-bg.jpg"
    },
    "seo": {
      "title": "Pawan Sanjay Mate | Civil Engineering Portfolio",
      "description": "Civil Engineering student focused on BIM, technical drafting, architectural modelling and structural design.",
      "keywords": "Pawan Mate, Civil Engineering, BIM, Revit, AutoCAD, Structural Drafting, SketchUp",
      "author": "Pawan Sanjay Mate",
      "og_image": "assets/infrastructure-hero-bg.jpg",
      "favicon": "assets/highres/post-office-1.png"
    },
    "hero": {
      "eyebrow": "Civil Engineering Portfolio",
      "name_first": "Pawan Sanjay",
      "name_last": "Mate",
      "intro": "Civil Engineering student focused on BIM, technical drafting, architectural modelling and structural design. I turn engineering concepts into detailed drawings, digital models and practical project documentation.",
      "buttons": [
        {"label": "Explore My Work ↓", "href": "#projects", "primary": true, "visible": true},
        {"label": "View CV", "href": "Pawan-Mate-CV.pdf", "primary": false, "visible": true, "target": "_blank"},
        {"label": "LinkedIn ↗", "href": "https://www.linkedin.com/in/pawan-mate-6a989b379", "primary": false, "visible": true, "target": "_blank"}
      ],
      "stats": [
        {"value": "6+", "label": "Core tools"},
        {"value": "BIM", "label": "Focus"},
        {"value": "2028", "label": "BE target"}
      ],
      "slider": [
        {
          "project_index": 0,
          "image": "assets/highres/post-office-1.png",
          "alt": "RCC Post Office drawing",
          "label": "RCC Post Office · AutoCAD"
        },
        {
          "project_index": 3,
          "image": "assets/highres/3bhk-1.png",
          "alt": "3 BHK Revit project",
          "label": "3 BHK Residential Model · Revit"
        },
        {
          "project_index": 5,
          "image": "assets/highres/dormer-1.png",
          "alt": "Dormer Revit assignment",
          "label": "Dormer Assignment · Revit"
        },
        {
          "project_index": 6,
          "image": "assets/sketchup/sketchup-kitchen.png",
          "alt": "SketchUp kitchen interior",
          "label": "Residential 3D Visualization · SketchUp"
        },
        {
          "project_index": 6,
          "image": "assets/sketchup/sketchup-landscape.png",
          "alt": "SketchUp landscape model",
          "label": "Landscape & Exterior · SketchUp"
        },
        {
          "project_index": 6,
          "image": "assets/sketchup/sketchup-house-exterior.png",
          "alt": "SketchUp house exterior model",
          "label": "House Exterior · SketchUp"
        },
        {
          "project_index": 6,
          "image": "assets/sketchup/sketchup-bedroom-1.png",
          "alt": "SketchUp bedroom interior",
          "label": "Bedroom Interior · SketchUp"
        }
      ]
    },
    "about": {
      "eyebrow": "01 — About",
      "heading": "Engineering with a design mindset.",
      "description": "I am developing practical skills in BIM, CAD, architectural modelling and structural drafting, with a focus on turning engineering concepts into clear digital drawings and coordinated models.",
      "purpose_heading": "Engineering with purpose",
      "purpose_text": "I explore the intersection of civil engineering and digital design through BIM, CAD, structural drafting and 3D modelling. My goal is to create clear, accurate and practical project documentation.",
      "education_heading": "Education",
      "education_text": "BE Civil Engineering|Dr. D. Y. Patil Institute of Technology|Currently pursuing · Expected 2028",
      "academic_performance": "First Year 8.32 CGPA · Second Year 8.31 CGPA"
    },
    "skills_section": {
      "eyebrow": "02 — Skills",
      "heading": "Technical skills & tools",
      "description": "Digital tools and engineering skills I use to develop, document and visualize built-environment projects."
    },
    "skills": [
      {
        "id": "revit",
        "icon": "🏢",
        "name": "Revit",
        "category": "BIM / 3D",
        "description": "BIM-based building modelling, plans, sections, components, documentation and 3D views.",
        "visible": true
      },
      {
        "id": "autocad",
        "icon": "📐",
        "name": "AutoCAD",
        "category": "2D Drafting",
        "description": "2D drafting, plans, elevations, sections, layouts and structural detailing.",
        "visible": true
      },
      {
        "id": "bim",
        "icon": "🧩",
        "name": "BIM",
        "category": "Coordination",
        "description": "Model-based documentation, Revit workflows, building information and coordinated project presentation.",
        "visible": true
      },
      {
        "id": "sketchup",
        "icon": "🏠",
        "name": "SketchUp",
        "category": "Visualization",
        "description": "3D architectural modelling, interior views and built-environment visualization.",
        "visible": true
      },
      {
        "id": "staad",
        "icon": "🏗️",
        "name": "STAAD.Pro",
        "category": "Structural Analysis",
        "description": "Structural-analysis learning track for future project applications.",
        "visible": true
      },
      {
        "id": "etabs",
        "icon": "📊",
        "name": "ETABS",
        "category": "Structural Analysis",
        "description": "Structural-analysis learning track for future project applications.",
        "visible": true
      }
    ],
    "projects_section": {
      "eyebrow": "03 — Portfolio",
      "heading": "Selected engineering work",
      "description": "A selection of academic and technical work across CAD drafting, BIM, architectural modelling and structural design. Each project highlights the tools and skills used to develop the final documentation or model."
    },
    "projects": [
      {
        "id": "rcc-post-office",
        "title": "RCC Post Office — Planning & Drafting",
        "tag": "AUTOCAD · STRUCTURAL",
        "categories": ["autocad", "structural"],
        "description": "Ground-floor post office planning and drafting work. The supplied sheet includes the ground-floor plan, front elevation, Section A-A′, opening schedule and RCC construction notes.",
        "tools": "AutoCAD · RCC planning · Drafting · Scale 1:100",
        "type": "RCC Building Design",
        "software": "AutoCAD",
        "skills": "2D Drafting · Building Planning · RCC Detailing · Drawing Reading",
        "scale": "Scale 1:100 · RCC framed structure",
        "image": "assets/highres/post-office-1.png",
        "gallery": ["assets/highres/post-office-1.png"],
        "documents": ["assets/documents/RCC-Post-Office.pdf"],
        "featured": true,
        "visible": true
      },
      {
        "id": "structural-design-sheet",
        "title": "Structural Design Sheet",
        "tag": "STRUCTURAL DESIGN",
        "categories": ["structural", "autocad"],
        "description": "Structural layout work showing column and beam information alongside the building planning layout.",
        "tools": "Structural drafting · Column layout · Beam/slab coordination",
        "type": "Structural Design",
        "software": "AutoCAD / Structural Drafting",
        "skills": "Column layout · Beam coordination · Drawing interpretation",
        "scale": "Structural layout sheet",
        "image": "assets/highres/structural-1.png",
        "gallery": ["assets/highres/structural-1.png"],
        "documents": ["assets/documents/Structural-Design.pdf"],
        "featured": true,
        "visible": true
      },
      {
        "id": "residential-quarters",
        "title": "Residential Government Quarters",
        "tag": "AUTOCAD · RCC",
        "categories": ["autocad", "structural"],
        "description": "Residential RCC-framed design containing the ground-floor plan, front elevation, Section A-A′ and opening schedule.",
        "tools": "AutoCAD · RCC framing · Drafting · Scale 1:100",
        "type": "Residential RCC Building",
        "software": "AutoCAD",
        "skills": "Building Planning · RCC Framing · Drafting · Drawing Reading",
        "scale": "Scale 1:100",
        "image": "assets/highres/quarters-1.png",
        "gallery": ["assets/highres/quarters-1.png"],
        "documents": ["assets/documents/Government-Quarters.pdf"],
        "featured": false,
        "visible": true
      },
      {
        "id": "3bhk-residential-model",
        "title": "3 BHK Residential Model",
        "tag": "REVIT · BIM",
        "categories": ["revit"],
        "description": "Revit sheet containing Level 1, two sections, room information/material information and a 3D building view.",
        "tools": "Revit · BIM · Architectural modelling · Documentation",
        "type": "Residential BIM Model",
        "software": "Revit",
        "skills": "BIM Modelling · Plans · Sections · 3D Views",
        "scale": "Revit project sheet",
        "image": "assets/highres/3bhk-1.png",
        "gallery": ["assets/highres/3bhk-1.png"],
        "documents": ["assets/documents/3-BHK-Revit.pdf"],
        "featured": true,
        "visible": true
      },
      {
        "id": "staircase-study",
        "title": "Staircase Study",
        "tag": "REVIT",
        "categories": ["revit"],
        "description": "Revit staircase sheet showing Level 1 and a 3D view with multiple stair configurations including straight, winder, quarter-turn, double-winder, half-landing, curved, spiral and split stairs.",
        "tools": "Revit · Stair modelling · Circulation design",
        "type": "Staircase Modelling",
        "software": "Revit",
        "skills": "Stair Modelling · Circulation Design · 3D Documentation",
        "scale": "Revit project sheet",
        "image": "assets/highres/staircase-1.png",
        "gallery": ["assets/highres/staircase-1.png"],
        "documents": ["assets/documents/Staircase-Revit.pdf"],
        "featured": false,
        "visible": true
      },
      {
        "id": "dormer-assignment",
        "title": "Dormer Assignment",
        "tag": "REVIT · BIM",
        "categories": ["revit"],
        "description": "Revit Dormer Assignment sheet showing Level 1, Site, Section 2, Level 2, South elevation and a 3D dormer building model.",
        "tools": "Revit · BIM · 3D modelling · Architectural documentation",
        "type": "Architectural BIM Assignment",
        "software": "Revit",
        "skills": "BIM Modelling · 3D Modelling · Elevations · Documentation",
        "scale": "Revit project sheet",
        "image": "assets/highres/dormer-1.png",
        "gallery": ["assets/highres/dormer-1.png"],
        "documents": ["assets/documents/Dormer-Revit.pdf"],
        "featured": false,
        "visible": true
      },
      {
        "id": "residential-3d-visualization",
        "title": "Residential 3D Visualization",
        "tag": "SKETCHUP · 3D",
        "categories": ["sketchup"],
        "description": "SketchUp visualization set showing a kitchen interior, landscaped front yard, house exterior and bedroom interior views.",
        "tools": "SketchUp · 3D modelling · Interior · Landscape · Visualization",
        "type": "Residential 3D Visualization",
        "software": "SketchUp",
        "skills": "3D Modelling · Interior · Landscape · Visualization",
        "scale": "SketchUp model views",
        "image": "assets/sketchup/sketchup-landscape-front.png",
        "gallery": [
          "assets/sketchup/sketchup-landscape-front.png",
          "assets/sketchup/sketchup-house-exterior.png",
          "assets/sketchup/sketchup-kitchen.png",
          "assets/sketchup/sketchup-landscape.png",
          "assets/sketchup/sketchup-bedroom-1.png",
          "assets/sketchup/sketchup-bedroom-2.png"
        ],
        "documents": [],
        "featured": true,
        "visible": true
      }
    ],
    "education": [
      {
        "degree": "BE Civil Engineering",
        "institution": "Dr. D. Y. Patil Institute of Technology",
        "duration": "2028 (Pursuing)",
        "score": "First Year 8.32 CGPA, Second Year 8.31 CGPA",
        "details": "Focus on BIM workflows, structural engineering, CAD drafting and sustainable construction."
      },
      {
        "degree": "12th Standard (HSC)",
        "institution": "Maharashtra State Board",
        "duration": "2024",
        "score": "64.67%",
        "details": "Science Stream."
      },
      {
        "degree": "10th Standard (SSC)",
        "institution": "Central Board of Secondary Education (CBSE)",
        "duration": "2022",
        "score": "78.2%",
        "details": "Secondary school education."
      }
    ],
    "experience": [
      {
        "role": "Vice President",
        "organization": "Srushti – Environmental & Social Awareness Club",
        "duration": "Ongoing",
        "details": "Planning and coordination of environmental initiatives, water conservation awareness campaigns, and student activities."
      },
      {
        "role": "Active Member & Event Manager",
        "organization": "Antarang – Cultural Club",
        "duration": "Ongoing",
        "details": "Served as Anchor, Co-Anchor, and contributed to event management, stage setup and props coordination."
      }
    ],
    "certifications": [
      {
        "title": "AutoCAD (2D) Certification",
        "issuer": "CESA Autodesk",
        "year": "2024",
        "description": "Developed proficiency in accurate 2D engineering drawings, structural layouts, layer control and scaling standards."
      },
      {
        "title": "Structural Drafting Certification",
        "issuer": "CESA Autodesk",
        "year": "2024",
        "description": "Covered beams, columns, slabs, footings, reinforcement detailing and structural sections using AutoCAD."
      },
      {
        "title": "Revit Practical Training",
        "issuer": "Practical Training Track",
        "year": "2024",
        "description": "Hands-on architectural 3D modelling: walls, floors, roofs, doors, windows, component placement, and documentation."
      },
      {
        "title": "BIM Learning & Workflows",
        "issuer": "BIM Practical Track",
        "year": "2024",
        "description": "BIM concepts, project workflows, Revit-based coordination and model-based documentation."
      }
    ],
    "achievements": [
      {
        "title": "2nd Runner-Up — PBL Model Making Competition (2026)",
        "organization": "IE(I) Student Chapter",
        "year": "2026",
        "details": "Recognized for Green Building & Sustainable Construction Project, exploring porous concrete, rainwater harvesting and passive solar."
      }
    ],
    "activities": [
      {
        "title": "Rainwater Harvesting Field Survey",
        "organization": "PCMC / Jal Sanchay Jan Bhagidari (JSJB)",
        "role": "Survey Participant",
        "description": "Field survey of rainwater harvesting systems studying installation cost, efficiency, operation and groundwater recharge."
      },
      {
        "title": "World Water Day Cleanliness Drive",
        "organization": "Water Knowledge Centre",
        "role": "Volunteer & Photographer",
        "description": "Supported events as volunteer and photographer, contributing to water-conservation community awareness."
      }
    ],
    "cv_section": {
      "eyebrow": "04 — CV",
      "heading": "My résumé",
      "description": "A concise overview of my education, technical skills, certifications, projects and achievements.",
      "name": "Pawan Sanjay Mate",
      "role": "BE Civil Engineering · BIM · Structural Design · Architectural Modelling",
      "text": "Currently developing practical experience in digital engineering workflows, technical drafting and building modelling.",
      "file": "Pawan-Mate-CV.pdf",
      "button": "Open CV ↗"
    },
    "contact": {
      "eyebrow": "05 — Contact",
      "heading": "Let''s build something meaningful.",
      "description": "Open to learning, collaboration and Civil Engineering opportunities.",
      "email": "pawanmate41@gmail.com",
      "phone": "+91 8669345161",
      "location": "At post Kawatha kadu tq. Chandur Railway dist. Amravati, Maharashtra",
      "linkedin": "linkedin.com/in/pawan-mate-6a989b379",
      "linkedin_url": "https://www.linkedin.com/in/pawan-mate-6a989b379",
      "portfolio_url": "https://myfolio-lemon.vercel.app/"
    },
    "sections": [
      {"id": "hero", "name": "Hero Section", "visible": true, "order": 1},
      {"id": "about", "name": "About Me", "visible": true, "order": 2},
      {"id": "skills", "name": "Skills & Software", "visible": true, "order": 3},
      {"id": "projects", "name": "Engineering Projects", "visible": true, "order": 4},
      {"id": "cv", "name": "CV / Résumé", "visible": true, "order": 5},
      {"id": "contact", "name": "Contact Section", "visible": true, "order": 6}
    ]
  }'::jsonb;
BEGIN
  -- Insert published version if not exists
  INSERT INTO public.portfolio_content (id, content, version, published_at)
  VALUES ('published', initial_payload, 1, NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Insert draft version if not exists
  INSERT INTO public.portfolio_content (id, content, version, published_at)
  VALUES ('draft', initial_payload, 1, NOW())
  ON CONFLICT (id) DO NOTHING;
END $$;
