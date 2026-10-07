import type { Project } from '../model/schema';
import { useProjectStore } from '../model/store';

type ScreenPlaceholderProps = {
  title: string;
  section: keyof Project;
};

export function ScreenPlaceholder({ title, section }: ScreenPlaceholderProps) {
  const value = useProjectStore((state) => state.project[section]);

  return (
    <section className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}