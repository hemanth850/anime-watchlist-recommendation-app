# Release Checklist

## Pre-release

1. Ensure clean working tree.
2. Run quality checks:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
3. Update `CHANGELOG.md` with release notes.
4. Verify deployment steps in `docs/DEPLOYMENT.md`.

## Tag and Publish

1. Create version commit (if needed).
2. Tag release:
```bash
git tag v0.1.0
git push origin main --tags
```
3. Create GitHub Release from tag `v0.1.0`.
4. Paste changelog entry into release notes.

