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
const workspaceBlock=modulePage.match(/const CANONICAL_WORKSPACES\s*:\s*Record<string,\s*React\.ReactNode>\s*=\s*\{([\s\S]*?)\n\};/);
const genericBlock=modulePage.match(/const GENERIC_OPERATIONAL_WORKSPACES\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
const landingBlock=modulePage.match(/const canonicalCodes\s*=\s*new Set\(\[([\s\S]*?)\]\);/);
if(!workspaceBlock||!genericBlock||!landingBlock)throw new Error("Module dispatcher registries could not be parsed");
const declaredCodes=new Set([
  ...[workspaceBlock[1],genericBlock[1],landingBlock[1]].flatMap(block=>[...block.matchAll(/"([^"]+)"/g)].map(match=>match[1])),
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
 if(route!=="/admin"&&(!match||!declaredCodes.has(decodeURIComponent(match[1]))))throw new Error("Canonical panel route has no registered destination: "+panel[1]+" -> "+route);
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
if(!dynamicMenu.includes('router.get("/api/dashboard/menu-tree"')||!server.includes("app.use(dynamicMenuRouter)"))throw new Error("Canonical dashboard menu-tree API is missing or not mounted");
if(!deployWorkflow.includes("workflow_dispatch:")||!deployWorkflow.includes("deploy_to_server:")||!deployWorkflow.includes("default: false"))throw new Error("Production deployment must require explicit approval input");
for(const step of ["Prepare SSH","Upload release","Deploy with rollback","Production health and release check","Reload DirectAdmin Nginx configuration","Configure DirectAdmin Nginx routes","Ensure DirectAdmin SSL is enabled","Verify public HTTPS endpoint"]){
 const escaped=step.replace(/[.*+?^${}()|[\]\\]/g,"\\console.log("Platform integrity OK:");
 const gate=new RegExp("- name: "+escaped+"\\s+if: \\$\\{\\{\\s*inputs\\.deploy_to_server\\s*\\}\\}");
 if(!gate.test(deployWorkflow))throw new Error("Production step is not gated by explicit approval: "+step);
}
if(!deployWorkflow.includes("Upload reviewable build artifact")||deployWorkflow.indexOf("Package exact SHA")>deployWorkflow.indexOf("Upload reviewable build artifact"))throw new Error("Build artifact must be packaged before review upload");
if(!deployWorkflow.includes("--exclude='.env.*'"))throw new Error("Release package must exclude environment files");

console.log("Platform integrity OK: 45 modules, 20 canonical panels, recursive legacy-menu merge/search, all 49 legacy codes routed, unified workflow, approval-gated deployment, artifact secret exclusions, live menu-tree route, stages 19-45 operational layers, storage, pagination, and activation verified.");
