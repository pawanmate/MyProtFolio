Pawan Mate Engineering Portfolio — v9.20.1 Secure CMS Edition

Based on the v9.19 visual/design baseline. The portfolio keeps the existing civil-engineering presentation, construction background, animations, project filters, hero slider, fullscreen viewer, zoom, pan and galleries.

WHAT IS NEW
- Decap CMS editor at /admin/
- Content separated into editable JSON files under /content/
- Projects, images, galleries and drawing/PDF uploads can be managed from the CMS
- Hero slider can be edited
- Skills/software, CV, About, Contact and site text can be edited
- Netlify build automatically regenerates content.generated.js after CMS/Git changes
- Security headers, noindex admin page and a private-repository workflow
- Decap Turbo backend configuration placeholder (replace YOUR_TURBO_SITE_ID after creating the Turbo site)

IMPORTANT SECURITY
- Keep the GitHub repository private.
- Enable 2FA.
- Never commit passwords, tokens, API keys or recovery codes.
- Do not upload confidential project drawings.

DEPLOYMENT
1. Create a private GitHub repository.
2. Upload this folder to the repository on the main branch.
3. Connect the repository to Netlify and deploy with the included netlify.toml.
4. Create a Decap Turbo site for the GitHub repository.
5. Copy the Turbo Site ID into admin/config.yml in place of YOUR_TURBO_SITE_ID.
6. Commit that config change and redeploy.
7. Open /admin/ on the deployed site and sign in through Decap Turbo.

LOCAL DEVELOPMENT
- Run: npm run build
- Then serve the folder with a local static server. Opening index.html directly may not reproduce the hosted CMS flow.


CORRECTION IN v9.20.1
- Includes scripts/build-content.js required by Netlify for npm run build.
- Verified with Node.js that npm run build completes successfully.


v9.20.2: Hero name styling updated — Pawan Sanjay in white; Mate retains existing accent color.


V9.20.3 fix: inline content fallback keeps the portfolio visible if content.generated.js is temporarily unavailable; CMS-generated content still overrides the fallback.
