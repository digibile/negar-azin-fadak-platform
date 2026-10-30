// ===== لایه انتزاعی دسترسی به داده (Data Access Layer) =====
// همه صفحات UI فقط از این فایل import می‌کنند، نه مستقیم از mock/*.
// وقتی تیم اصلی API واقعی را وصل کند، فقط بدنه توابع این فایل عوض می‌شود
// (fetch به بک‌اند واقعی) و هیچ صفحه‌ای در UI نیاز به تغییر ندارد.

import type { Paginated } from "./types";

const SIMULATED_LATENCY = 250;

function delay<T>(value: T, ms = SIMULATED_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: Record<string, string | undefined>;
}

export const apiClient = {
  /** لیست + صفحه‌بندی + جستجو + فیلتر روی یک آرایه Mock */
  async list<T extends { title?: string; status?: string }>(
    source: T[],
    params: ListParams = {}
  ): Promise<Paginated<T>> {
    const { page = 1, pageSize = 10, search = "", filters = {} } = params;
    let rows = [...source];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    Object.entries(filters).forEach(([key, val]) => {
      if (val) rows = rows.filter((r: any) => String(r[key]) === String(val));
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);
    return delay({ items, total, page, pageSize });
  },

  async getById<T extends { id: string }>(source: T[], id: string): Promise<T | null> {
    return delay(source.find((r) => r.id === id) ?? null);
  },

  async create<T>(_payload: Partial<T>): Promise<{ ok: boolean; id: string }> {
    return delay({ ok: true, id: "mock-" + Math.random().toString(36).slice(2, 9) });
  },

  async update<T>(_id: string, _payload: Partial<T>): Promise<{ ok: boolean }> {
    return delay({ ok: true });
  },

  async remove(_id: string): Promise<{ ok: boolean }> {
    return delay({ ok: true });
  },

  async setStatus(_id: string, _status: string): Promise<{ ok: boolean }> {
    return delay({ ok: true });
  },
};
