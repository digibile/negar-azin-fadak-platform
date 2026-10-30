import React from "react";
import { Breadcrumb } from "../ui/Nav";

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  breadcrumb: { label: string; to?: string }[];
  actions?: React.ReactNode;
}> = ({ title, description, breadcrumb, actions }) => (
  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <Breadcrumb items={breadcrumb} />
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight md:text-[27px]">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-text-muted leading-relaxed max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
