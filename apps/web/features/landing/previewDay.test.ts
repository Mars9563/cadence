import { describe, expect, it } from 'vitest';

import { progressOf, TODAY_ITEMS, toggleItem, YESTERDAY_ITEMS } from './previewDay';

describe('preview day', () => {
  it('ticks and unticks one item without touching the others', () => {
    const once = toggleItem(TODAY_ITEMS, 'h-read');
    expect(once.find((i) => i.id === 'h-read')!.done).toBe(!TODAY_ITEMS.find((i) => i.id === 'h-read')!.done);
    expect(once.filter((i) => i.id !== 'h-read')).toEqual(TODAY_ITEMS.filter((i) => i.id !== 'h-read'));
    expect(toggleItem(once, 'h-read')).toEqual(TODAY_ITEMS);
  });

  it('counts progress', () => {
    const all = TODAY_ITEMS.reduce((items, item) => (item.done ? items : toggleItem(items, item.id)), TODAY_ITEMS);
    expect(progressOf(all)).toEqual({ done: TODAY_ITEMS.length, total: TODAY_ITEMS.length });
    expect(progressOf(TODAY_ITEMS).total).toBe(TODAY_ITEMS.length);
  });

  it('has a partly finished yesterday to show the lock on', () => {
    const { done, total } = progressOf(YESTERDAY_ITEMS);
    expect(done).toBeGreaterThan(0);
    expect(done).toBeLessThan(total);
  });
});
