import { z } from 'zod';

// as-built-snapshot.v1: a small, tool-neutral description of a deployed Azure Local cluster, to compare with a design record.
// Azure Local Ranger, Sonar or a PowerShell script can produce it (see docs/AS-BUILT.md for the Ranger field mapping).
// Every section is optional: a section the producer did not capture is reported as "not captured", never as missing.

export const SNAPSHOT_SCHEMA = 'as-built-snapshot.v1';

const traffic = z.enum(['management', 'compute', 'storage']);

export const snapshotSchema = z.object({
  schema: z.literal(SNAPSHOT_SCHEMA),
  capturedAt: z.string().optional(),
  source: z.object({ tool: z.string().default(''), version: z.string().default(''), note: z.string().default('') }).default({}),
  cluster: z
    .object({
      name: z.string().optional(),
      // The deployed release, for example 12.2609.1003.7 (or the 12.2609 train).
      release: z.string().optional(),
    })
    .optional(),
  identity: z.object({ model: z.enum(['active-directory', 'local-identity-key-vault']), domain: z.string().optional() }).optional(),
  witness: z.object({ type: z.enum(['cloud', 'file-share', 'none']) }).optional(),
  nodes: z
    .array(
      z.object({
        name: z.string(),
        managementIp: z.string().optional(),
        storageIps: z.array(z.string()).optional(),
        serial: z.string().optional(),
      }),
    )
    .optional(),
  vlans: z.array(z.object({ id: z.number().int().min(0).max(4094), name: z.string().optional() })).optional(),
  intents: z.array(z.object({ name: z.string(), traffic: z.array(traffic), adapters: z.array(z.string()).default([]) })).optional(),
  volumes: z.array(z.object({ name: z.string(), sizeGiB: z.number().optional(), resiliency: z.enum(['two-way', 'three-way', 'four-way', 'parity', 'nested-two-way']).optional() })).optional(),
  dnsServers: z.array(z.string()).optional(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export function parseSnapshot(text: string): { ok: true; snapshot: Snapshot } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null || (parsed as { schema?: unknown }).schema !== SNAPSHOT_SCHEMA) {
    return { ok: false, error: `Not an as-built snapshot: expected schema "${SNAPSHOT_SCHEMA}".` };
  }
  const result = snapshotSchema.safeParse(parsed);
  if (result.success) return { ok: true, snapshot: result.data };
  return { ok: false, error: result.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') };
}
