import { projectSchema, type Project } from '../model/schema';

// The whole project, validated first so a broken project cannot be exported as if it were good.
export function buildProjectJson(p: Project): string {
  projectSchema.parse(p);
  return JSON.stringify(p, null, 2);
}