import type { MenuNode, MenuSummary } from '../../lib/http/platform';

/**
 * Reading the navigation tree the platform publishes.
 *
 * The platform resolves permissions, ordering, hierarchy and availability before the client sees anything,
 * so nothing here decides what an operator may open. What it does is decide what a screen can say: which
 * section a URL belongs to, which entries can be linked to at all, and how a tree with no leaves behaves.
 */

/** One section, flattened, with the depth it was nested at. */
export interface MenuEntry {
  readonly node: MenuNode;
  /** Path from the root of the client's router, or null when the section opens nothing. */
  readonly to: string | null;
  readonly depth: number;
}

/**
 * Normalises a route for comparison.
 *
 * Trailing slashes are dropped so `/management/` and `/management` are one destination, because the platform
 * may store either and the address bar will show whichever the operator typed.
 */
function normalize(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}

/** True when the section opens a route the client can link to. */
export function isLinkable(node: MenuNode): boolean {
  return typeof node.route === 'string' && node.route.trim().length > 0;
}

/** The destination of a section, or null when it is a pure grouping entry. */
export function destinationOf(node: MenuNode): string | null {
  return isLinkable(node) ? normalize(node.route as string) : null;
}

/**
 * The sections a menu contributes to navigation, in display order and depth first.
 *
 * Grouping entries are kept: an operator who put three sections under "Settings" needs the heading to be
 * able to find them, and a heading the client silently dropped is a structure that looks wrong.
 */
export function entriesOf(menu: MenuSummary): readonly MenuEntry[] {
  const entries: MenuEntry[] = [];

  const walk = (nodes: readonly MenuNode[], depth: number): void => {
    const ordered = [...nodes].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code, 'fa'),
    );

    for (const node of ordered) {
      entries.push({ node, to: destinationOf(node), depth });
      walk(node.children, depth + 1);
    }
  };

  walk(menu.sections, 0);
  return entries;
}

/** Every section of every menu, in the order the platform listed the menus. */
export function entriesOfAll(menus: readonly MenuSummary[]): readonly MenuEntry[] {
  return menus.flatMap(entriesOf);
}

/**
 * The title of the section the given address belongs to.
 *
 * The longest matching route wins, so `/management/users` is described as "Users" rather than as the
 * management centre that is also a prefix of it. Matching is on whole path segments: a section routed at
 * `/management` must not claim the address `/management-users`, which is a different page.
 */
export function titleForRoute(
  menus: readonly MenuSummary[],
  pathname: string,
  fallback: string,
): string {
  const current = normalize(pathname);
  let best: MenuEntry | null = null;

  for (const entry of entriesOfAll(menus)) {
    const to = entry.to;
    if (to === null || !isOnRoute(current, to)) {
      continue;
    }

    if (best === null || to.length > (best.to ?? '').length) {
      best = entry;
    }
  }

  return best?.node.title ?? fallback;
}

/** True when `pathname` is `route` itself or a path beneath it. */
export function isOnRoute(pathname: string, route: string): boolean {
  if (pathname === route) {
    return true;
  }

  return pathname.startsWith(route.endsWith('/') ? route : `${route}/`);
}

/** True when the menu contributes nothing a client could render as a link. */
export function isEmpty(menu: MenuSummary): boolean {
  return entriesOfAll([menu]).every((entry) => entry.to === null);
}

/** The first section with a route, used as the landing page of a menu. */
export function firstDestination(menus: readonly MenuSummary[]): string | null {
  return entriesOfAll(menus).find((entry) => entry.to !== null)?.to ?? null;
}
