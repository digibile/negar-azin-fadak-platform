import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { NotFoundState, PermissionDeniedState, OfflineBanner, LoadingState, ErrorState, SuccessState, EmptyState } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/Badge";

export const NotFoundPage = () => (
  <div className="grid min-h-screen place-items-center p-6" dir="rtl">
    <Card className="max-w-md text-center">
      <NotFoundState />
      <Link to="/"><Button>بازگشت به خانه</Button></Link>
    </Card>
  </div>
);

export const PermissionDeniedPage = () => (
  <div className="grid min-h-screen place-items-center p-6" dir="rtl">
    <Card className="max-w-md text-center">
      <PermissionDeniedState />
      <Link to="/master/dashboard"><Button variant="outline">بازگشت به داشبورد</Button></Link>
    </Card>
  </div>
);

/** ویترین نمایشی همه حالت‌های استاندارد UI — برای تیم توسعه و QA */
export const StatesShowcasePage = () => (
  <div className="min-h-screen bg-bg p-6" dir="rtl">
    <h1 className="mb-6 text-xl font-bold">ویترین حالت‌های سیستم (States Showcase)</h1>
    <div className="grid gap-4 md:grid-cols-2">
      <Card><h3 className="mb-2 text-sm font-bold">Loading</h3><LoadingState /></Card>
      <Card><h3 className="mb-2 text-sm font-bold">Empty</h3><EmptyState title="داده‌ای موجود نیست" description="هیچ رکوردی برای نمایش وجود ندارد." actionLabel="ایجاد جدید" onAction={() => {}} /></Card>
      <Card><h3 className="mb-2 text-sm font-bold">Error</h3><ErrorState title="خطایی رخ داد" onAction={() => {}} /></Card>
      <Card><h3 className="mb-2 text-sm font-bold">Success</h3><SuccessState title="عملیات با موفقیت انجام شد" /></Card>
      <Card><h3 className="mb-2 text-sm font-bold">Offline</h3><OfflineBanner /></Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Status Badges</h3>
        <div className="flex flex-wrap gap-2">
          {(["active", "inactive", "pending", "approved", "rejected", "processing", "draft"] as const).map((s) => <StatusBadge key={s} status={s} />)}
        </div>
      </Card>
    </div>
  </div>
);
