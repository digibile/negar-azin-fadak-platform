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
const settlementPage=read("apps/web/app/marketplace/settlements/page.tsx");
const settlementCss=read("apps/web/app/marketplace/settlements/settlements-workspace.css");
if(!settlementPage.includes('import "./settlements-workspace.css"'))throw new Error("Settlement workspace must use isolated styles");
if(!settlementPage.includes("Array.isArray(x)?x:Array.isArray(x?.items)?x.items:[]"))throw new Error("Settlement workspace must support the API's raw-array response and wrapped item response");
for(const marker of [".settlement-card",".settlement-metric",".settlements-state"]){
  if(!settlementCss.includes(marker))throw new Error("Settlement workspace isolated styles are missing: "+marker);
}
if(!checkoutApi.includes("async function canAccessCustomer")||!checkoutApi.includes("customerRef===user.id"))throw new Error("Customer checkout must authorize access by authenticated cart/order ownership");
if(!checkoutApi.includes("product_currency")||!checkoutApi.includes("واحد پول کالا با سبد خرید یکسان نیست")||!checkoutApi.includes("c.rows[0].currency||\"IRR\""))throw new Error("Checkout must enforce and persist one currency from cart to order and payment");
if(!checkoutApi.includes("resolvePublicTenant(req)")||!checkoutApi.includes("insert into user_tenants(user_id,tenant_id,is_default)"))throw new Error("New storefront customers must be safely attached to the tenant resolved from the public store domain");
for(const route of [
  'checkoutRouter.post("/api/checkout/carts",requireAuth,asyncHandler',
  'checkoutRouter.post("/api/checkout/carts/:id/items",requireAuth,asyncHandler',
  'checkoutRouter.get("/api/checkout/carts/:id",requireAuth,asyncHandler',
  'checkoutRouter.post("/api/checkout/carts/:id/checkout",requireAuth,asyncHandler',
  'checkoutRouter.get("/api/marketplace/orders/:id",requireAuth,asyncHandler',
  'checkoutRouter.post("/api/marketplace/orders/:id/payment",requireAuth,asyncHandler'
]){
  if(!checkoutApi.includes(route))throw new Error("Customer-owned commerce route must not require an operator-only permission: "+route);
}
if(!checkoutApi.includes('const cancellationReason=s(req.body?.reason,500)')||!checkoutApi.includes('JSON.stringify({reason:cancellationReason})'))throw new Error("Order cancellation must require and audit the customer's reason");
const checkoutPage=read("apps/web/app/store/checkout/page.tsx");
const paymentMigration=read("database/migrations/131_persist_marketplace_payment_redirects.sql");
if(!checkoutApi.includes('checkoutRouter.post("/api/marketplace/payments/:paymentId/verify",requireAuth,asyncHandler'))throw new Error("Customer payment return must use the authenticated payment verification endpoint");
if(!checkoutApi.includes('provider.verifyPayment({providerTransactionId:payment.provider_transaction_id')||!checkoutApi.includes('providerResult.status==="paid"'))throw new Error("A gateway payment must be verified server-side before it is marked paid");
if(!checkoutApi.includes('redirectUrl:redirectUrl||null')||!checkoutApi.includes('status:pending.rows[0].status'))throw new Error("Pending gateway attempts must persist and return their redirect URL and payment record");
if(!checkoutApi.includes('returnUrl:')||!checkoutApi.includes('paymentNo='+encodeURIComponent(paymentNo)))throw new Error("Gateway create request must include the exact order and payment return reference");
if(!paymentMigration.includes("add column if not exists redirect_url text")||!paymentMigration.includes("failure_reason text"))throw new Error("Pending payment migration must persist redirect and failure metadata");
if(!checkoutPage.includes('window.location.assign(pb.redirectUrl)')||!checkoutPage.includes('/api/marketplace/payments/'))throw new Error("Store checkout must redirect to the gateway and verify the returned payment");
if(!checkoutPage.includes("بررسی مجدد وضعیت پرداخت")||!checkoutPage.includes("pendingPaymentId"))throw new Error("Store checkout must expose a retryable status check for pending gateway attempts");
if(!checkoutApi.includes('providerResult.status==="failed"?"failed":"pending"')||!checkoutApi.includes("failure_reason"))throw new Error("Gateway-declared failures must remain failed instead of being misreported as pending");
if(!checkoutApi.includes('pendingStatus==="failed"?200:202'))throw new Error("Failed gateway attempts must not be exposed as pending payment redirects");

const customerOrders=read("apps/web/app/account/orders/page.tsx");
const customerOrdersCss=read("apps/web/app/account/orders/orders-workspace.css");
if(!api.includes('permission="order:view"')&&!api.includes("permission='order:view'"))throw new Error("Marketplace order list must preserve operator order:view authorization");
if(!api.includes('where+=" and o.customer_ref=$2"')||!api.includes('user.id')||!api.includes('latest_payment_status'))throw new Error("Customer order history must be restricted to the authenticated customer and include payment status");
if(!customerOrders.includes('"/api/marketplace/orders"')||!customerOrders.includes("latest_payment_status")||!customerOrders.includes('"/store/checkout?order="'))throw new Error("Customer account must show real order history and order tracking links");
if(!customerOrders.includes('import "./orders-workspace.css"')||!customerOrdersCss.includes(".account-order-card"))throw new Error("Customer order history must use isolated responsive styles");
const checkoutPage=read("apps/web/app/store/checkout/page.tsx");
if(!checkoutPage.includes('cartId==="history"')||!checkoutPage.includes('order?.payments'))throw new Error("Order tracking must work without an active cart session");
console.log("COMMERCE_STOREFRONT_INTEGRITY_OK");

