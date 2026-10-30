import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Public
import Home from "./pages/public/Home";
import {
  AboutPage, BrandsPage, StoresPage, CategoriesPage, ProductsPage, ProductDetailPage,
  FaqPage, ContactPage, TermsPage, SearchPage,
} from "./pages/public/Simple";

// Auth
import {
  LoginPage, MobileLoginPage, OtpPage, VerifyOtpPage, ForgotPasswordPage, ResetPasswordPage,
  ChangePasswordPage, MfaPage, SecurityVerificationPage, SessionManagementPage, LoginHistoryPage,
  LogoutPage, PortalSelectionPage,
} from "./pages/auth/AuthPages";

// Master portal
import { MasterDashboardPage, NotificationsPage, ProfilePage, AccountPage, SettingsPage } from "./pages/master/MasterPages";

// Organization
import {
  CompaniesPage, BranchesPage, BrandsMgmtPage, StoresMgmtPage, BusinessUnitsPage,
  DepartmentsPage, PositionsPage, EmployeesPage, OrgStructurePage,
} from "./pages/org/OrgPages";

// Menu / Template / Dashboard builder
import MenuManagerPage from "./pages/menu-manager/MenuManagerPage";
import { TemplateListPage, TemplateEditorPage, TemplateVersionsPage } from "./pages/template-manager/TemplateManagerPages";
import { DashboardListPage, DashboardBuilderPage } from "./pages/dashboard-builder/DashboardBuilderPages";

// Users / Roles
import { UsersListPage, RolesListPage, RoleDetailPage } from "./pages/users-roles/UsersRolesPages";

// Commerce / Inventory / Customers / Merchants / Suppliers
import { ProductsAdminPage, CategoriesAdminPage, OrdersAdminPage, OrderDetailPage, SalesDashboardPage, PurchasesAdminPage } from "./pages/commerce/CommercePages";
import { InventoryDashboardPage, WarehousesPage, StockMovementsPage, LowStockPage } from "./pages/inventory/InventoryPages";
import { CustomersListPage, CustomerDetailPage } from "./pages/customers/CustomersPages";
import MerchantsPage from "./pages/merchants/MerchantsPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";

// Credit / Loans / Finance / CRM
import CreditPage from "./pages/credit/CreditPage";
import LoansPage from "./pages/loans/LoansPage";
import { FinanceDashboardPage, BankAccountsPage, JournalPage } from "./pages/finance/FinancePages";
import CrmPage from "./pages/crm/CrmPage";

// Reports / Audit / Settings
import ReportsPage from "./pages/reports/ReportsPage";
import AuditPage from "./pages/audit/AuditPage";
import SettingsCenterPage from "./pages/settings/SettingsPages";

// Portals
import {
  FinancePortalDashboard, CreditPortalDashboard, CommercePortalDashboard,
  MerchantPortalDashboard, StorePortalDashboard, AccountingPortalDashboard,
} from "./pages/portals/PortalDashboards";

// Customer portal
import {
  ShopHomePage, ShopProfilePage, ShopOrdersPage, ShopOrderDetailPage, ShopProductDetailPage,
  ShopCartPage, ShopCheckoutPage, ShopPaymentPage, ShopCreditPage, ShopCreditApplyPage,
  ShopInstallmentsPage, ShopWalletPage, ShopNotificationsPage, ShopSupportPage,
} from "./pages/customer-portal/ShopPages";

// States
import { NotFoundPage, PermissionDeniedPage, StatesShowcasePage } from "./pages/states/StatePages";

export default function App() {
  return (
    <Routes>
      {/* ===== Public ===== */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/brands" element={<BrandsPage />} />
      <Route path="/stores" element={<StoresPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/search" element={<SearchPage />} />

      {/* ===== Auth ===== */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/mobile-login" element={<MobileLoginPage />} />
      <Route path="/auth/otp" element={<OtpPage />} />
      <Route path="/auth/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/change-password" element={<ChangePasswordPage />} />
      <Route path="/auth/mfa" element={<MfaPage />} />
      <Route path="/auth/security-verification" element={<SecurityVerificationPage />} />
      <Route path="/auth/sessions" element={<SessionManagementPage />} />
      <Route path="/auth/login-history" element={<LoginHistoryPage />} />
      <Route path="/auth/logout" element={<LogoutPage />} />
      <Route path="/auth/portal-selection" element={<PortalSelectionPage />} />

      {/* ===== Master portal ===== */}
      <Route path="/master/dashboard" element={<MasterDashboardPage />} />
      <Route path="/master/notifications" element={<NotificationsPage />} />
      <Route path="/master/profile" element={<ProfilePage />} />
      <Route path="/master/account" element={<AccountPage />} />
      <Route path="/master/settings" element={<SettingsPage />} />

      {/* ===== Organization ===== */}
      <Route path="/org/companies" element={<CompaniesPage />} />
      <Route path="/org/branches" element={<BranchesPage />} />
      <Route path="/org/brands" element={<BrandsMgmtPage />} />
      <Route path="/org/stores" element={<StoresMgmtPage />} />
      <Route path="/org/business-units" element={<BusinessUnitsPage />} />
      <Route path="/org/departments" element={<DepartmentsPage />} />
      <Route path="/org/positions" element={<PositionsPage />} />
      <Route path="/org/employees" element={<EmployeesPage />} />
      <Route path="/org/structure" element={<OrgStructurePage />} />

      {/* ===== Menu / Template / Dashboard management ===== */}
      <Route path="/menu-manager" element={<MenuManagerPage />} />
      <Route path="/template-manager" element={<TemplateListPage />} />
      <Route path="/template-manager/:id/edit" element={<TemplateEditorPage />} />
      <Route path="/template-manager/versions" element={<TemplateVersionsPage />} />
      <Route path="/dashboard-builder" element={<DashboardListPage />} />
      <Route path="/dashboard-builder/:id" element={<DashboardBuilderPage />} />

      {/* ===== Users / Roles ===== */}
      <Route path="/users-roles/users" element={<UsersListPage />} />
      <Route path="/users-roles/roles" element={<RolesListPage />} />
      <Route path="/users-roles/roles/:id" element={<RoleDetailPage />} />

      {/* ===== Commerce ===== */}
      <Route path="/commerce/products" element={<ProductsAdminPage />} />
      <Route path="/commerce/categories" element={<CategoriesAdminPage />} />
      <Route path="/commerce/orders" element={<OrdersAdminPage />} />
      <Route path="/commerce/orders/:id" element={<OrderDetailPage />} />
      <Route path="/commerce/sales" element={<SalesDashboardPage />} />
      <Route path="/commerce/purchases" element={<PurchasesAdminPage />} />

      {/* ===== Inventory ===== */}
      <Route path="/inventory" element={<InventoryDashboardPage />} />
      <Route path="/inventory/warehouses" element={<WarehousesPage />} />
      <Route path="/inventory/movements" element={<StockMovementsPage />} />
      <Route path="/inventory/low-stock" element={<LowStockPage />} />

      {/* ===== Customers / Merchants / Suppliers ===== */}
      <Route path="/customers" element={<CustomersListPage />} />
      <Route path="/customers/:id" element={<CustomerDetailPage />} />
      <Route path="/merchants" element={<MerchantsPage />} />
      <Route path="/suppliers" element={<SuppliersPage />} />

      {/* ===== Credit / Loans / Finance / CRM ===== */}
      <Route path="/credit" element={<CreditPage />} />
      <Route path="/loans" element={<LoansPage />} />
      <Route path="/finance" element={<FinanceDashboardPage />} />
      <Route path="/finance/bank-accounts" element={<BankAccountsPage />} />
      <Route path="/finance/journal" element={<JournalPage />} />
      <Route path="/crm" element={<CrmPage />} />

      {/* ===== Reports / Audit / Settings ===== */}
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/settings" element={<SettingsCenterPage />} />

      {/* ===== Portals ===== */}
      <Route path="/portals/finance" element={<FinancePortalDashboard />} />
      <Route path="/portals/credit" element={<CreditPortalDashboard />} />
      <Route path="/portals/commerce" element={<CommercePortalDashboard />} />
      <Route path="/portals/merchant" element={<MerchantPortalDashboard />} />
      <Route path="/portals/store" element={<StorePortalDashboard />} />
      <Route path="/portals/accounting" element={<AccountingPortalDashboard />} />

      {/* ===== Customer portal (Shop) ===== */}
      <Route path="/shop/home" element={<ShopHomePage />} />
      <Route path="/shop/profile" element={<ShopProfilePage />} />
      <Route path="/shop/orders" element={<ShopOrdersPage />} />
      <Route path="/shop/orders/:id" element={<ShopOrderDetailPage />} />
      <Route path="/shop/products/:id" element={<ShopProductDetailPage />} />
      <Route path="/shop/cart" element={<ShopCartPage />} />
      <Route path="/shop/checkout" element={<ShopCheckoutPage />} />
      <Route path="/shop/payment" element={<ShopPaymentPage />} />
      <Route path="/shop/credit" element={<ShopCreditPage />} />
      <Route path="/shop/credit/apply" element={<ShopCreditApplyPage />} />
      <Route path="/shop/installments" element={<ShopInstallmentsPage />} />
      <Route path="/shop/wallet" element={<ShopWalletPage />} />
      <Route path="/shop/notifications" element={<ShopNotificationsPage />} />
      <Route path="/shop/support" element={<ShopSupportPage />} />

      {/* ===== States / misc ===== */}
      <Route path="/permission-denied" element={<PermissionDeniedPage />} />
      <Route path="/states-showcase" element={<StatesShowcasePage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
