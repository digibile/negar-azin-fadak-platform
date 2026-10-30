import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { companies, branches, brands, stores, businessUnits, departments, positions, employees } from "../../mock/organization";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

const statusFilter = [{ key: "status", label: "وضعیت", type: "status" as const, options: [
  { label: "فعال", value: "active" }, { label: "غیرفعال", value: "inactive" },
] }];

function makeListPage(title: string, source: any[], breadcrumbLabel: string, entityLabel: string) {
  return () => (
    <Shell>
      <EntityListPage
        title={title}
        entityLabel={entityLabel}
        breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت سازمان" }, { label: breadcrumbLabel }]}
        source={source}
        filters={statusFilter}
        createLabel={`افزودن ${entityLabel}`}
      />
    </Shell>
  );
}

export const CompaniesPage = makeListPage("شرکت‌ها", companies, "شرکت‌ها", "شرکت");
export const BranchesPage = makeListPage("شعبه‌ها", branches, "شعبه‌ها", "شعبه");
export const BrandsMgmtPage = makeListPage("برندها", brands, "برندها", "برند");
export const StoresMgmtPage = makeListPage("فروشگاه‌ها", stores, "فروشگاه‌ها", "فروشگاه");
export const BusinessUnitsPage = makeListPage("واحدهای کسب‌وکار", businessUnits, "واحدهای کسب‌وکار", "واحد کسب‌وکار");
export const DepartmentsPage = makeListPage("دپارتمان‌ها", departments, "دپارتمان‌ها", "دپارتمان");
export const PositionsPage = makeListPage("سمت‌های شغلی", positions, "سمت‌های شغلی", "سمت شغلی");
export const EmployeesPage = makeListPage("کارمندان", employees, "کارمندان", "کارمند");

interface TreeNode { id: string; title: string; children?: TreeNode[]; }
const orgTree: TreeNode = {
  id: "root", title: "پلتفرم بیزینس نگار آذین فدک ایران",
  children: [
    { id: "c1", title: "شرکت مادر", children: [
      { id: "c1-1", title: "دپارتمان فروش", children: [{ id: "c1-1-1", title: "واحد فروش آنلاین" }, { id: "c1-1-2", title: "واحد فروش حضوری" }] },
      { id: "c1-2", title: "دپارتمان مالی" },
      { id: "c1-3", title: "دپارتمان فناوری اطلاعات" },
    ]},
    { id: "c2", title: "شرکت زیرمجموعه یک", children: [{ id: "c2-1", title: "شعبه تهران" }, { id: "c2-2", title: "شعبه اصفهان" }] },
  ],
};

const TreeItem: React.FC<{ node: TreeNode; depth: number }> = ({ node, depth }) => (
  <div>
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-bg" style={{ paddingRight: depth * 20 }}>
      <span className="text-text-muted">{node.children ? "📂" : "📄"}</span>
      <span className="text-sm">{node.title}</span>
    </div>
    {node.children?.map((c) => <TreeItem key={c.id} node={c} depth={depth + 1} />)}
  </div>
);

export const OrgStructurePage = () => (
  <Shell>
    <PageHeader title="چارت سازمانی" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "مدیریت سازمان" }, { label: "چارت سازمانی" }]} />
    <Card><TreeItem node={orgTree} depth={0} /></Card>
  </Shell>
);
