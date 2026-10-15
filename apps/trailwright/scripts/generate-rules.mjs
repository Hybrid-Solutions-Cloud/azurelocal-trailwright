// Regenerates docs/RULES.md from the rule registry: runs the RULES.md test in update mode.
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['vitest', 'run', 'tests/rulesDoc.test.ts'], { env: { ...process.env, UPDATE_RULES_DOC: '1' }, stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
