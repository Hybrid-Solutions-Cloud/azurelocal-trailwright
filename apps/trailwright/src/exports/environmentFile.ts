import { Document, isScalar, type Scalar, type YAMLMap, type YAMLSeq } from 'yaml';
import type { Project } from '../model/schema';
import { buildClusterFacts, LANDING_ZONE_KEYS, PLACEHOLDER, type Facts } from './clusterFacts';

// The cluster-facts subset of environment/azure-local/environment.yml, the file the Azure Local deploy automation reads.
// That file is validated by a schema that rejects unknown keys, so an infrastructure.yml cannot be used in its place.
// This export writes only what a design knows. Values it cannot know are 'CHANGE-ME' with a comment, and the landing-zone
// block the schema also requires is listed as comments at the end. Credentials are keyvault:// references only.
// The mapping is documented in docs/ENVIRONMENT-FILE.md.

export function environmentFileFacts(p: Project): Facts {
  return buildClusterFacts(p);
}

export function buildEnvironmentFile(p: Project): string {
  const { facts, placeholders, notes, adapterNames } = buildClusterFacts(p);
  const doc = new Document(facts);

  // adapter_names: each value gets an anchor, and every intent adapter becomes an alias of it, so a change of install route edits one map.
  const names = doc.get('adapter_names', true) as YAMLMap | undefined;
  if (names && Object.keys(adapterNames).length) {
    const byName = new Map<string, { anchor: string; node: Scalar }>();
    for (const pair of names.items) {
      if (isScalar(pair.value) && isScalar(pair.key)) {
        const anchor = String(pair.key.value);
        pair.value.anchor = anchor;
        byName.set(String(pair.value.value), { anchor, node: pair.value });
      }
    }
    const intents = doc.get('intents', true) as YAMLSeq | undefined;
    for (const item of intents?.items ?? []) {
      const adapters = (item as YAMLMap).get('adapters', true) as YAMLSeq | undefined;
      adapters?.items.forEach((a, i) => {
        const target = isScalar(a) ? byName.get(String(a.value)) : undefined;
        if (target) adapters.items[i] = doc.createAlias(target.node, target.anchor);
      });
    }
  }

  // A TODO comment on every placeholder, naming what is needed.
  for (const ph of placeholders) {
    const node = doc.getIn(ph.path, true);
    if (isScalar(node)) node.comment = ` TODO: ${ph.reason}`;
    else if (node && typeof node === 'object' && 'commentBefore' in node) (node as { commentBefore?: string }).commentBefore = ` TODO: ${ph.reason}`;
  }

  const header = [
    ` Azure Local environment file (cluster facts), written by azurelocal-trailwright from the project "${p.meta.name}".`,
    ` Release: 12.${p.release.version} (latest). Contract: the deploy automation's azure-local environment schema (unknown keys are rejected).`,
    ' This file holds ONLY what the design knows. Every CHANGE-ME value, and the landing-zone block at the end, must be filled in',
    ' before the automation reads it. Credentials are keyvault:// references; no secret value is ever written here.',
    ` ${placeholders.length} placeholder${placeholders.length === 1 ? '' : 's'} to fill in (each has a TODO comment).`,
  ];
  doc.commentBefore = header.join('\n');

  const footer = [
    ' --- Landing-zone block: REQUIRED by the schema, not known to a design (example values; replace) ---',
    ...LANDING_ZONE_KEYS.map((k) => ` ${k.key}: ${k.example}`),
    ' --- Optional: named secret references the automation reads (arb_application_secret, idrac_admin_username, ...) go in secret_refs above ---',
    ...(notes.length ? [' --- Notes from the design ---', ...notes.map((n) => ` ${n}`)] : []),
  ];
  doc.comment = footer.join('\n');

  return doc.toString({ lineWidth: 0 });
}

export { PLACEHOLDER };
