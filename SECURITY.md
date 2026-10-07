# Security notes

- Keep the GitHub repository **Private**.
- Enable 2FA on the GitHub and Decap Turbo accounts.
- Never put passwords, GitHub tokens, OAuth secrets, API keys, or recovery codes in this repository.
- CMS authentication is handled by Decap Turbo; the website contains no GitHub access token.
- CMS access should remain limited to invited/approved editors.
- `/admin/` is marked `noindex` and receives `no-store` caching headers.
- Netlify security headers are defined in `netlify.toml` and `_headers`.
- Portfolio uploads are stored under `assets/uploads` and are published as normal public portfolio assets. Do not upload confidential drawings or documents.
- Git history provides a recovery trail for accidental content changes.
