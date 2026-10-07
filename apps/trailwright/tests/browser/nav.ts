import type { Locator, Page } from '@playwright/test';

// A step link in the sidebar (the next and back links at the foot of a screen share some names).
export const step = (page: Page, title: string): Locator => page.getByRole('navigation', { name: 'Steps' }).getByRole('link', { name: title });
