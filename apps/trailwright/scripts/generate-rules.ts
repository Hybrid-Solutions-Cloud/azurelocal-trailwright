import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRulesDoc } from '../tests/rulesDoc';

const target = resolve(__dirname, '..', '..', '..', 'docs', 'RULES.md');
writeFileSync(target, buildRulesDoc());
console.log(`Wrote ${target}`);
