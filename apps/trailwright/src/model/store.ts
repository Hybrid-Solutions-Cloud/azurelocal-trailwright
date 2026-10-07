import { create } from 'zustand';
import { projectSchema, type Project } from './schema';
import { createEmptyProject } from './defaults';

const STORAGE_KEY = 'trailwright.project.v1';

type ProjectState = {
  project: Project;
  setSection: <K extends keyof Project>(section: K, value: Project[K]) => void;
  replaceProject: (p: Project) => void;
  reset: () => void;
};

function loadInitialProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyProject('Untitled project');
    }
    const result = projectSchema.safeParse(JSON.parse(raw) as unknown);
    return result.success ? result.data : createEmptyProject('Untitled project');
  } catch {
    return createEmptyProject('Untitled project');
  }
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: loadInitialProject(),
  setSection: (section, value) =>
    set((state) => ({ project: { ...state.project, [section]: value } as Project })),
  replaceProject: (p) => set({ project: p }),
  reset: () => set({ project: createEmptyProject('Untitled project') }),
}));

useProjectStore.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
  } catch {
    // Storage may be disabled or full; the app must keep working.
  }
});