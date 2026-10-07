import type { Project } from '../model/schema';

export type ExportKind = {
  id: string;
  label: string;
  filename: (p: Project) => string;
  mime: string;
  build: (p: Project) => string | Uint8Array;
};

// File-name safe form of the project name.
export function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'design';
}