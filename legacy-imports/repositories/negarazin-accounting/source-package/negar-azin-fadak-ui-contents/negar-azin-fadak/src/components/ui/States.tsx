import React from "react";
import { Button } from "./Button";

export const LoadingState: React.FC<{ label?: string }> = ({ label = "در حال بارگذاری اطلاعات..." }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
    <span className="h-9 w-9 rounded-full border-[3px] border-primary-100 border-t-primary-500 animate-spin" />
    <p className="text-sm">{label}</p>
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = "h-4 w-full" }) => (
  <div className={`animate-pulse rounded-md bg-border/70 ${className}`} />
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    ))}
  </div>
);

interface StateProps { title: string; description?: string; actionLabel?: string; onAction?: () => void; icon?: React.ReactNode; }

export const EmptyState: React.FC<StateProps> = ({ title, description, actionLabel, onAction, icon = "🗂️" }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="text-5xl">{icon}</div>
    <h3 className="text-base font-semibold">{title}</h3>
    {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
    {actionLabel && onAction && <Button size="sm" onClick={onAction}>{actionLabel}</Button>}
  </div>
);

export const ErrorState: React.FC<StateProps> = ({ title = "خطایی رخ داد", description = "دریافت اطلاعات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.", actionLabel = "تلاش مجدد", onAction, icon = "⚠️" }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="text-5xl">{icon}</div>
    <h3 className="text-base font-semibold text-danger-600">{title}</h3>
    <p className="max-w-sm text-sm text-text-muted">{description}</p>
    {onAction && <Button size="sm" variant="danger" onClick={onAction}>{actionLabel}</Button>}
  </div>
);

export const SuccessState: React.FC<StateProps> = ({ title, description, actionLabel, onAction, icon = "✅" }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="text-5xl">{icon}</div>
    <h3 className="text-base font-semibold text-success-600">{title}</h3>
    {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
    {actionLabel && onAction && <Button size="sm" variant="success" onClick={onAction}>{actionLabel}</Button>}
  </div>
);

export const PermissionDeniedState: React.FC = () => (
  <EmptyState icon="🔒" title="عدم دسترسی" description="شما مجوز لازم برای مشاهده این بخش را ندارید. در صورت نیاز با مدیر سیستم تماس بگیرید." />
);

export const NotFoundState: React.FC = () => (
  <EmptyState icon="🧭" title="صفحه یافت نشد" description="آیتم یا مسیر مورد نظر پیدا نشد. ممکن است حذف شده یا آدرس اشتباه باشد." />
);

export const OfflineBanner: React.FC = () => (
  <div className="flex items-center gap-2 rounded-md bg-warning-50 px-4 py-2 text-sm text-warning-600">
    <span>📡</span> ارتباط با سرور برقرار نیست — اطلاعات نمایشی ممکن است به‌روز نباشند.
  </div>
);
