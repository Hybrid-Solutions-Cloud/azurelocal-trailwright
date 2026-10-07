import type { Project } from '../model/schema';

export type Finding = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  learnUrl: string;
};

// Storage architecture helpers: S2D questions and rules apply only when S2D is in the design, SAN ones only when a SAN is.
export const usesS2d = (p: Project): boolean => p.storage.architecture !== 'san';
export const usesSan = (p: Project): boolean => p.storage.architecture !== 's2d';

export type Rule = {
  id: string;
  // Runs only when the storage architecture includes this kind of storage.
  requires?: 's2d' | 'san';
  release: string[];
  learnUrl: string;
  check: (p: Project) => Finding[];
};