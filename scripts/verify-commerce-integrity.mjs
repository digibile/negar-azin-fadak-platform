import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const requiredRoutes=[
  "apps/web/app/marketplace/products/page.tsx",
  "apps/web/app/marketplace/categories/page.tsx",
  "apps/web/app/marketplace/stores/page.tsx",
  "apps/web/app/marketplace/sellers/page.tsx",
  "apps/web/app/marketplace/orders/page.tsx",
  "apps/web/app/marketplace/settlements/page.tsx"
];
for(const route of requiredRoutes)if(!fs.existsSync(path.join(root,route)))throw new Error("Canonical commerce workspace is missing: "+route);

const canonical=read("apps/web/app/marketplace/MarketplacePage.tsx");
const home=read("apps/web/app/page.tsx");
const marketplace=read("apps/web/app/marketplace/page.tsx");
const commerce=read("apps/web/app/modules/CommercePanelWorkspace.tsx");
const commerceCss=read("apps/web/app/modules/commerce-panel.css");
const orderPage=read("apps/web/app/marketplace/orders/page.tsx");
const orderCss=read("apps/web/app/marketplace/orders/orders-workspace.css");
const api=read("apps/api/src/domain-marketplace.ts");

if(!canonical.includes('import StorePage from "../store/page"')||!canonical.includes('<StorePage variant="marketplace-pro"/>'))throw new Error("Canonical storefront must reuse the operational StorePage marketplace variant");
if(!home.includes('import MarketplacePage from "./marketplace/MarketplacePage"')||!home.includes("<MarketplacePage />"))throw new Error("Homepage must render the canonical marketplace page");
if(!marketplace.includes('import MarketplacePage from "./MarketplacePage"')||!marketplace.includes("<MarketplacePage />"))throw new Error("/marketplace must render the same canonical marketplace page");
for(const marker of ["./commerce-panel.css","/store","/marketplace","/marketplace/products","/marketplace/categories","/marketplace/stores","/marketplace/sellers","/marketplace/orders","/marketplace/settlements"]){
  if(!commerce.includes(marker))throw new Error("Commerce hub is missing canonical entry point: "+marker);
}
for(const marker of [".commerce-metrics",".commerce-link-grid",".commerce-link-card"]){
  if(!commerceCss.includes(marker))throw new Error("Commerce hub isolated styles are missing: "+marker);
}
for(const route of ["/api/public/marketplace","/api/marketplace/products","/api/marketplace/categories","/api/marketplace/stores","/api/marketplace/sellers","/api/marketplace/orders","/api/marketplace/settlements"]){
  if(!api.includes(route))throw new Error("Marketplace API route is missing: "+route);
}

if(!orderPage.includes('import "./orders-workspace.css"'))throw new Error("Order workspace must use isolated styles");
if(!orderPage.includes('pending:[{status:"confirmed"'))throw new Error("Pending orders must expose the confirmation transition");
if(orderPage.includes('confirmed:[{status:"paid"')||orderPage.includes('returned:[{status:"refunded"'))throw new Error("Payment and refund statuses must not be manually written from the order workspace");
for(const marker of ["ثبت ارسال","ثبت تحویل","ثبت مرجوعی","بازپرداخت باید از چرخه مالی تأیید شود"]){
  if(!orderPage.includes(marker))throw new Error("Order lifecycle workspace is missing safe operation guidance: "+marker);
}
for(const marker of [".platform-order-summary",".platform-order-row",".platform-order-danger"]){
  if(!orderCss.includes(marker))throw new Error("Order workspace isolated styles are missing: "+marker);
}
console.log("COMMERCE_STOREFRONT_INTEGRITY_OK");

