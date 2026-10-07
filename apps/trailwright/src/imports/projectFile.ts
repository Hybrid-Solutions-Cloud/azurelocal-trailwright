import { projectSchema } from '../model/schema';
import type { Project } from '../model/schema';

export function parseProjectFile(text: string): { ok: true; project: Project } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  const result = projectSchema.safeParse(parsed);
  if (result.success) return { ok: true, project: result.data };
  const summary = result.error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  return { ok: false, error: summary };
}