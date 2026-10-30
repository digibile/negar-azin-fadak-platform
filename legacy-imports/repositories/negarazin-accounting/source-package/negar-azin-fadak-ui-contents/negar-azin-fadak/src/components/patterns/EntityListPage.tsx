import React, { useMemo, useState } from "react";
import type { BaseEntity, Column, FilterField } from "../../lib/api/types";
import { apiClient } from "../../lib/api/client";
import { PageHeader } from "./PageHeader";
import { SearchBox, FilterBar } from "../ui/Filters";
import { DataTable } from "../ui/Table";
import { Pagination } from "../ui/Pagination";
import { Button } from "../ui/Button";
import { EmptyState, LoadingState } from "../ui/States";
import { StatusBadge } from "../ui/Badge";
import { formatDate } from "../../lib/utils/format";
import { useToast } from "../ui/Toast";
import { Drawer, ConfirmDialog } from "../ui/Overlay";
import { Field, Input, Select } from "../ui/Form";

/**
 * موتور عمومی صفحات لیست/مدیریت.
 * هر ماژول (سازمان، کاربران، محصولات، مشتریان، اعتبار، ...) با پاس‌دادن
 * یک Config ساده، صفحه List + Search + Filter + Pagination + CRUD Drawer
 * کامل خودش را می‌گیرد؛ بدون بازنویسی UI برای هر ماژول.
 * جایگزینی Mock با API واقعی فقط در apiClient انجام می‌شود.
 */
export interface EntityListPageProps<T extends BaseEntity> {
  title: string;
  description?: string;
  breadcrumb: { label: string; to?: string }[];
  source: T[];
  columns?: Column<T>[];
  filters?: FilterField[];
  createLabel?: string;
  entityLabel?: string;
  onRowClick?: (row: T) => void;
  extraActions?: React.ReactNode;
}

export function EntityListPage<T extends BaseEntity>({
  title, description, breadcrumb, source, columns, filters = [], createLabel = "ایجاد جدید", entityLabel = "مورد", onRowClick, extraActions,
}: EntityListPageProps<T>) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<T[]>(source);
  const [total, setTotal] = useState(source.length);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newStatus, setNewStatus] = useState("active");
  const [creating, setCreating] = useState(false);
  const { push } = useToast();
  const pageSize = 8;

  const defaultColumns: Column<T>[] = useMemo(() => columns ?? [
    { key: "title", label: "عنوان" },
    { key: "subtitle", label: "جزئیات", render: (r) => <span className="text-text-muted">{r.subtitle ?? "—"}</span> },
    { key: "status", label: "وضعیت", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "تاریخ ایجاد", render: (r) => <span className="fa-num text-text-muted">{formatDate(r.createdAt)}</span> },
  ], [columns]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.list(source as any, { page, pageSize, search, filters: filterValues }).then((res) => {
      if (!active) return;
      setRows(res.items as T[]);
      setTotal(res.total);
      setLoading(false);
    });
    return () => { active = false; };
  }, [search, filterValues, page, source]);

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumb={breadcrumb}
        actions={
          <>
            {extraActions}
            <Button icon="＋" onClick={() => setCreateOpen(true)}>{createLabel}</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={`جستجو در ${title}...`} />
        {filters.length > 0 && (
          <FilterBar
            fields={filters}
            values={filterValues}
            onChange={(k, v) => { setFilterValues((prev) => ({ ...prev, [k]: v })); setPage(1); }}
            onReset={() => setFilterValues({})}
          />
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title="موردی یافت نشد" description="با تغییر فیلترها یا عبارت جستجو دوباره تلاش کنید، یا یک مورد جدید ایجاد کنید." actionLabel={createLabel} onAction={() => setCreateOpen(true)} />
      ) : (
        <>
          <DataTable
            columns={defaultColumns}
            rows={rows}
            onRowClick={onRowClick}
            rowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => push("info", "نمایش جزئیات در نسخه واقعی فعال می‌شود.")} className="rounded-md px-2 py-1 text-xs text-primary-600 hover:bg-primary-50">مشاهده</button>
                <button onClick={() => push("info", "ویرایش در نسخه واقعی فعال می‌شود.")} className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg">ویرایش</button>
                <button onClick={() => setDeleteTarget(row)} className="rounded-md px-2 py-1 text-xs text-danger-600 hover:bg-danger-50">حذف</button>
              </div>
            )}
          />
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`${createLabel} — ${entityLabel}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button
              loading={creating}
              onClick={async () => {
                setCreating(true);
                await apiClient.create({ title: newTitle, subtitle: newSubtitle, status: newStatus });
                setCreating(false);
                setCreateOpen(false);
                setNewTitle(""); setNewSubtitle("");
                push("success", `${entityLabel} جدید با موفقیت ایجاد شد (نمایشی).`);
              }}
            >
              ذخیره {entityLabel}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="عنوان" required>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={`عنوان ${entityLabel} را وارد کنید`} />
          </Field>
          <Field label="توضیح / زیرعنوان">
            <Input value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} />
          </Field>
          <Field label="وضعیت">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} options={[
              { label: "فعال", value: "active" },
              { label: "غیرفعال", value: "inactive" },
              { label: "در انتظار", value: "pending" },
            ]} />
          </Field>
          <p className="rounded-md bg-info-50 px-3 py-2 text-xs text-info-600">
            این فرم نمایشی است و داده را در حافظه محلی ذخیره نمی‌کند. در نسخه نهایی، این درخواست به API واقعی {entityLabel} ارسال خواهد شد.
          </p>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => push("success", `${entityLabel} حذف شد (نمایشی).`)}
        title={`حذف ${entityLabel}`}
        description={`آیا از حذف «${deleteTarget?.title}» مطمئن هستید؟ این عملیات در نسخه واقعی قابل بازگشت نخواهد بود.`}
        danger
      />
    </div>
  );
}
