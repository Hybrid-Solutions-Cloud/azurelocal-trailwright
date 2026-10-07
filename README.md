# Azure Local Trailwright

Design Azure Local deployments, validate architecture choices and export reports for automation. Surveyor answers "does it fit"; Trailwright answers "how is it built". Neither tool deploys anything.

**Status: rebuild in progress** on the `rebuild` branch (owner decision D-032, 6 Oct 2026). The plan is in [docs/REBUILD.md](docs/REBUILD.md). The previous application is kept in [archive/](archive/) until cutover and is what `main` still deploys.

```powershell
npm install
npm run dev            # http://localhost:5173
npm run check          # type check
npm test               # unit tests
npm run test:browser   # Playwright journeys (builds and previews the app)
npm run build
```