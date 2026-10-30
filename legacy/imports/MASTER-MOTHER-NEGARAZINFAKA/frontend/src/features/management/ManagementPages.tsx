import type { ReactNode } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { ModuleContractPanel } from '../catalog/ModuleCards';
import { MODULE_DEFINITIONS } from '../catalog/modules';
import {
  CurrentPermissionsPanel,
  DomainGap,
  IdentityPanel,
  RolesPanel,
  TenantConfigurationPanel,
  UnitsPanel,
} from './panels';

/**
 * The module screens.
 *
 * Each one shows the real routes the host publishes for it, then the contracts it is still missing. A screen
 * whose domain does not exist in the platform's model says so and stops — no invented rows anywhere.
 */

interface ModuleScreenProps {
  readonly title: string;
  readonly lead: string;
  readonly to: string;
  readonly children?: ReactNode;
}

function ModuleScreen({ title, lead, to, children }: ModuleScreenProps) {
  return (
    <div className="stack stack--loose">
      <PageHeader title={title} lead={lead} />
      {children}
      <ModuleContractPanel to={to} />
    </div>
  );
}

/** Looks up a module's own `needs` list, so the gap screens and the contract panel cannot disagree. */
function needsOf(to: string) {
  const definition = MODULE_DEFINITIONS.find((module) => module.to === to);
  return definition?.needs ?? [];
}

/* ---------- the management centre ---------- */

/* ---------- users ---------- */

export function UsersPage() {
  return (
    <ModuleScreen
      to="/management/users"
      title="کاربران"
      lead="کاربران، نمایندگان و کارکنان همگی روی یک هویت مرکزی ثبت می‌شوند. آنچه امروز قابل خواندن است، هویت کاربر جاری از مسیر واقعی است؛ فهرست کامل کاربران هنوز روی پلتفرم منتشر نشده و به‌جای آن جدول ساختگی نشان داده نمی‌شود."
    >
      <div className="portal__grid">
        <IdentityPanel />
        <CurrentPermissionsPanel />
      </div>
    </ModuleScreen>
  );
}

/* ---------- customers: no platform contract ---------- */

export function CustomersPage() {
  return (
    <ModuleScreen
      to="/management/customers"
      title="مشتریان"
      lead="پرونده مشتری روی هویت مرکزی سوار است و اسنادش تنها پس از راستی‌آزمایی به داده اصلی تبدیل می‌شود."
    >
      <DomainGap
        title="دامنه مشتری روی پلتفرم مدل نشده است"
        purpose="هیچ نوع داده، جدول یا مسیری برای مشتری در مدل داده پلتفرم وجود ندارد. هر آنچه اینجا نیست، به‌جای ساخت یک پیاده‌سازی موازی، باید به هویت مرکزی متصل شود."
        needed={needsOf('/management/customers')}
        present={['GET /api/v1/me — هویت مرکزی کاربر جاری']}
      />
    </ModuleScreen>
  );
}

/* ---------- sellers: roles are real, the seller entity is not ---------- */

export function SellersPage() {
  return (
    <ModuleScreen
      to="/management/sellers"
      title="فروشندگان"
      lead="نقش‌های واقعی پلتفرم خوانده می‌شوند، چون نقش فروشنده یک نقش سازمانی است و از مسیر واقعی می‌آید. خودِ موجودیت فروشنده هنوز در مدل داده پلتفرم تعریف نشده است."
    >
      <RolesPanel />
    </ModuleScreen>
  );
}

/* ---------- marketplace: stores are real, catalogue and orders are not ---------- */

export function MarketplacePage() {
  return (
    <ModuleScreen
      to="/management/marketplace"
      title="بازارگاه"
      lead="فروشگاه‌های واقعی از مسیر سازمانی خوانده می‌شوند، چون فروشگاه یک واحد سازمانی است و پرچم خرده‌فروشی را از همان‌جا می‌گیرد. کالا، دسته‌بندی، موجودی، سفارش و پرداخت هنوز در مدل داده پلتفرم وجود ندارند."
    >
      <UnitsPanel level="store" />
      <DomainGap
        title="کاتالوگ، سفارش و تسویه روی پلتفرم مدل نشده است"
        purpose="این دامنه‌ها به هویت مرکزی و به فروشگاه گره می‌خورند، ولی هیچ نوع داده یا مسیری برای آن‌ها وجود ندارد. تا آن زمان هیچ کالا، سفارش یا مبلغی نمایش داده نمی‌شود."
        needed={needsOf('/management/marketplace')}
        present={['GET /api/v1/organization/units/store — فروشگاه‌های واقعی با پرچم خرده‌فروشی']}
      />
    </ModuleScreen>
  );
}

/* ---------- customer portal ---------- */

export function CustomerPortalPage() {
  return (
    <ModuleScreen
      to="/management/customer-portal"
      title="پنل مشتری"
      lead="هویت و دامنه دسترسی کاربر جاری از سرویس واقعی خوانده می‌شود. سفارش، پرداخت و مانده حساب مشتری هنوز قرارداد ندارد."
    >
      <div className="portal__grid">
        <IdentityPanel />
        <TenantConfigurationPanel />
      </div>
    </ModuleScreen>
  );
}

/* ---------- seller portal ---------- */

export function SellerPortalPage() {
  return (
    <ModuleScreen
      to="/management/seller-portal"
      title="پنل فروشنده"
      lead="دامنه دسترسی و نقش فروشنده از سرویس واقعی خوانده می‌شود. فروش، پورسانت، موجودی و تسویه هنوز در پلتفرم تعریف نشده‌اند."
    >
      <div className="portal__grid">
        <IdentityPanel />
        <RolesPanel />
      </div>
    </ModuleScreen>
  );
}

/* ---------- landtech: nothing exists ---------- */

export function LandTechPage() {
  return (
    <ModuleScreen
      to="/management/landtech"
      title="لندتک"
      lead="متقاضی، درخواست، اعتبارسنجی، وام، قسط، پرداخت و قرارداد؛ هیچ‌کدام هنوز در مدل داده پلتفرم وجود ندارند و بنابراین هیچ عددی نمایش داده نمی‌شود."
    >
      <DomainGap
        title="دامنه اعتبار و خدمات فناوری روی پلتفرم مدل نشده است"
        purpose="متقاضی، درخواست، اعتبارسنجی، وام، قسط، پرداخت و قرارداد هیچ‌کدام در مدل داده پلتفرم وجود ندارند. هیچ رقم، امتیاز یا وضعیت اعتباری نمایش داده نمی‌شود، چون سرویسی پشت آن نیست."
        needed={needsOf('/management/landtech')}
        present={[]}
      />
    </ModuleScreen>
  );
}

export function AuditPage() {
  return (
    <ModuleScreen to="/management/audit" title="رد ممیزی" lead="رد ممیزی سازمان در حال آماده‌سازی است.">
      <DomainGap title="رد ممیزی" purpose="نمایش وقایع و ردپاهای حساس نیازمند قرارداد سرویس دارد." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function AuthorizationAssignmentsPage() {
  return (
    <ModuleScreen to="/management/authorization/assignments" title="انتساب نقش‌ها" lead="مدیریت انتساب نقش به کاربران.">
      <DomainGap title="انتساب نقش‌ها" purpose="این قابلیت در مدل داده کامل نشده است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function CustomersDossiersPage() {
  return (
    <ModuleScreen to="/management/customers/dossiers" title="پرونده مشتریان" lead="پرونده و اسناد مشتریان.">
      <DomainGap title="پرونده مشتریان" purpose="نیازمند قرارداد سرویس هویت و اسناد است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function CustomersLedgerPage() {
  return (
    <ModuleScreen to="/management/customers/ledger" title="مانده حساب مشتری" lead="مانده و تراکنش‌های مشتری.">
      <DomainGap title="مانده حساب مشتری" purpose="در مدل داده پلتفرم تعریف نشده است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function IdentityDocumentsPage() {
  return (
    <ModuleScreen to="/management/identity/documents" title="اسناد هویتی" lead="مدیریت اسناد هویتی.">
      <IdentityPanel />
    </ModuleScreen>
  );
}

export function IdentityDocumentTypesPage() {
  return (
    <ModuleScreen to="/management/identity/document-types" title="انواع سند" lead="انواع اسناد هویتی.">
      <DomainGap title="انواع سند" purpose="قرارداد سرویس لازم را ندارد." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function IdentityDuplicatesPage() {
  return (
    <ModuleScreen to="/management/identity/duplicates" title="هویت‌های تکراری" lead="تشخیص و مدیریت هویت‌های تکراری.">
      <DomainGap title="هویت‌های تکراری" purpose="نیازمند الگوریتم تشخیص تکراری است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function IdentityFoldersPage() {
  return (
    <ModuleScreen to="/management/identity/folders" title="پوشه‌های دیجیتال" lead="پوشه‌های اسناد دیجیتال.">
      <DomainGap title="پوشه‌های دیجیتال" purpose="قرارداد سرویس ندارد." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function IdentityOneTimeCodesPage() {
  return (
    <ModuleScreen to="/management/identity/one-time-codes" title="کدهای یک‌بارمصرف" lead="مدیریت کدهای یک‌بارمصرف.">
      <DomainGap title="کدهای یک‌بارمصرف" purpose="قرارداد سرویس ندارد." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function IdentityTimelinePage() {
  return (
    <ModuleScreen to="/management/identity/timeline" title="رویدادهای کاربر" lead="تایم‌لاین رویدادهای هویت.">
      <DomainGap title="رویدادهای کاربر" purpose="قرارداد سرویس ندارد." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function IdentityVerificationPage() {
  return (
    <ModuleScreen to="/management/identity/verification" title="راستی‌آزمایی هویت" lead="فرآیند راستی‌آزمایی اسناد و هویت.">
      <DomainGap title="راستی‌آزمایی هویت" purpose="نیازمند قرارداد سرویس راستی‌آزمایی است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function LandtechApplicantsPage() {
  return (
    <ModuleScreen to="/management/landtech/applicants" title="متقاضیان لندتک" lead="متقاضیان خدمات اعتباری.">
      <DomainGap title="متقاضیان لندتک" purpose="دامنه لندتک هنوز مدل نشده است." needed={needsOf('/management/landtech')} present={[]} />
    </ModuleScreen>
  );
}

export function LandtechApplicationsPage() {
  return (
    <ModuleScreen to="/management/landtech/applications" title="درخواست‌های لندتک" lead="درخواست‌های اعتبارسنجی و وام.">
      <DomainGap title="درخواست‌های لندتک" purpose="دامنه لندتک هنوز مدل نشده است." needed={needsOf('/management/landtech')} present={[]} />
    </ModuleScreen>
  );
}

export function LandtechContractsPage() {
  return (
    <ModuleScreen to="/management/landtech/contracts" title="قراردادهای لندتک" lead="قراردادهای وام و خدمات.">
      <DomainGap title="قراردادهای لندتک" purpose="دامنه لندتک هنوز مدل نشده است." needed={needsOf('/management/landtech')} present={[]} />
    </ModuleScreen>
  );
}

export function LandtechEligibilityPage() {
  return (
    <ModuleScreen to="/management/landtech/eligibility" title="اعتبارسنجی لندتک" lead="نتایج اعتبارسنجی.">
      <DomainGap title="اعتبارسنجی لندتک" purpose="دامنه لندتک هنوز مدل نشده است." needed={needsOf('/management/landtech')} present={[]} />
    </ModuleScreen>
  );
}

export function LandtechInstallmentsPage() {
  return (
    <ModuleScreen to="/management/landtech/installments" title="اقساط لندتک" lead="برنامه و وضعیت اقساط.">
      <DomainGap title="اقساط لندتک" purpose="دامنه لندتک هنوز مدل نشده است." needed={needsOf('/management/landtech')} present={[]} />
    </ModuleScreen>
  );
}

export function LandtechLoansPage() {
  return (
    <ModuleScreen to="/management/landtech/loans" title="وام‌های لندتک" lead="وام‌های صادرشده.">
      <DomainGap title="وام‌های لندتک" purpose="دامنه لندتک هنوز مدل نشده است." needed={needsOf('/management/landtech')} present={[]} />
    </ModuleScreen>
  );
}

export function MarketplaceCategoriesPage() {
  return (
    <ModuleScreen to="/management/marketplace/categories" title="دسته‌بندی‌های بازارگاه" lead="مدیریت دسته‌بندی‌ها.">
      <DomainGap title="دسته‌بندی‌های بازارگاه" purpose="دامنه بازارگاه مدل نشده است." needed={needsOf('/management/marketplace')} present={[]} />
    </ModuleScreen>
  );
}

export function MarketplaceInventoryPage() {
  return (
    <ModuleScreen to="/management/marketplace/inventory" title="موجودی بازارگاه" lead="مدیریت موجودی کالاها.">
      <DomainGap title="موجودی بازارگاه" purpose="دامنه بازارگاه مدل نشده است." needed={needsOf('/management/marketplace')} present={[]} />
    </ModuleScreen>
  );
}

export function MarketplaceListingsPage() {
  return (
    <ModuleScreen to="/management/marketplace/listings" title="کاتالوگ بازارگاه" lead="مدیریت آگهی‌ها و کالاها.">
      <DomainGap title="کاتالوگ بازارگاه" purpose="دامنه بازارگاه مدل نشده است." needed={needsOf('/management/marketplace')} present={[]} />
    </ModuleScreen>
  );
}

export function MarketplaceOrdersPage() {
  return (
    <ModuleScreen to="/management/marketplace/orders" title="سفارش‌های بازارگاه" lead="مدیریت سفارش‌ها.">
      <DomainGap title="سفارش‌های بازارگاه" purpose="دامنه بازارگاه مدل نشده است." needed={needsOf('/management/marketplace')} present={[]} />
    </ModuleScreen>
  );
}

export function MarketplacePaymentsPage() {
  return (
    <ModuleScreen to="/management/marketplace/payments" title="پرداخت‌های بازارگاه" lead="پرداخت‌ها و تسویه.">
      <DomainGap title="پرداخت‌های بازارگاه" purpose="دامنه بازارگاه مدل نشده است." needed={needsOf('/management/marketplace')} present={[]} />
    </ModuleScreen>
  );
}

export function NavigationPage() {
  return (
    <ModuleScreen to="/management/navigation" title="مدیریت منو" lead="ساختار و انتشار منو.">
      <DomainGap title="مدیریت منو" purpose="قرارداد سرویس منو موجود است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function NavigationBaseMenuPage() {
  return (
    <ModuleScreen to="/management/navigation/base-menu" title="انتشار منوی پایه" lead="انتشار و بازنشر ساختار پایه منو.">
      <DomainGap title="انتشار منوی پایه" purpose="قرارداد سرویس منو موجود است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function NavigationMenusPage() {
  return (
    <ModuleScreen to="/management/navigation/menus" title="ساختار منو" lead="مرور و ویرایش ساختار منو.">
      <DomainGap title="ساختار منو" purpose="قرارداد سرویس منو موجود است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function OrganizationBranchesPage() {
  return (
    <ModuleScreen to="/management/organization/branches" title="شعب سازمانی" lead="مدیریت شعب.">
      <UnitsPanel level="branch" />
    </ModuleScreen>
  );
}

export function OrganizationBrandsPage() {
  return (
    <ModuleScreen to="/management/organization/brands" title="برندهای سازمانی" lead="مدیریت برندها.">
      <UnitsPanel level="brand" />
    </ModuleScreen>
  );
}

export function OrganizationCompaniesPage() {
  return (
    <ModuleScreen to="/management/organization/companies" title="شرکت‌ها" lead="مدیریت شرکت‌ها.">
      <UnitsPanel level="company" />
    </ModuleScreen>
  );
}

export function OrganizationLifecyclePage() {
  return (
    <ModuleScreen to="/management/organization/lifecycle" title="چرخه حیات واحدهای سازمانی" lead="فعال‌سازی و تعلیق واحدها.">
      <UnitsPanel level="company" />
    </ModuleScreen>
  );
}

export function OrganizationStoresPage() {
  return (
    <ModuleScreen to="/management/organization/stores" title="فروشگاه‌های سازمانی" lead="مدیریت فروشگاه‌ها.">
      <UnitsPanel level="store" />
    </ModuleScreen>
  );
}

export function PermissionsPage() {
  return (
    <ModuleScreen to="/management/permissions" title="کاتالوگ مجوزها" lead="مرور کاتالوگ مجوزهای پلتفرم.">
      <DomainGap title="کاتالوگ مجوزها" purpose="قرارداد سرویس مجوز موجود است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function RolesPageFull() {
  return (
    <ModuleScreen to="/management/roles" title="نقش‌ها" lead="مدیریت نقش‌ها و سطوح دسترسی.">
      <RolesPanel />
    </ModuleScreen>
  );
}

export function SellersSettlementPage() {
  return (
    <ModuleScreen to="/management/sellers/settlement" title="تسویه فروشندگان" lead="تسویه حساب فروشندگان.">
      <DomainGap title="تسویه فروشندگان" purpose="دامنه تسویه مدل نشده است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function SellersStoresPage() {
  return (
    <ModuleScreen to="/management/sellers/stores" title="فروشگاه‌های فروشندگان" lead="ارتباط فروشندگان با فروشگاه‌ها.">
      <UnitsPanel level="store" />
    </ModuleScreen>
  );
}

export function TenancyProvisioningPage() {
  return (
    <ModuleScreen to="/management/tenancy/provisioning" title="راه‌اندازی مستأجر" lead="فرآیند راه‌اندازی مستأجر جدید.">
      <DomainGap title="راه‌اندازی مستأجر" purpose="قرارداد سرویس مستأجر موجود است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}

export function TenantConfigurationPage() {
  return (
    <ModuleScreen to="/management/tenant/configuration" title="پیکربندی مستأجر" lead="تنظیمات و پیکربندی سازمان.">
      <TenantConfigurationPanel />
    </ModuleScreen>
  );
}

export function TenantsPage() {
  return (
    <ModuleScreen to="/management/tenants" title="مستأجران" lead="مدیریت مستأجران پلتفرم.">
      <DomainGap title="مستأجران" purpose="قرارداد سرویس مستأجر موجود است." needed={[]} present={[]} />
    </ModuleScreen>
  );
}
