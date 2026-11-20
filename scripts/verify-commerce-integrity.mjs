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
const cartActions=read("apps/web/app/store/cart-actions.tsx");
const cartCss=read("apps/web/app/store/cart-workspace.css");
const api=read("apps/api/src/domain-marketplace.ts");
const checkoutApi=read("apps/api/src/domain-checkout.ts");

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

if(!api.includes('pending:["confirmed"]')||!api.includes('paid:["processing"]'))throw new Error("Generic order lifecycle must not confirm payments or refunds");
if(api.includes('confirmed:["paid"')||api.includes('paid:["processing","refunded"')||api.includes('delivered:["returned","refunded"'))throw new Error("Generic order lifecycle exposes payment/refund transitions");
if(!checkoutApi.includes('"/api/marketplace/orders/:id/cancel"')||!checkoutApi.includes("reserved_quantity=greatest(0,reserved_quantity-$1)"))throw new Error("Order cancellation must release reserved inventory through its dedicated endpoint");
if(!orderPage.includes('"/api/marketplace/orders/"+encodeURIComponent(order.id)+"/cancel"'))throw new Error("Order UI must call the dedicated inventory-safe cancellation endpoint");

if(!cartActions.includes('"/api/auth/me"')||!cartActions.includes('"/api/checkout/carts"')||!cartActions.includes('"/items"'))throw new Error("Browser cart must hand off authenticated items to the operational checkout API");
if(!cartActions.includes('new Set(items.map(item => item.store_id'))||!cartActions.includes('new Set(items.map(item => item.currency'))throw new Error("Browser cart must prevent unsupported multi-store or mixed-currency checkout");
if(!cartActions.includes('"/store/checkout?cart="'))throw new Error("Operational cart handoff must open the checkout route");
if(!cartActions.includes('import "./cart-workspace.css"')||!cartCss.includes(".sk-store .sk-cart-checkout"))throw new Error("Cart checkout controls must use isolated styles");
console.log("COMMERCE_STOREFRONT_INTEGRITY_OK");

