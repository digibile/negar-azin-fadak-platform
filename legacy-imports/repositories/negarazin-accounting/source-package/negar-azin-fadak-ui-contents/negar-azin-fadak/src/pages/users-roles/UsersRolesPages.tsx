import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { adminNav } from "../../components/layout/nav.config";
import { EntityListPage } from "../../components/patterns/EntityListPage";
import { PageHeader } from "../../components/patterns/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Misc";
import { Checkbox } from "../../components/ui/Form";
import { users, roles, permissionModules, permissionActions } from "../../mock/users";
import { useToast } from "../../components/ui/Toast";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppShell nav={adminNav} portalLabel="مرکز مدیریت نگار آذین فدک">{children}</AppShell>
);

export const UsersListPage = () => (
  <Shell>
    <EntityListPage
      title="کاربران سازمانی" entityLabel="کاربر"
      breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "کاربران و نقش‌ها" }, { label: "کاربران" }]}
      source={users}
      columns={[
        { key: "title", label: "کاربر", render: (r) => <div className="flex items-center gap-2"><Avatar name={r.title} size={28} /><span>{r.title}</span></div> },
        { key: "subtitle", label: "ایمیل" },
        { key: "status", label: "وضعیت", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      filters={[{ key: "status", label: "وضعیت", type: "status", options: [{ label: "فعال", value: "active" }, { label: "غیرفعال", value: "inactive" }] }]}
      createLabel="افزودن کاربر"
      onRowClick={() => {}}
    />
  </Shell>
);

export const RolesListPage = () => {
  const { push } = useToast();
  return (
    <Shell>
      <PageHeader title="نقش‌ها و دسترسی‌ها" breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "کاربران و نقش‌ها" }, { label: "نقش‌ها" }]}
        actions={<Button icon="＋" onClick={() => push("info", "ایجاد نقش جدید (نمایشی).")}>نقش جدید</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{r.title}</p>
              <Badge color="primary">{r.usersCount} کاربر</Badge>
            </div>
            <p className="text-xs text-text-muted leading-6">{r.description}</p>
            <Link to={`/users-roles/roles/${r.id}`}><Button size="sm" variant="outline" fullWidth>مدیریت دسترسی‌ها</Button></Link>
          </Card>
        ))}
      </div>
    </Shell>
  );
};

export const RoleDetailPage = () => {
  const { id } = useParams();
  const role = roles.find((r) => r.id === id) ?? roles[0];
  const { push } = useToast();
  return (
    <Shell>
      <PageHeader title={`دسترسی‌های نقش: ${role.title}`} breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "کاربران و نقش‌ها" }, { label: "نقش‌ها", to: "/users-roles/roles" }, { label: role.title }]}
        actions={<Button variant="success" onClick={() => push("success", "دسترسی‌های نقش ذخیره شد.")}>ذخیره دسترسی‌ها</Button>}
      />
      <Card padded={false} className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/60">
              <th className="px-4 py-3 text-right font-medium text-text-muted">ماژول</th>
              {permissionActions.map((a) => <th key={a} className="px-3 py-3 text-center text-xs font-medium text-text-muted">{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {permissionModules.map((m) => (
              <tr key={m.key} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 font-medium">{m.label}</td>
                {permissionActions.map((a) => (
                  <td key={a} className="px-3 py-3 text-center">
                    <Checkbox defaultChecked={a === "مشاهده"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-bold">دسترسی به منوها</h3>
          <div className="flex flex-col gap-2">
            {["مدیریت سازمان", "تجارت", "اعتبار و تسهیلات", "گزارش‌ها", "تنظیمات"].map((m) => <Checkbox key={m} label={m} defaultChecked />)}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-bold">دسترسی به داشبوردها</h3>
          <div className="flex flex-col gap-2">
            {["داشبورد مدیریت ارشد", "داشبورد مالی", "داشبورد فروش"].map((m) => <Checkbox key={m} label={m} defaultChecked={m !== "داشبورد فروش"} />)}
          </div>
        </Card>
      </div>
    </Shell>
  );
};
