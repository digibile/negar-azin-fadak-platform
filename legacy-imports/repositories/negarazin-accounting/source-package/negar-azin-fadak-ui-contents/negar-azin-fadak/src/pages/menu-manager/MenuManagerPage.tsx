import React, { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Drawer } from "../../components/ui/Overlay";
import { Field, Input, Select, Switch, Checkbox } from "../../components/ui/Form";
import { Icon } from "../../components/ui/Icon";
import { mockMenuTree } from "../../mock/menu";
import type { MenuNode } from "../../mock/menu";
import { useToast } from "../../components/ui/Toast";
import { roles } from "../../mock/users";

/**
 * UI مدیریت منو — Preview.
 * توجه: این کامپوننت صرفاً لایه نمایشی/ادیتوری روی یک ساختار Mock درخت منو است
 * و به هیچ عنوان معماری Master Menu واقعی پروژه را تغییر یا حذف نمی‌کند.
 * Drag & Drop با state محلی شبیه‌سازی شده تا رفتار UI قابل تست باشد؛
 * ثبت واقعی ترتیب باید به API واقعی منو متصل شود.
 */

let dragged: string | null = null;

const NodeRow: React.FC<{
  node: MenuNode; depth: number; onSelect: (n: MenuNode) => void; onToggleStatus: (id: string) => void; onReorder: (dragId: string, overId: string) => void;
}> = ({ node, depth, onSelect, onToggleStatus, onReorder }) => {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div>
      <div
        draggable
        onDragStart={() => (dragged = node.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={() => { setDragOver(false); if (dragged && dragged !== node.id) onReorder(dragged, node.id); }}
        style={{ paddingRight: depth * 22 }}
        className={`group flex items-center gap-2 rounded-md px-2 py-2 border ${dragOver ? "border-primary-400 bg-primary-50" : "border-transparent hover:bg-bg"}`}
      >
        <span className="cursor-grab text-text-muted"><Icon name="grip" size={14} /></span>
        {node.children ? (
          <button onClick={() => setExpanded((v) => !v)} className="w-5 text-xs text-text-muted">{expanded ? "⌄" : "‹"}</button>
        ) : <span className="w-5" />}
        {node.icon && <Icon name={node.icon} size={16} className="text-text-muted" />}
        <span className="flex-1 text-sm">{node.title}</span>
        <span className="hidden md:inline text-xs text-text-muted">{node.route ?? "—"}</span>
        <Badge color="info">{node.portal}</Badge>
        <button onClick={() => onToggleStatus(node.id)}>
          <Badge color={node.status === "active" ? "success" : "muted"}>{node.status === "active" ? "فعال" : "غیرفعال"}</Badge>
        </button>
        <div className="hidden group-hover:flex items-center gap-1">
          <button title="افزودن زیرمنو" className="rounded px-1.5 py-1 text-xs hover:bg-surface">➕</button>
          <button onClick={() => onSelect(node)} title="ویرایش" className="rounded px-1.5 py-1 text-xs hover:bg-surface">✏️</button>
          <button title="حذف" className="rounded px-1.5 py-1 text-xs text-danger-600 hover:bg-surface">🗑️</button>
        </div>
      </div>
      {expanded && node.children?.map((c) => (
        <NodeRow key={c.id} node={c} depth={depth + 1} onSelect={onSelect} onToggleStatus={onToggleStatus} onReorder={onReorder} />
      ))}
    </div>
  );
};

export default function MenuManagerPage() {
  const [tree, setTree] = useState<MenuNode[]>(mockMenuTree);
  const [selected, setSelected] = useState<MenuNode | null>(null);
  const { push } = useToast();

  const toggleStatus = (id: string) => {
    const walk = (nodes: MenuNode[]): MenuNode[] => nodes.map((n) => n.id === id
      ? { ...n, status: n.status === "active" ? "inactive" : "active" }
      : { ...n, children: n.children ? walk(n.children) : undefined });
    setTree(walk(tree));
    push("success", "وضعیت آیتم منو تغییر یافت (نمایشی).");
  };

  const reorder = () => push("info", "ترتیب منو به‌صورت نمایشی جابه‌جا شد؛ ثبت نهایی نیاز به اتصال به API واقعی منو دارد.");

  return (
    <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">
      <PageHeader
        title="مدیریت منوها"
        description="ساختار درختی، ترتیب، وضعیت نمایش و دسترسی منوهای سیستم را مدیریت کنید."
        breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت منوها" }]}
        actions={<Button icon="＋" onClick={() => push("info", "افزودن آیتم ریشه جدید (نمایشی).")}>افزودن منوی جدید</Button>}
      />
      <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
        <span>💡 آیتم‌ها را بکشید و رها کنید تا ترتیب منو تغییر کند.</span>
      </div>
      <Card padded={false}>
        <div className="p-2">
          {tree.map((n) => <NodeRow key={n.id} node={n} depth={0} onSelect={setSelected} onToggleStatus={toggleStatus} onReorder={reorder} />)}
        </div>
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={`ویرایش آیتم منو — ${selected?.title ?? ""}`} width="480px"
        footer={<>
          <Button variant="outline" onClick={() => setSelected(null)}>انصراف</Button>
          <Button onClick={() => { push("success", "تغییرات آیتم منو ذخیره شد (نمایشی)."); setSelected(null); }}>ذخیره</Button>
        </>}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <Field label="عنوان منو" required><Input defaultValue={selected.title} /></Field>
            <Field label="آیکون"><Input defaultValue={selected.icon} /></Field>
            <Field label="مسیر (Route)" hint="مسیر باید توسط تیم اصلی با معماری واقعی Routing تطبیق داده شود."><Input defaultValue={selected.route} dir="ltr" /></Field>
            <Field label="پرتال مرتبط">
              <Select defaultValue={selected.portal} options={[
                { label: "همه پرتال‌ها", value: "همه پرتال‌ها" }, { label: "مدیریت", value: "مدیریت" }, { label: "فروش", value: "فروش" }, { label: "اعتبار", value: "اعتبار" },
              ]} />
            </Field>
            <Switch checked={selected.status === "active"} label="نمایش در منو (Visibility)" onChange={() => {}} />
            <div>
              <p className="mb-2 text-sm font-medium">دسترسی نقش‌ها (Permission Assignment)</p>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => <Checkbox key={r.id} label={r.title} defaultChecked={r.title === "مدیر ارشد سیستم"} />)}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
