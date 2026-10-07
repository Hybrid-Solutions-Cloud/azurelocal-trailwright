export const screens = [
  { path: 'project', title: 'Project and release' },
  { path: 'hardware', title: 'Hardware and topology' },
  { path: 'identity', title: 'Identity' },
  { path: 'networking', title: 'Networking' },
  { path: 'connectivity', title: 'Connectivity' },
  { path: 'landing-zone', title: 'Azure landing zone' },
  { path: 'storage', title: 'Storage' },
  { path: 'operations', title: 'Operations' },
  { path: 'review', title: 'Review and export' },
] as const;

export type Screen = (typeof screens)[number];