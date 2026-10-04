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
for(const code of ["command-center","monitoring-events","audit-control","documentation","api-integration","infrastructure-data","mobile-app","quality-lifecycle"]){
 if(!runtime.includes("'"+code+"'"))throw new Error("Runtime activation missing: "+code);
 if(!command.includes('"'+code+'"'))throw new Error("Command router missing: "+code);
}
if(!server.includes('domainCommandPlatformRouter'))throw new Error("Command router is not mounted");
for(const code of ["commission","settlement","payments","providers-integrations","communications","events-notifications","crm","contact-center","tickets-support"]){
 if(!migration.includes("'"+code+"'"))throw new Error("Stage 19-27 registry missing: "+code);
}
if(!stage1927.includes("idx_commission_rules_rate")||!stage1927.includes("idx_payments_method_updated"))throw new Error("Stage 19-27 operational migration incomplete");
if(!commerce.includes("pagination")||!communication.includes("pagination"))throw new Error("Stage 19-27 API pagination missing");
if(!operationsPage.includes('target=[')||!operationsPage.includes('19 تا ۲۷'))throw new Error("Stage 19-27 operations page missing");
const forbidden=/(^|[^A-Za-z])ERP([^A-Za-z]|$)/i;
for(const file of [migration,storage,runtime,stage1927,server,command,commerce,communication,operationsPage])if(forbidden.test(file))throw new Error("Forbidden terminology detected");
console.log("Platform integrity OK: 45 modules, stages 19-27 operational layer, 8 command-platform domains, mounted router, storage and activation verified.");
