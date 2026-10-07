import type { Project } from '../model/schema';

export type Finding = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  learnUrl: string;
};

export type Rule = {
  id: string;
  release: string[];
  learnUrl: string;
  check: (p: Project) => Finding[];
};