# CLAUDE.md

## Secrets policy

Never store API keys, tokens, or other secrets in `.env` files (even gitignored ones) or hardcode them in source. Use a secret manager instead:

- **Local development**: pull secrets from the OS keychain (macOS Keychain, Windows Credential Manager) or a dedicated secrets CLI (e.g. `1password-cli`, `doppler`, `vault`) at runtime — never write them to a file on disk.
- **CI (GitHub Actions)**: store secrets in repo/org Settings → Secrets and variables → Actions, and reference them as `${{ secrets.NAME }}`.
- **Deployment (Vercel/Netlify/etc.)**: use the platform's encrypted environment variable / secret store, not a committed `.env` file.

`.env*` is gitignored as a safety net, but that is a backstop, not the intended mechanism — don't rely on "it's gitignored" as justification for putting a real key in one.
