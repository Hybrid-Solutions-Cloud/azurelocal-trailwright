# Contributing

Thanks for helping. Trailwright is a design-record tool: it never deploys anything and never stores secrets.

## Set up

```powershell
npm install
npm run dev          # http://localhost:5173
```

## Before you open a pull request

```powershell
npm run check        # type check
npm run lint         # ESLint
npm test             # unit and contract tests
npm run build        # runs the contract tests first, then builds
npm run test:browser # Playwright journeys (builds and previews the app)
```

## Rules of the road

- **Release wording:** the tool plans against Azure Local 12.2609 (latest). Write "12.2609 (latest)" in text a person reads.
- **Every rule needs a Microsoft Learn URL** and a case in `apps/trailwright/tests/ruleCases.ts`. After changing a rule run `npm run docs:rules --workspace apps/trailwright` and commit `docs/RULES.md`; a test fails when it is stale.
- **infrastructure.yml:** change the exporter and `apps/trailwright/public/schema/infrastructure.schema.json` together.
- **Environment file and Terraform exports:** values the design cannot know stay `CHANGE-ME`; never invent one. The vendored schema in `tests/fixtures` is a copy of the deploy automation contract: refresh it, do not edit it.
- **Example values only:** use documentation address ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), `example.com` names and all-zero GUIDs. No customer, tenant or lab data.
- **No secrets:** credentials are `keyvault://` references or `null`. A test checks the exports.
- Keep one concern per file, readable source, and tests next to the behavior they protect.

## Commits

Use short, imperative messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Update `CHANGELOG.md` under Unreleased.
