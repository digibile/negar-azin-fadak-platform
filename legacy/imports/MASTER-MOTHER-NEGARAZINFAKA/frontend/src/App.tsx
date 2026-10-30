import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SiteLayout } from './features/site/SiteLayout';
import { HomePage } from './features/site/HomePage';
import { ModulesPage } from './features/site/ModulesPage';
import { StatusPage } from './features/site/StatusPage';
import { LoginPage } from './features/site/LoginPage';
import { ManagementShell } from './features/management/ManagementShell';
import { DashboardPage } from './features/management/DashboardPage';
import { OperationsPage } from './features/management/OperationsPage';
import {
  AuditPage,
  AuthorizationAssignmentsPage,
  CustomersDossiersPage,
  CustomersLedgerPage,
  CustomersPage,
  CustomerPortalPage,
  IdentityDocumentsPage,
  IdentityDocumentTypesPage,
  IdentityDuplicatesPage,
  IdentityFoldersPage,
  IdentityOneTimeCodesPage,
  IdentityTimelinePage,
  IdentityVerificationPage,
  LandtechApplicantsPage,
  LandtechApplicationsPage,
  LandtechContractsPage,
  LandtechEligibilityPage,
  LandtechInstallmentsPage,
  LandtechLoansPage,
  LandTechPage,
  MarketplaceCategoriesPage,
  MarketplaceInventoryPage,
  MarketplaceListingsPage,
  MarketplaceOrdersPage,
  MarketplacePage,
  MarketplacePaymentsPage,
  NavigationBaseMenuPage,
  NavigationMenusPage,
  NavigationPage,
  OrganizationBranchesPage,
  OrganizationBrandsPage,
  OrganizationCompaniesPage,
  OrganizationLifecyclePage,
  OrganizationStoresPage,
  PermissionsPage,
  RolesPageFull,
  SellerPortalPage,
  SellersPage,
  SellersSettlementPage,
  SellersStoresPage,
  TenancyProvisioningPage,
  TenantConfigurationPage,
  TenantsPage,
  UsersPage,
} from './features/management/ManagementPages';

import './styles/base.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>

        <Route element={<ManagementShell />}>
          <Route path="management" element={<DashboardPage />} />
          <Route path="management/dashboard" element={<DashboardPage />} />
          <Route path="management/operations" element={<OperationsPage />} />
          <Route path="management/audit" element={<AuditPage />} />
          <Route path="management/users" element={<UsersPage />} />
          <Route path="management/identity/documents" element={<IdentityDocumentsPage />} />
          <Route path="management/identity/document-types" element={<IdentityDocumentTypesPage />} />
          <Route path="management/identity/folders" element={<IdentityFoldersPage />} />
          <Route path="management/identity/verification" element={<IdentityVerificationPage />} />
          <Route path="management/identity/duplicates" element={<IdentityDuplicatesPage />} />
          <Route path="management/identity/one-time-codes" element={<IdentityOneTimeCodesPage />} />
          <Route path="management/identity/timeline" element={<IdentityTimelinePage />} />
          <Route path="management/organization/companies" element={<OrganizationCompaniesPage />} />
          <Route path="management/organization/brands" element={<OrganizationBrandsPage />} />
          <Route path="management/organization/branches" element={<OrganizationBranchesPage />} />
          <Route path="management/organization/stores" element={<OrganizationStoresPage />} />
          <Route path="management/organization/lifecycle" element={<OrganizationLifecyclePage />} />
          <Route path="management/customers" element={<CustomersPage />} />
          <Route path="management/customers/dossiers" element={<CustomersDossiersPage />} />
          <Route path="management/customers/ledger" element={<CustomersLedgerPage />} />
          <Route path="management/sellers" element={<SellersPage />} />
          <Route path="management/sellers/stores" element={<SellersStoresPage />} />
          <Route path="management/sellers/settlement" element={<SellersSettlementPage />} />
          <Route path="management/roles" element={<RolesPageFull />} />
          <Route path="management/permissions" element={<PermissionsPage />} />
          <Route path="management/authorization/assignments" element={<AuthorizationAssignmentsPage />} />
          <Route path="management/navigation" element={<NavigationPage />} />
          <Route path="management/navigation/menus" element={<NavigationMenusPage />} />
          <Route path="management/navigation/base-menu" element={<NavigationBaseMenuPage />} />
          <Route path="management/tenant/configuration" element={<TenantConfigurationPage />} />
          <Route path="management/tenants" element={<TenantsPage />} />
          <Route path="management/tenancy/provisioning" element={<TenancyProvisioningPage />} />
          <Route path="management/marketplace" element={<MarketplacePage />} />
          <Route path="management/marketplace/listings" element={<MarketplaceListingsPage />} />
          <Route path="management/marketplace/categories" element={<MarketplaceCategoriesPage />} />
          <Route path="management/marketplace/inventory" element={<MarketplaceInventoryPage />} />
          <Route path="management/marketplace/orders" element={<MarketplaceOrdersPage />} />
          <Route path="management/marketplace/payments" element={<MarketplacePaymentsPage />} />
          <Route path="management/landtech" element={<LandTechPage />} />
          <Route path="management/landtech/applicants" element={<LandtechApplicantsPage />} />
          <Route path="management/landtech/applications" element={<LandtechApplicationsPage />} />
          <Route path="management/landtech/eligibility" element={<LandtechEligibilityPage />} />
          <Route path="management/landtech/loans" element={<LandtechLoansPage />} />
          <Route path="management/landtech/installments" element={<LandtechInstallmentsPage />} />
          <Route path="management/landtech/contracts" element={<LandtechContractsPage />} />
          <Route path="management/customer-portal" element={<CustomerPortalPage />} />
          <Route path="management/seller-portal" element={<SellerPortalPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
