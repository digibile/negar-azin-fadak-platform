import { describe, expect, it } from 'vitest';
import {
  entriesOf,
  entriesOfAll,
  firstDestination,
  isEmpty,
  isLinkable,
  isOnRoute,
  titleForRoute,
} from '../src/features/navigation/menu';
import type { MenuNode, MenuSummary } from '../src/lib/http/platform';

/**
 * The navigation helpers decide what an operator is told about where they are, so they are tested against
 * hand-built trees. The cases that matter are the ones a build-time list of links gets wrong: a section the
 * platform stopped routing, a prefix that matches a different page, and a section added out of order.
 */
function node(overrides: Partial<MenuNode> & Pick<MenuNode, 'id' | 'code' | 'title'>): MenuNode {
  return {
    parentId: null,
    englishTitle: null,
    icon: null,
    route: null,
    sortOrder: 0,
    permission: null,
    module: 'platform',
    depth: 0,
    level: 'Tenant',
    isActive: true,
    isPlatformDefined: true,
    isLeaf: true,
    children: [],
    ...overrides,
  };
}

function menu(sections: readonly MenuNode[]): MenuSummary {
  return {
    id: 'menu-1',
    code: 'management',
    title: 'مدیریت',
    englishTitle: 'Management',
    level: 'Tenant',
    isActive: true,
    isPlatformDefined: true,
    sections,
  };
}

const TREE: MenuSummary = menu([
  node({
    id: 'section-settings',
    code: 'settings',
    title: 'تنظیمات',
    sortOrder: 2,
    isLeaf: false,
    children: [
      node({ id: 'section-users', code: 'users', title: 'کاربران', route: '/management/users', sortOrder: 1 }),
    ],
  }),
  node({ id: 'section-home', code: 'home', title: 'مرکز مدیریت', route: '/management', sortOrder: 1 }),
]);

describe('menu entries', () => {
  it('walks the tree depth first, in the order the platform sorted it', () => {
    const entries = entriesOf(TREE);

    expect(entries.map((entry) => entry.node.code)).toEqual(['home', 'settings', 'users']);
    expect(entries.map((entry) => entry.depth)).toEqual([0, 0, 1]);
  });

  it('keeps a section that opens nothing, so its children stay findable', () => {
    const grouping = entriesOf(TREE).find((entry) => entry.node.code === 'settings');

    expect(grouping?.to).toBeNull();
    expect(isLinkable(grouping!.node)).toBe(false);
    expect(entriesOfAll([TREE]).map((entry) => entry.node.code)).toContain('users');
  });

  it('normalises a route that was stored with a trailing slash', () => {
    const entries = entriesOf(menu([node({ id: 's', code: 'c', title: 'گزارش', route: '/management/reports/' })]));

    expect(entries[0]?.to).toBe('/management/reports');
  });

  it('reports a menu of headings only as empty, and names the first real destination', () => {
    const headings = menu([
      node({ id: 's', code: 'c', title: 'تنظیمات', isLeaf: false, children: [node({ id: 'c1', code: 'c1', title: 'عمومی', isLeaf: false, children: [] })] }),
    ]);

    expect(isEmpty(headings)).toBe(true);
    expect(firstDestination([headings])).toBeNull();
    expect(firstDestination([TREE])).toBe('/management');
  });
});

describe('the title of the current address', () => {
  it('names the deepest section that owns the address, not its ancestor', () => {
    expect(titleForRoute([TREE], '/management/users', 'مرکز مدیریت')).toBe('کاربران');
  });

  it('names the owning section for a path beneath it', () => {
    expect(titleForRoute([TREE], '/management/users/invitations', 'مرکز مدیریت')).toBe('کاربران');
  });

  it('falls back when the address belongs to no published section', () => {
    expect(titleForRoute([TREE], '/management/operations', 'مرکز مدیریت')).toBe('مرکز مدیریت');
  });

  it('does not let a prefix claim a different page', () => {
    expect(isOnRoute('/management-users', '/management')).toBe(false);
    expect(titleForRoute([TREE], '/management-users', 'مرکز مدیریت')).toBe('مرکز مدیریت');
  });
});
