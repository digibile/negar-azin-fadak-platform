import type { BaseEntity, EntityStatus } from "../lib/api/types";

const STATUSES: EntityStatus[] = ["active", "inactive", "pending", "approved", "rejected", "processing"];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateEntities(
  prefix: string,
  count: number,
  titleFactory: (i: number) => string,
  subtitleFactory?: (i: number) => string
): BaseEntity[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const daysAgo = (idx * 3) % 90;
    const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
    return {
      id: `${prefix}-${String(idx).padStart(4, "0")}`,
      title: titleFactory(idx),
      subtitle: subtitleFactory?.(idx),
      status: pick(STATUSES, idx),
      createdAt: created,
      updatedAt: created,
      meta: {},
    };
  });
}
