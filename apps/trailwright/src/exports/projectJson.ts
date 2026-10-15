import { projectSchema, type Project } from '../model/schema';

export const NOTICE = 'Free-text notes (project.notes) are exported as typed. Never type passwords, keys or other secrets into a note.';

// The whole project, validated first so a broken project cannot be exported as if it were good.
export function buildProjectJson(p: Project): string {
  projectSchema.parse(p);
  return JSON.stringify({ _notice: NOTICE, ...p }, null, 2);
}