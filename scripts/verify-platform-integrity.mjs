import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const migration=fs.readFileSync(path.join(root,"database/migrations/005_module_registry.sql"),"utf8");
const storage=fs.readFileSync(path.join(root,"database/migrations/008_all_45_module_storage.sql"),"utf8");
const runtime=fs.readFileSync(path.join(root,"database/migrations/009_activate_45_module_runtime.sql"),"utf8");
const server=fs.readFileSync(path.join(root,"apps/api/src/server.ts"),"utf8");
const command=fs.readFileSync(path.join(root,"apps/api/src/domain-command-platform.ts"),"utf8");
const stage1927=fs.readFileSync(path.join(root,"database/migrations/012_stage_19_27_operational.sql"),"utf8");
const commerce=fs.readFileSync(path.join(root,"apps/api/src/domain-commerce.ts"),"utf8");
const communication=fs.readFileSync(path.join(root,"apps/api/src/domain-communication.ts"),"utf8");
const operationsPage=fs.readFileSync(path.join(root,"apps/web/app/operations/page.tsx"),"utf8");
const stage2835=fs.readFileSync(path.join(root,"database/migrations/013_stage_28_35_operational.sql"),"utf8");
const stage3645=fs.readFileSync(path.join(root,"database/migrations/014_stage_36_45_operational.sql"),"utf8");
const organization=fs.readFileSync(path.join(root,"apps/api/src/domain-organization.ts"),"utf8");
const commandPage=fs.readFileSync(path.join(root,"apps/web/app/command-center/page.tsx"),"utf8");
const masterMenu=fs.readFileSync(path.join(root,"apps/web/app/admin/master-menu.ts"),"utf8");
const sidebar=fs.readFileSync(path.join(root,"apps/web/app/admin/AdminSidebar.tsx"),"utf8");
const modulePage=fs.readFileSync(path.join(root,"apps/web/app/modules/page.tsx"),"utf8");

const expected=[
"governance","identity","master-data","customer-360","smart-calendar","business-rules","sla",
"accounting-finance","treasury-bank","wallet-ledger","credit-facilities","credit-scoring","loans-contracts","installments","collections",
"sales-trade","marketplace","delivery-logistics","commission","settlement","payments","providers-integrations",
"communications","events-notifications","crm","contact-center","tickets-support",
"documents-office","digital-binder","web-domain","page-builder","form-builder","content-management","negar-ai",
"human-resources","projects-operations","reports-analytics",
"command-center","monitoring-events","audit-control","documentation","api-integration","infrastructure-data","mobile-app","quality-lifecycle"
];

const missing=expected.filter(x=>!migration.includes("'"+x+"'")&&!migration.includes('"'+x+'"'));
if(missing.length)throw new Error("Module registry missing: "+missing.join(", "));
for(const table of ["command_actions","monitoring_events","audit_events","documents","api_clients","data_sources","mobile_devices","quality_checks"]){
 if(!storage.includes("create table if not exists "+table))throw new Error("Storage table missing: "+table);
}
if(!runtime.includes("update module_runtime")||!runtime.includes("lifecycle='active'"))throw new Error("Runtime activation statement missing");
for(const code of ["command-center","monitoring-events","audit-control","documentation","api-integration","infrastructure-data","mobile-app","quality-lifecycle"]){
 if(!command.includes('"'+code+'"'))throw new Error("Command router missing: "+code);
}
if(!server.includes('domainCommandPlatformRouter'))throw new Error("Command router is not mounted");
for(const code of ["commission","settlement","payments","providers-integrations","communications","events-notifications","crm","contact-center","tickets-support"]){
 if(!migration.includes("'"+code+"'"))throw new Error("Stage 19-27 registry missing: "+code);
}
if(!stage1927.includes("idx_commission_rules_rate")||!stage1927.includes("idx_payments_method_updated"))throw new Error("Stage 19-27 operational migration incomplete");
if(!commerce.includes("pagination")||!communication.includes("pagination"))throw new Error("Stage 19-27 API pagination missing");
if(!stage2835.includes("idx_employees_department_updated")||!stage2835.includes("idx_projects_status_updated"))throw new Error("Stage 28-35 operational migration incomplete");
if(!organization.includes("pagination"))throw new Error("Stage 36-37 API pagination missing");
if(!command.includes("pagination"))throw new Error("Stage 38-45 API pagination missing");
for(const marker of ["idx_command_actions_type_updated","idx_monitoring_events_severity_time","idx_audit_events_entity_time","idx_api_clients_updated","idx_data_sources_type_updated","idx_mobile_devices_platform_updated","idx_quality_checks_score"])if(!stage3645.includes(marker))throw new Error("Stage 36-45 operational migration incomplete: "+marker);
if(!commandPage.includes("/api/domain/monitoring-events")||!commandPage.includes("/api/domain/command-center"))throw new Error("Stage 38-45 command center missing");
if(!operationsPage.includes('const target=[')||!operationsPage.includes('مرکز عملیات ۱۹ تا ۲۷'))throw new Error("Stage 19-27 operations page missing");
const forbidden=new RegExp("(^|[^A-Za-z])"+String.fromCharCode(69,82,80)+"([^A-Za-z]|$)","i");
for(const file of [migration,storage,runtime,stage1927,stage2835,stage3645,server,command,commerce,communication,organization,operationsPage,commandPage,masterMenu,sidebar])if(forbidden.test(file))throw new Error("Forbidden terminology detected");
for(const [index,item] of [...masterMenu.matchAll(/\{code:"([^"]+)",number:"([0-9]{2})",title:"([^"]+)"[^\n]*children:\[/g)].entries())if(!item[1]||!item[3])throw new Error("Canonical panel has a missing code or title at index "+index);
const panelEntries=[...masterMenu.matchAll(/code:"([^"]+)",number:"([0-9]{2})",title:/g)];
if(panelEntries.length!==20)throw new Error("Master menu must contain exactly 20 canonical panels; found "+panelEntries.length);
const panelRoutes=[...masterMenu.matchAll(/code:"([^"]+)",number:"([0-9]{2})",title:"([^"]+)"[^}]*route:"([^"]+)"/g)];
if(panelRoutes.length!==20)throw new Error("All 20 canonical panels must define a route; found "+panelRoutes.length);
if(new Set(panelRoutes.map(x=>x[1])).size!==20)throw new Error("Canonical panel route codes must be unique");
if(panelRoutes.some(x=>!x[4].startsWith("/")))throw new Error("Canonical panel route must be an internal application path");
const panelNumbers=panelEntries.map(x=>x[2]);
if(new Set(panelNumbers).size!==20||panelNumbers.some((x,i)=>x!==String(i+1).padStart(2,"0")))throw new Error("Canonical panel numbers must be unique and ordered 01-20");
if(new Set(panelEntries.map(x=>x[1])).size!==20)throw new Error("Canonical panel codes must be unique");
const panelObjects=masterMenu.split("\n").flatMap(line=>{
 const head=line.match(/\{code:"([^"]+)",number:"([0-9]{2})",title:"([^"]+)"/);
 if(!head||!line.includes("children:["))return [];
 const start=line.indexOf("children:[")+"children:[".length;
 const end=line.lastIndexOf("]");
 if(end<start)return [];
 return [[head[0],head[1],head[2],head[3],line.slice(start,end)]];
});
if(panelObjects.length!==20)throw new Error("All 20 canonical panels must have a readable child list");
const canonicalChildTitles=panelObjects.flatMap(panel=>[...panel[4].matchAll(/child\("([^"]+)"/g)].map(match=>({title:match[1],panel:panel[2]})));
const duplicateChildTitles=[...canonicalChildTitles.reduce((map,item)=>map.set(item.title,[...(map.get(item.title)||[]),item.panel]),new Map())].filter(([,panels])=>panels.length>1);
if(duplicateChildTitles.length)throw new Error("Duplicate canonical child titles must be merged into one destination: "+duplicateChildTitles.map(([title,panels])=>title+" (panels "+panels.join(", ")+")").join("; "));
for(const panel of panelObjects){
 const children=[...panel[4].matchAll(/child\("([^"]+)"(?:,\s*(?:"([^"]*)"|undefined))?(?:,\s*(?:"([^"]*)"|undefined))?(?:,\s*"([^"]*)")?\)/g)];
 if(children.length===0)throw new Error("Canonical panel has no children: "+panel[1]);
 for(const child of children){
  if(!child[1].trim())throw new Error("Canonical child title is empty in panel "+panel[1]);
  if(!child[2]&&!child[3])throw new Error("Canonical child has no destination mapping: "+panel[1]+" / "+child[1]);
 }
}

const expectedLegacyCodes=[
"02-organizations","02-identity","03-users-access","04-customers-360","05-smart-calendar","06-business-rules","07-sla",
"08-accounting-finance","08-check-documents","09-commerce-stores","10-wallet-ledger","12-logistics-supply",
"14-form-builder","15-menu-builder","16-page-builder","17-frontend-management","18-notifications","19-documents-governance","20-system-settings",
"21-purchasing-supply","22-sales-revenue","23-inventory-warehouse","24-production","25-costing","26-treasury-bank","27-receivables","28-payables",
"29-wallet-ledger","30-projects-cost-centers","31-fixed-assets","32-tax-e-invoicing","33-budget-financial-control","34-financial-commitments",
"35-credit-financing","36-loans","37-collateral-guarantees","38-collections","39-human-resources","40-ai-finance","41-ai-documents-ocr",
"42-audit-internal-control","43-communication-hub","44-marketing-content","45-search-analytics","46-unified-applications","47-contracts-legal",
"48-shipping-delivery","49-reconciliation","50-release-health"
];
const missingLegacy=expectedLegacyCodes.filter(code=>!masterMenu.includes('"'+code+'"'));
if(missingLegacy.length)throw new Error("Legacy menu codes missing from canonical panels: "+missingLegacy.join(", "));
const workspaceBlock=modulePage.match(/const WORKSPACE_REGISTRY\s*:\s*Record<string,\s*React\.ReactNode>\s*=\s*\{([\s\S]*?)\n\};/);
const landingBlock=modulePage.match(/const CANONICAL_LANDING_CODES\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
if(!workspaceBlock||!landingBlock)throw new Error("Unified module workspace registry could not be parsed");
if(modulePage.includes("CANONICAL_WORKSPACES")||modulePage.includes("GENERIC_OPERATIONAL_WORKSPACES")||modulePage.includes("const canonicalCodes"))throw new Error("Duplicate module dispatcher registries must be removed");
const declaredCodes=new Set([
  ...[workspaceBlock[1],landingBlock[1]].flatMap(block=>[...block.matchAll(/"([^"]+)"/g)].map(match=>match[1])),
  ...[...modulePage.matchAll(/if\(code===["']([^"']+)["']\)/g)].map(match=>match[1])
]);
for(const panel of panelObjects){
 const children=[...panel[4].matchAll(/child\("([^"]+)"(?:,\s*"([^"]*)")?(?:,\s*"([^"]*)")?\)/g)];
 for(const child of children){
  if(child[2]&&!declaredCodes.has(child[2]))throw new Error("Canonical child legacy route is not registered: "+panel[1]+" / "+child[1]+" -> "+child[2]);
  if(child[3]&&!declaredCodes.has(child[3]))throw new Error("Canonical child module is not routed: "+panel[1]+" / "+child[1]+" -> "+child[3]);
 }
}
for(const panel of panelRoutes){
 const route=panel[4];
 const match=route.match(/[?&]code=([^&]+)/);
 if(route==="/admin")continue;
 if(match){
  if(!declaredCodes.has(decodeURIComponent(match[1])))throw new Error("Canonical panel route has no registered module destination: "+panel[1]+" -> "+route);
  continue;
 }
  const pathname=route.split("?")[0].split("/").filter(Boolean).join("/");
 const routeFile=path.join(root,"apps/web/app",pathname,"page.tsx");
 if(!fs.existsSync(routeFile))throw new Error("Canonical panel direct route has no page implementation: "+panel[1]+" -> "+route);
}
const firstPanel=panelObjects.find(panel=>panel[2]==="01");
if(!firstPanel)throw new Error("Panel 01 is missing");
const firstChildren=[...firstPanel[4].matchAll(/child\("([^"]+)"(?:,\s*(?:"([^"]*)"|undefined))?(?:,\s*(?:"([^"]*)"|undefined))?(?:,\s*"([^"]*)")?\)/g)];
const firstDestinations=firstChildren.map(child=>child[2]||child[3]).filter(Boolean);
if(new Set(firstDestinations).size!==firstDestinations.length)throw new Error("Panel 01 contains duplicate child destinations");
if(!masterMenu.includes('child("مرکز فرماندهی عملیاتی","","command-center","/command-center")'))throw new Error("Panel 01 command center route is not explicitly registered");
if(!sidebar.includes("const childRoute=child.route"))throw new Error("Sidebar does not honor explicit canonical child routes");
const unroutedLegacy=expectedLegacyCodes.filter(code=>!declaredCodes.has(code));
if(unroutedLegacy.length)throw new Error("Legacy menu codes are not registered in a real dispatcher branch/workspace: "+unroutedLegacy.join(", "));

if(!sidebar.includes("const visit=(nodes:MenuNode[])")||!sidebar.includes("visit(node.child_items||[])"))throw new Error("Legacy menu merge must index every nested level");
if(!sidebar.includes("function flattenTitles(nodes:MenuNode[])")||!sidebar.includes("...flattenTitles(x.dbChildren)"))throw new Error("Menu search must include all nested legacy levels");

const dynamicMenu=fs.readFileSync(path.join(root,"apps/api/src/dynamic-menu.ts"),"utf8");
const workflowDir=path.join(root,".github/workflows");
const workflowFiles=fs.readdirSync(workflowDir).filter(name=>/\.ya?ml$/i.test(name));
if(workflowFiles.length!==1||workflowFiles[0]!=="deploy-sookar-main.yml")throw new Error("Deployment workflow must have exactly one canonical entry point; found: "+workflowFiles.join(", "));
const deployWorkflow=fs.readFileSync(path.join(workflowDir,"deploy-sookar-main.yml"),"utf8");
if(/^\s*push\s*:/m.test(deployWorkflow)&&!deployWorkflow.includes("if: ${{ github.event_name == 'push' || github.event_name == 'workflow_dispatch' }}"))throw new Error("Main pushes and manual reviewed releases must run the unified build job");
if(!/^on:\s*\n(?:[\s\S]*?\n)?\s+workflow_dispatch:/m.test(deployWorkflow))throw new Error("Unified workflow must expose one explicit manual build/deploy entry point");
if(!dynamicMenu.includes('router.get("/api/dashboard/menu-tree"')||!server.includes("app.use(dynamicMenuRouter)"))throw new Error("Canonical dashboard menu-tree API is missing or not mounted");
if(!deployWorkflow.includes("workflow_dispatch:")||!deployWorkflow.includes("deploy_to_server:")||!deployWorkflow.includes("default: false"))throw new Error("Manual deployment must require an explicit approval input");
if(deployWorkflow.includes("[deploy-sookar]")||deployWorkflow.includes("Ensure DirectAdmin SSL is enabled"))throw new Error("Legacy commit-marker deployment or automatic SSL enablement must be removed");
for(const step of ["Prepare SSH","Preflight Sookar.ir production target","Upload release","Deploy with rollback","Production health and release check","Reload DirectAdmin Nginx configuration","Configure DirectAdmin Nginx routes","Verify public HTTPS endpoint"]){
 const gatedStepStart=deployWorkflow.indexOf("- name: "+step);
 if(gatedStepStart<0||!deployWorkflow.slice(gatedStepStart,gatedStepStart+400).includes("if: ${{ inputs.deploy_to_server }}"))throw new Error("Production step must require explicit manual deployment approval: "+step);
}
if(!deployWorkflow.includes("Upload reviewable build artifact")||deployWorkflow.indexOf("Package exact SHA")>deployWorkflow.indexOf("Upload reviewable build artifact"))throw new Error("Build artifact must be packaged before review upload");
if(deployWorkflow.includes("inputs.deploy_to_server || github.event_name == 'push'"))throw new Error("A main push must never bypass explicit production deployment approval");
if(!deployWorkflow.includes("group: sookar-${{ inputs.deploy_to_server && 'production' || 'build' }}"))throw new Error("Build validation and production deployment must use separate concurrency groups");
if(!deployWorkflow.includes("--exclude='.env.*'"))throw new Error("Release package must exclude environment files");
if(deployWorkflow.includes("letsencrypt.sh request"))throw new Error("Production deployment must not request SSL certificates automatically; prevent rate-limit loops");
if(!deployWorkflow.includes("-checkend 86400")||!deployWorkflow.includes('-checkhost sookar.ir'))throw new Error("Production deployment must validate the existing sookar.ir SSL certificate expiry and hostname");
if(deployWorkflow.includes("sookar.com")||!deployWorkflow.includes("/home/sookar/domains/sookar.ir/negar-platform")||!deployWorkflow.includes("Preflight Sookar.ir production target"))throw new Error("Deployment must target and preflight only the canonical sookar.ir domain");


const rootPage=fs.readFileSync(path.join(root,"apps/web/app/page.tsx"),"utf8");
const marketplaceRoute=fs.readFileSync(path.join(root,"apps/web/app/marketplace/page.tsx"),"utf8");
const rootLayout=fs.readFileSync(path.join(root,"apps/web/app/layout.tsx"),"utf8");
if(!rootPage.includes('from "./store/page"')||!marketplaceRoute.includes('from "../store/page"'))throw new Error("Sookar.ir root and /marketplace must share one canonical storefront implementation");
if(!rootLayout.includes('const siteUrl = "https://sookar.ir"')||!rootLayout.includes('"@type": "OnlineStore"'))throw new Error("Root storefront SEO metadata must use sookar.ir and OnlineStore schema");

const storefront=fs.readFileSync(path.join(root,"apps/web/app/store/page.tsx"),"utf8");
const productDetail=fs.readFileSync(path.join(root,"apps/web/app/store/product/[slug]/page.tsx"),"utf8");
if(!productDetail.includes('|| "https://sookar.ir"')||!productDetail.includes('"x-forwarded-host":publicHost')||productDetail.includes("negarzinfadak.ir")||productDetail.includes("schema.org/InStock"))throw new Error("Product detail must resolve the Sookar catalog host and avoid unverified stock claims");
const publicCatalogApi=fs.readFileSync(path.join(root,"apps/api/src/domain-marketplace.ts"),"utf8");
const categoryMigration=fs.readFileSync(path.join(root,"database/migrations/126_storefront_category_taxonomy.sql"),"utf8");
const productManagement=fs.readFileSync(path.join(root,"apps/web/app/marketplace/products/page.tsx"),"utf8");
const sellerManagement=fs.readFileSync(path.join(root,"apps/web/app/marketplace/sellers/page.tsx"),"utf8");
const storeDirectory=path.join(root,"apps/web/app/marketplace/directory/page.tsx");
if(!publicCatalogApi.includes('domainMarketplaceRouter.get("/api/public/marketplace"')||!publicCatalogApi.includes("p.status='active'")||!publicCatalogApi.includes("sl.status='active'"))throw new Error("Public catalog must expose only published products from active sellers");
if(!categoryMigration.includes("create table if not exists marketplace_categories")||!categoryMigration.includes("unique(tenant_id,code)")||!categoryMigration.includes("where t.status='active'"))throw new Error("Persistent tenant-scoped category taxonomy migration is incomplete");
if(!publicCatalogApi.includes('domainMarketplaceRouter.get("/api/marketplace/categories"')||!publicCatalogApi.includes("from marketplace_categories where tenant_id=$1 and status='active'"))throw new Error("Authenticated category API must read the tenant-scoped taxonomy");
if(!productManagement.includes('api<{items:Category[]}>("/api/marketplace/categories")')||!productManagement.includes("categories.map(item => <option"))throw new Error("Product entry must select categories from the central database taxonomy");

if(!storefront.includes('fetch("/api/public/marketplace"')||storefront.includes("digikala-catalog")||storefront.includes("source_url")||!storefront.includes("showAllProducts ? products.length : 20")||!storefront.includes("canonicalCategory(product.category) === selectedCategory")||!storefront.includes("categories.slice(0, 8)")||!storefront.includes("BROWSE_CATEGORIES")||!storefront.includes("دسته‌بندی‌های اصلی بازارگاه"))throw new Error("Storefront must use only the first-party catalog, internal product routes, canonical category filters, and the full shop catalog");
if(!publicCatalogApi.includes('domainMarketplaceRouter.post("/api/marketplace/products/import-reference"')||!publicCatalogApi.includes('sourceType:"reference-import"')||!publicCatalogApi.includes('"/api/public/media/catalog/"+filename'))throw new Error("Reference product import must create local draft records and copy images to first-party media");
if(!fs.readFileSync(path.join(root,"apps/api/src/server.ts"),"utf8").includes('app.use("/api/public/media"'))||!fs.readFileSync(path.join(root,"docker-compose.production.yml"),"utf8").includes("catalog_media:/app/media"))throw new Error("First-party catalog media must be served and persisted");
if(!productManagement.includes('/api/marketplace/products/import-reference')||!productManagement.includes("ورود به کاتالوگ داخلی"))throw new Error("Product workspace must support selected reference import into the internal catalog");
if(!fs.existsSync(path.join(root,"apps/web/app/marketplace/products/products-workspace.css")))throw new Error("Responsive enterprise product workspace styles are missing");
if(!productManagement.includes("/status")||!productManagement.includes("انتشار محصول")||!productManagement.includes("فعال‌سازی فروشنده لازم است"))throw new Error("Product management must support publishing and explain seller activation requirements");
if(!sellerManagement.includes("/status")||!sellerManagement.includes("فعال‌سازی فروشنده"))throw new Error("Seller management must provide explicit activation controls");
if(!fs.existsSync(storeDirectory))throw new Error("Public store directory route is missing");
if(!fs.readFileSync(storeDirectory,"utf8").includes("/api/public/marketplace"))throw new Error("Public store directory must use real public catalog data");
const adminDashboard=fs.readFileSync(path.join(root,"apps/web/app/admin/page.tsx"),"utf8");
if(!adminDashboard.includes('import {MASTER_MENU} from "./master-menu"')||adminDashboard.includes("const GROUPS=")||!adminDashboard.includes("canonical-panel-grid"))throw new Error("Management dashboard must use the canonical 20-panel menu source");


const identityApi=fs.readFileSync(path.join(root,"apps/api/src/identity.ts"),"utf8");
if(!identityApi.includes("const guardRead=")||!identityApi.includes("const guardWrite="))throw new Error("Identity API must separate read and write authorization");
if(identityApi.includes("requireAuth,guard,"))throw new Error("Identity API contains a route using the unsafe combined authorization guard");
if(!identityApi.includes('router.get("/api/identity/overview",requireAuth,guardRead,'))throw new Error("Identity overview must use read authorization");
if(!identityApi.includes('router.post("/api/identity/roles",requireAuth,guardAdmin,'))throw new Error("Role creation must be restricted to system admins");
if(!identityApi.includes('router.put("/api/identity/roles/:roleKey/permissions",requireAuth,guardAdmin,'))throw new Error("Permission updates must be restricted to system admins");

const identityWorkspace=fs.readFileSync(path.join(root,"apps/web/app/modules/IdentityWorkspace.tsx"),"utf8");
if(!modulePage.includes('"03-users-access": <IdentityWorkspace />'))throw new Error("Canonical Panel 03 must use the unified identity workspace");
for(const tab of ["users","profiles","roles","groups","permissions","policies","auth","twofa","sessions","audit"])if(!identityWorkspace.includes('["'+tab+'"'))throw new Error("Panel 03 workspace tab missing: "+tab);
for(const title of ["مدیریت کاربران و حساب‌ها","پروفایل کاربران","نقش‌ها و مسئولیت‌ها","گروه‌های کاربری","کاتالوگ مجوزها و دسترسی‌ها","سیاست‌های امنیتی","احراز هویت دومرحله‌ای","نشست‌ها و دستگاه‌های مجاز","تاریخچه ورود و ممیزی امنیتی"])if(!masterMenu.includes(title))throw new Error("Panel 03 child menu missing: "+title);
if(fs.existsSync(path.join(root,"apps/web/app/modules/SecurityWorkspace.tsx"))||fs.existsSync(path.join(root,"apps/web/app/modules/SecurityWorkspace.module.css")))throw new Error("Duplicate security workspace must be removed after consolidation");

console.log("Platform integrity OK: 45 modules, 20 canonical panels, recursive legacy-menu merge/search, all 49 legacy codes routed, unified workflow, approval-gated deployment, artifact secret exclusions, live menu-tree route, stages 19-45 operational layers, storage, pagination, and activation verified.");
