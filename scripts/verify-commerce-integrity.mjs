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
for(const marker of ["مدیریت ارسال و رهگیری","ثبت تحویل","درخواست مرجوعی","بازپرداخت باید از چرخه مالی تأیید شود"]){
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
if(!cartActions.includes('new Set(items.map(item => item.store_id')||!cartActions.includes('new Set(items.map(item => item.currency'))throw new Error("Browser cart must prevent unsupported multi-store or mixed-currency checkout");
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
if(!checkoutApi.includes('returnUrl:')||!checkoutApi.includes('"&paymentNo="+encodeURIComponent(paymentNo)'))throw new Error("Gateway create request must include the exact order and payment return reference");
if(!paymentMigration.includes("add column if not exists redirect_url text")||!paymentMigration.includes("failure_reason text"))throw new Error("Pending payment migration must persist redirect and failure metadata");
if(!checkoutPage.includes('window.location.assign(pb.redirectUrl)')||!checkoutPage.includes('/api/marketplace/payments/'))throw new Error("Store checkout must redirect to the gateway and verify the returned payment");
if(!checkoutPage.includes("بررسی مجدد وضعیت پرداخت")||!checkoutPage.includes("pendingPaymentId"))throw new Error("Store checkout must expose a retryable status check for pending gateway attempts");
if(!checkoutApi.includes('providerResult.status==="failed"?"failed":"pending"')||!checkoutApi.includes("failure_reason"))throw new Error("Gateway-declared failures must remain failed instead of being misreported as pending");
if(!checkoutApi.includes('pendingStatus==="failed"?200:202'))throw new Error("Failed gateway attempts must not be exposed as pending payment redirects");
if(!checkoutPage.includes('paymentStatus==="failed"')||!checkoutPage.includes("درگاه این تلاش پرداخت را ناموفق اعلام کرد"))throw new Error("Checkout must explain a failed gateway attempt and allow a fresh payment attempt");

const customerOrders=read("apps/web/app/account/orders/page.tsx");
const customerOrdersCss=read("apps/web/app/account/orders/orders-workspace.css");
if(!api.includes('permission="order:view"')&&!api.includes("permission='order:view'"))throw new Error("Marketplace order list must preserve operator order:view authorization");
if(!api.includes('where+=" and o.customer_ref=$2"')||!api.includes('user.id')||!api.includes('latest_payment_status'))throw new Error("Customer order history must be restricted to the authenticated customer and include payment status");
if(!customerOrders.includes('"/api/marketplace/orders"')||!customerOrders.includes("latest_payment_status")||!customerOrders.includes('"/store/checkout?order="'))throw new Error("Customer account must show real order history and order tracking links");
if(!customerOrders.includes('import "./orders-workspace.css"')||!customerOrdersCss.includes(".account-order-card"))throw new Error("Customer order history must use isolated responsive styles");
if(!checkoutPage.includes('cartId==="history"')||!checkoutPage.includes('order.payments?.[0]?.status'))throw new Error("Order tracking must work without an active cart session");
console.log("COMMERCE_STOREFRONT_INTEGRITY_OK");

const deliveryMethodsApi=read("apps/api/src/logistics.ts");
const deliveryMethodsPage=read("apps/web/app/marketplace/shipping/delivery-methods/page.tsx");
const deliveryMethodsCss=read("apps/web/app/marketplace/shipping/delivery-methods/delivery-methods.css");
const deliveryMethodsMigration=read("database/migrations/115_delivery_and_quote_reminders.sql");
if(!deliveryMethodsMigration.includes("create table if not exists commerce_delivery_methods")||!deliveryMethodsMigration.includes("carrier_type")||!deliveryMethodsMigration.includes("business_days_min")||!deliveryMethodsMigration.includes("cost numeric(20,2)"))throw new Error("Delivery methods workspace must reuse the existing canonical delivery-method schema");
for(const route of ['/api/logistics/delivery-methods','/api/logistics/delivery-methods/:id/enabled'])if(!deliveryMethodsApi.includes(route))throw new Error("Tenant-scoped delivery method API is missing: "+route);
if(!deliveryMethodsApi.includes('where tenant_id=$1 order by enabled desc,title')||!deliveryMethodsApi.includes('where id=$2 and tenant_id=$3 returning'))throw new Error("Delivery method reads and updates must be tenant-scoped");
if(!deliveryMethodsApi.includes('requirePermission("modules:12-logistics-supply:write")')||!deliveryMethodsApi.includes('maxDays<minDays')||!deliveryMethodsApi.includes('cost<0'))throw new Error("Delivery method writes must enforce logistics permission and tariff validation");
if(!deliveryMethodsPage.includes('/api/logistics/delivery-methods')||!deliveryMethodsPage.includes('تعریف روش ارسال')||!deliveryMethodsPage.includes('تعرفه پایه'))throw new Error("Delivery methods workspace must use the operational API and show tariff details");
if(!deliveryMethodsPage.includes('به‌تنهایی به مشتری اعلام یا به سفارش اضافه نمی‌شود')||!deliveryMethodsPage.includes('هیچ هزینه‌ای به مبلغ سفارش اضافه نمی‌شود'))throw new Error("Unquoted base tariffs must not be presented as a customer shipping quote");
if(!deliveryMethodsCss.includes('.delivery-method-form')||!deliveryMethodsCss.includes('@media(max-width:560px)'))throw new Error("Delivery methods workspace must include responsive isolated styles");
const shippingWorkspaceWithTariffLink=read("apps/web/app/marketplace/shipping/page.tsx");
if(!shippingWorkspaceWithTariffLink.includes('/marketplace/shipping/delivery-methods'))throw new Error("Shipping workspace must link to delivery method management");
console.log("DELIVERY_METHODS_INTEGRITY_OK");

const productRulesApi=read("apps/api/src/logistics.ts");
const productRulesPage=read("apps/web/app/marketplace/shipping/delivery-methods/page.tsx");
const productRulesCss=read("apps/web/app/marketplace/shipping/delivery-methods/delivery-methods.css");
for(const route of ['/api/logistics/delivery-methods/:id/products'])if(!productRulesApi.includes(route))throw new Error("Product delivery rule API is missing");
if(!productRulesApi.includes("left join product_delivery_rules")||!productRulesApi.includes("where p.tenant_id=$2"))throw new Error("Product delivery rules listing must be tenant-scoped");
if(!productRulesApi.includes('requirePermission("modules:12-logistics-supply:write")')||!productRulesApi.includes("delete from product_delivery_rules where tenant_id=$1 and delivery_method_id=$2")||!productRulesApi.includes("p.id=any($3::uuid[])"))throw new Error("Product delivery rule writes must be authorized and tenant-scoped");
if(!productRulesApi.includes("valid.rowCount!==uniqueIds.length")||!productRulesApi.includes('insert into product_delivery_rules(tenant_id,product_id,delivery_method_id,enabled)'))throw new Error("Product delivery rules must validate ownership before assignment");
if(!productRulesPage.includes('تخصیص کالاها')||!productRulesPage.includes('productIds:products.filter(p=>p.enabled).map(p=>p.id)')||!productRulesPage.includes('delivery-methods/"+encodeURIComponent(selectedMethod.id)+"/products'))throw new Error("Delivery method UI must manage product assignments through the API");
if(!productRulesCss.includes(".delivery-product-grid")||!productRulesCss.includes("@media(max-width:520px)"))throw new Error("Product delivery rule UI must be responsive");
console.log("PRODUCT_DELIVERY_RULES_INTEGRITY_OK");




const reservationMigration=read("database/migrations/149_marketplace_reservation_expiry.sql");
const notificationWorker=read("apps/api/src/notification-worker.ts");
if(!reservationMigration.includes("reservation_expires_at")||!reservationMigration.includes("reservation_released_at"))throw new Error("Marketplace reservation expiry must be persisted on the canonical order");
if(!checkoutApi.includes("MARKETPLACE_RESERVATION_TTL_MINUTES")||!checkoutApi.includes("reservation_expires_at"))throw new Error("New marketplace orders must receive a bounded stock reservation expiry");
if(!checkoutApi.includes("payment.reservation_expired")||!checkoutApi.includes("مهلت رزرو موجودی این سفارش پایان یافته است"))throw new Error("Payment start and verification must reject expired reservations");
if(!notificationWorker.includes("expireMarketplaceReservations")||!notificationWorker.includes("reserved_quantity=greatest(0,reserved_quantity-$1)")||!notificationWorker.includes("order.reservation_expired"))throw new Error("Existing worker must release expired reservations and audit the order transition");

const orderLockPosition=checkoutApi.indexOf("const orderLock=await client.query");
const paymentLockPosition=checkoutApi.indexOf("for update of p",orderLockPosition);
if(orderLockPosition<0||paymentLockPosition<orderLockPosition)throw new Error("Payment verification must lock the order before the payment to serialize with reservation expiry");
if(!checkoutApi.includes('(["pending","confirmed"].includes(payment.order_status)&&payment.reservation_expired)'))throw new Error("Idempotent verification of already-paid orders must remain available after the reservation deadline");
if(!reservationMigration.includes("created_at+interval"))throw new Error("Existing unpaid orders must receive a reservation expiry during migration");

const refundRoute=checkoutApi.slice(checkoutApi.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"'),checkoutApi.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"'));
if(!refundRoute.includes('if(order.status==="refunded")')||!refundRoute.includes("idempotent:true"))throw new Error("Repeated full refunds must return the existing refund idempotently");
if(!refundRoute.includes('["paid","processing","delivered","returned"].includes(order.status)')||refundRoute.includes("quantity=quantity+"))throw new Error("Refunds must accept inspected returns without restoring stock a second time");

if(!refundRoute.includes("settlement.order_removed_for_refund")||!refundRoute.includes('x.status==="paid"')||!refundRoute.includes("seller_settlement_items where tenant_id=$1 and settlement_id=$2 and order_id=$3"))throw new Error("Refunds must reconcile unpaid seller settlement items and block already-paid seller settlements");
if(!refundRoute.includes('?"reversed":linked.status')||!refundRoute.includes("status=$7"))throw new Error("Empty pending seller settlements must be reversed when their final order is refunded");

const settlementApi=read("apps/api/src/domain-settlement.ts");
const ledgerApi=read("apps/api/src/ledger.ts");
const settlementPageCurrency=read("apps/web/app/marketplace/settlements/page.tsx");
const settlementCurrencyMigration=read("database/migrations/150_marketplace_settlement_currency.sql");
if(!settlementCurrencyMigration.includes("seller_settlements")||!settlementCurrencyMigration.includes("ledger_entries")||!settlementCurrencyMigration.includes("MIXED"))throw new Error("Marketplace settlement and ledger currency migration is incomplete");
if(!settlementApi.includes("bySellerCurrency")||!settlementApi.includes("status,currency)")||!settlementApi.includes('current.currency==="MIXED"'))throw new Error("Seller settlements must be grouped and paid in one currency");
if(!ledgerApi.includes("currency?:string")||!ledgerApi.includes('args.currency||"IRR"'))throw new Error("Ledger entries must persist the currency of commerce transactions");
if(!settlementPageCurrency.includes('x.currency||"IRR"'))throw new Error("Settlement workspace must display the settlement currency");
if(!checkoutApi.includes("o.commission_amount")||!checkoutApi.includes("o.currency,o.reservation_expires_at"))throw new Error("Payment verification must carry the order currency into its ledger entry");

if(!refundRoute.includes("currency_count")||!refundRoute.includes("single_currency"))throw new Error("Refund settlement reconciliation must recalculate currency after removing refunded orders");

const recoveryMigration=read("database/migrations/151_marketplace_seller_recovery_claims.sql");
const recoveryApi=read("apps/api/src/domain-settlement.ts");
if(!recoveryMigration.includes("marketplace_seller_recovery_claims")||!recoveryMigration.includes("recognition_ledger_entry_id")||!recoveryMigration.includes("collection_ledger_entry_id"))throw new Error("Seller recovery claim schema is incomplete");
if(!recoveryApi.includes("/api/marketplace/seller-recoveries")||!recoveryApi.includes('claim.status==="recovered"')||!recoveryApi.includes("marketplace_seller_recovery_collection"))throw new Error("Seller recovery listing and idempotent collection API are required");
if(refundRoute.includes('settlementLink.rows.some((x:any)=>x.status==="paid")'))throw new Error("Refunds after seller payout must create a seller recovery claim instead of being blocked");
if(!checkoutApi.includes("marketplace_seller_recovery_claims")||!checkoutApi.includes("seller_recovery.claim_created")||!checkoutApi.includes('accountCode:"1202"'))throw new Error("Refunds after seller payout must recognize a seller receivable in the ledger");

if(!checkoutApi.includes("select ss.id,ss.seller_id,ss.status,ss.adjustment_amount"))throw new Error("Post-payout refund claims must resolve the seller from the paid settlement");
if(!settlementPage.includes("/api/marketplace/seller-recoveries")||!settlementPage.includes("/collect")||!settlementPage.includes("paymentRef"))throw new Error("Settlement workspace must expose seller recovery collection");

const providerAdapter=read("apps/api/src/payment-provider.ts");

if(!providerAdapter.includes('"idempotency-key"')||!providerAdapter.includes("idempotencyKey?:string"))throw new Error("HTTP payment refunds must transmit a stable provider idempotency key");
if(!checkoutApi.includes('idempotencyKey:"marketplace-refund-"+payment.rows[0].id'))throw new Error("Marketplace refund retries must reuse a payment-scoped idempotency key");
if(!notificationWorker.includes('idempotencyKey:"merchant-review-reversal-"+row.payment_intent_id'))throw new Error("Merchant review reversal retries must reuse a payment-intent idempotency key");

const returnMigration=read("database/migrations/152_marketplace_order_returns.sql");
if(!returnMigration.includes("marketplace_order_returns")||!returnMigration.includes("unique(tenant_id,order_id)"))throw new Error("Marketplace return case schema is incomplete");
if(!api.includes("/api/marketplace/orders/:id/returns")||!api.includes("/api/marketplace/returns/:id/status"))throw new Error("Order return request and inspection APIs are required");
if(!api.includes('next==="accepted"')||!api.includes("marketplace_order_return")||!api.includes("movement_type,quantity,reference_type,reference_id,note,created_by"))throw new Error("Accepted returns must restore inventory once after inspection");
if(api.includes('processing:["shipped","returned"]')||api.includes('shipped:["delivered","returned"]'))throw new Error("Direct order return status transitions must be disabled");
if(refundRoute.includes('if(order.status==="returned"){')&&refundRoute.includes("quantity=quantity+"))throw new Error("Refund endpoint must not restore inventory a second time");

if(!api.includes("latest_return_id")||!api.includes("latest_return_status"))throw new Error("Order list must expose its return case status and identifier");
if(!orderPage.includes('next==="return_request"')||!orderPage.includes('return_accept:"accepted"')||!orderPage.includes("تأیید بازرسی و ورود موجودی"))throw new Error("Order workspace must use the inspected return lifecycle instead of direct status changes");

if(!orderPage.includes('paid:[{status:"processing",label:"شروع آماده‌سازی"},{status:"return_request"'))throw new Error("Paid orders must allow a formal return request");

if(!api.includes("if(r.status===next){await client.query(\"commit\");return res.json({return:r,idempotent:true});}"))throw new Error("Repeated return inspection transitions must be idempotent");


const logisticsApi=read("apps/api/src/logistics.ts");
const logisticsMigration=read("database/migrations/153_marketplace_logistics_bridge.sql");
const logisticsWorkspace=read("apps/web/app/marketplace/shipping/page.tsx");
const customerTracking=read("apps/web/app/account/orders/[id]/tracking/page.tsx");
const customerOrdersPage=read("apps/web/app/account/orders/page.tsx");
const orderLifecycle=api.slice(api.indexOf('domainMarketplaceRouter.patch("/api/marketplace/orders/:id/status"'));
if(!logisticsMigration.includes("marketplace_order_id")||!logisticsMigration.includes("uq_logistics_marketplace_order_shipment"))throw new Error("Marketplace logistics bridge must enforce one shipment per order");
if(!logisticsApi.includes('/api/logistics/marketplace-orders/:orderId/shipments')||!logisticsApi.includes('/api/marketplace/orders/:orderId/shipment'))throw new Error("Marketplace shipment creation and customer tracking endpoints are required");
if(!logisticsApi.includes("for update")||!logisticsApi.includes("marketplace.order_shipped")||!logisticsApi.includes("marketplace.order_delivered"))throw new Error("Shipment lifecycle must lock rows and synchronize order shipping and delivery events");
if(!logisticsApi.includes('s.marketplace_order_id&&b.status==="cancelled"'))throw new Error("Marketplace shipment cancellation must not orphan an order");
if(!logisticsWorkspace.includes("/api/logistics/marketplace-orders/")||!logisticsWorkspace.includes("ایجاد مرسوله")||!logisticsWorkspace.includes("ثبت تحویل"))throw new Error("Marketplace logistics workspace must create and manage shipments");
if(!customerTracking.includes("/api/marketplace/orders/")||!customerTracking.includes("تاریخچه جابه‌جایی"))throw new Error("Customer order tracking must display shipment event history");
if(!customerOrdersPage.includes("latest_shipment_id")||!customerOrdersPage.includes("/tracking"))throw new Error("Customer order history must link to shipment tracking when a shipment exists");
if(orderLifecycle.includes('processing:["shipped"]')&&!orderLifecycle.includes("ثبت ارسال سفارش فقط پس از شروع حرکت مرسوله"))throw new Error("Marketplace order shipping must be controlled by logistics events");

const logisticsNotifications=read("apps/api/src/logistics.ts");
const customerTrackingNotifications=read("apps/web/app/account/orders/[id]/tracking/page.tsx");
if(!logisticsNotifications.includes("insert into platform_notifications")||!logisticsNotifications.includes("/api/marketplace/orders/:orderId/notifications/:notificationId/read")||!logisticsNotifications.includes("platform_notifications where tenant_id=$1 and user_id=$2"))throw new Error("Marketplace shipment lifecycle must create customer in-app notifications and allow owner-only read acknowledgements");
if(!customerTrackingNotifications.includes("اعلان‌های سفارش")||!customerTrackingNotifications.includes("/notifications/"))throw new Error("Customer shipment tracking must display and acknowledge order notifications");
const shippingAddressMigration=read("database/migrations/156_marketplace_order_shipping_address.sql");
const checkoutDomain=read("apps/api/src/domain-checkout.ts");
const marketplaceShippingPage=read("apps/web/app/marketplace/shipping/page.tsx");
if(!shippingAddressMigration.includes("add column if not exists shipping_address jsonb")||!checkoutDomain.includes("/api/marketplace/orders/:id/shipping-address")||!checkoutDomain.includes("shipping_address")||!checkoutDomain.includes("normalizeShippingAddress"))throw new Error("Checkout must persist and validate a tenant-scoped delivery address snapshot");
if(!logisticsApi.includes("order.shipping_address?.addressLine")||!logisticsApi.includes("نشانی معتبر تحویل برای این سفارش ثبت نشده است"))throw new Error("Marketplace dispatch must use the actual saved customer delivery address and reject missing addresses");
if(!marketplaceShippingPage.includes("order.shipping_address?.addressLine")||!marketplaceShippingPage.includes("shipping_address"))throw new Error("Shipping workspace must show the saved customer delivery address before dispatch");

const logisticsPermissions=read("database/migrations/154_marketplace_logistics_permissions.sql");
if(!logisticsPermissions.includes("'manager','modules:12-logistics-supply:dispatch'")||!logisticsPermissions.includes("'viewer','modules:12-logistics-supply:track'"))throw new Error("Logistics workflow permissions must be granted to operational roles");

const logisticsResources=read("apps/web/app/marketplace/shipping/resources/page.tsx");
const logisticsResourcesCss=read("apps/web/app/marketplace/shipping/resources/resources-workspace.css");
if(!logisticsResources.includes("/api/logistics/vehicles")||!logisticsResources.includes("/api/logistics/drivers")||!logisticsResources.includes("ثبت خودروی جدید")||!logisticsResources.includes("ثبت راننده جدید"))throw new Error("Logistics workspace must provide API-backed vehicle and driver registration");
if(!logisticsResources.includes("licenseExpiry")||!logisticsResources.includes("گواهینامه منقضی شده است")&&!logisticsApi.includes("گواهینامه راننده منقضی شده است"))throw new Error("Driver license validity must be captured and enforced before dispatch");
if(!logisticsWorkspace.includes("/marketplace/shipping/resources")||!logisticsResourcesCss.includes(".resource-forms"))throw new Error("Shipping workspace must link to the responsive fleet and driver management page");

if(!logisticsApi.includes('/api/logistics/vehicles/:id/status')||!logisticsApi.includes('/api/logistics/drivers/:id/status')||!logisticsApi.includes("تا پایان مأموریت فعال امکان تغییر وضعیت"))throw new Error("Fleet and driver status changes must be audited and blocked while an active shipment is assigned");
if(!logisticsResources.includes('"/status"')||!logisticsResources.includes("ارسال به تعمیرگاه")||!logisticsResources.includes("تعلیق"))throw new Error("Fleet and driver workspace must expose operational status controls");

const logisticsRoutesWorkspace=read("apps/web/app/marketplace/shipping/routes/page.tsx");
if(!logisticsApi.includes("if(b.routeId)")||!logisticsApi.includes("route_id,vehicle_id,driver_id")||!logisticsWorkspace.includes("/api/logistics/routes")||!logisticsWorkspace.includes("routeId:routeByOrder"))throw new Error("Marketplace shipments must support tenant-scoped active route selection");
if(!logisticsRoutesWorkspace.includes('"/api/logistics/routes"')||!logisticsRoutesWorkspace.includes("ثبت مسیر جدید")||!logisticsRoutesWorkspace.includes("/marketplace/shipping/resources"))throw new Error("Logistics must provide a route registry linked to fleet resources");

const settlementShippingApi=read("apps/api/src/domain-settlement.ts");
const settlementShippingPage=read("apps/web/app/marketplace/settlements/page.tsx");
const settlementShippingMigration=read("database/migrations/155_marketplace_settlement_shipping_snapshot.sql");
if(!settlementShippingMigration.includes("shipping_amount numeric(20,2)")||!settlementShippingApi.includes("shipping_amount_total")||!settlementShippingApi.includes("Math.max(0,Number(o.shipping_amount||0))"))throw new Error("Seller settlements must snapshot customer shipping charges per order without inventing carrier costs");
if(!settlementShippingApi.includes("/api/marketplace/settlements/:id")||!settlementShippingApi.includes("'shippingAmount',si.shipping_amount")||!settlementShippingPage.includes("هزینه ارسال ثبت‌شده")||!settlementShippingPage.includes("جزئیات سفارش‌ها"))throw new Error("Seller settlement detail must expose the persisted shipping breakdown");

const checkoutPaymentAttempt=read("apps/web/app/store/checkout/page.tsx");
if(!checkoutPaymentAttempt.includes("const [paymentAttemptKey,setPaymentAttemptKey]=useState(\"\")"))throw new Error("Checkout must retain an idempotency key for the active payment attempt");
if(!checkoutPaymentAttempt.includes("idempotencyKey:attemptKey"))throw new Error("Checkout retries must reuse the same payment-attempt idempotency key");
if(!checkoutPaymentAttempt.includes('disabled={busy||!!pendingPaymentId||!items.length'))throw new Error("Checkout must prevent a second payment while an earlier attempt is pending");
if(!checkoutPaymentAttempt.includes('pb.status||pb.payment?.status||"pending"'))throw new Error("Checkout must interpret idempotent responses using the persisted payment status");
if(!checkoutPaymentAttempt.includes('setPaymentAttemptKey("")'))throw new Error("Checkout must release the idempotency key after a definitive paid or failed result");


const deliveryCheckoutApi=read("apps/api/src/domain-checkout.ts");
const deliveryCheckoutPage=read("apps/web/app/store/checkout/page.tsx");
const deliveryOrderMigration=read("database/migrations/157_marketplace_order_delivery_method.sql");
if(!deliveryCheckoutApi.includes("/api/checkout/carts/:id/delivery-methods")||!deliveryCheckoutApi.includes("product_delivery_rules")||!deliveryCheckoutApi.includes("dm.enabled=true"))throw new Error("Checkout must list only enabled delivery methods assigned to every cart product");
if(!deliveryCheckoutApi.includes("deliveryMethodId=s(req.body?.deliveryMethodId")||!deliveryCheckoutApi.includes("delivery_method_snapshot")||!deliveryCheckoutApi.includes("base_tariff_not_a_customer_quote"))throw new Error("Checkout must validate and snapshot the selected delivery method without charging an unquoted base tariff");
if(!deliveryCheckoutPage.includes("deliveryMethodId")||!deliveryCheckoutPage.includes("/delivery-methods")||!deliveryCheckoutPage.includes("انتخاب روش تحویل"))throw new Error("Storefront checkout must display and submit an eligible delivery method");
if(!deliveryOrderMigration.includes("delivery_method_id")||!deliveryOrderMigration.includes("delivery_method_snapshot"))throw new Error("Marketplace orders must persist delivery method identity and snapshot");
console.log("CHECKOUT_DELIVERY_METHOD_INTEGRITY_OK");


const deliverySnapshotMarketplaceApi=read("apps/api/src/domain-marketplace.ts");
const deliverySnapshotLogisticsApi=read("apps/api/src/logistics.ts");
const deliverySnapshotLogisticsPage=read("apps/web/app/marketplace/shipping/page.tsx");
const deliverySnapshotTrackingPage=read("apps/web/app/account/orders/[id]/tracking/page.tsx");
if(!deliverySnapshotMarketplaceApi.includes("o.delivery_method_id,o.delivery_method_snapshot"))throw new Error("Marketplace order history must return the persisted delivery method snapshot");
if(!deliverySnapshotLogisticsApi.includes("delivery_method_snapshot")||!deliverySnapshotLogisticsApi.includes("from marketplace_orders")||!deliverySnapshotLogisticsApi.includes("mo.delivery_method_snapshot,"))throw new Error("Logistics and customer tracking APIs must expose the order delivery method snapshot");
if(!deliverySnapshotLogisticsPage.includes("روش ارسال: {order.delivery_method_snapshot.title}")||!deliverySnapshotLogisticsPage.includes("روش انتخاب‌شده مشتری: {s.delivery_method_snapshot.title}"))throw new Error("Logistics workspace must show the selected delivery method for orders and shipments");
if(!deliverySnapshotTrackingPage.includes("روش ارسال انتخاب‌شده")||!deliverySnapshotTrackingPage.includes("data.order.delivery_method_snapshot?.title"))throw new Error("Customer tracking must show the delivery method selected at checkout");
console.log("DELIVERY_METHOD_ORDER_VISIBILITY_INTEGRITY_OK");
 
const deliveryQuoteMigration=read("database/migrations/158_marketplace_delivery_quotes.sql");
const deliveryQuoteApi=read("apps/api/src/logistics.ts");
const deliveryQuotePage=read("apps/web/app/marketplace/shipping/delivery-quotes/page.tsx");
const deliveryQuoteCss=read("apps/web/app/marketplace/shipping/delivery-quotes/delivery-quotes.css");
const deliveryShippingPage=read("apps/web/app/marketplace/shipping/page.tsx");
if(!deliveryQuoteMigration.includes("create table if not exists marketplace_delivery_quotes")||!deliveryQuoteMigration.includes("carrier_cost numeric(20,2)")||!deliveryQuoteMigration.includes("customer_charge numeric(20,2)")||!deliveryQuoteMigration.includes("unique(tenant_id,order_id,version)"))throw new Error("Manual delivery quote records must be tenant-scoped, versioned and retain separate carrier/customer amounts");
if(!deliveryQuoteApi.includes("/api/logistics/marketplace-delivery-quotes")||!deliveryQuoteApi.includes("/api/logistics/marketplace-orders/:orderId/delivery-quotes")||!deliveryQuoteApi.includes("modules:12-logistics-supply:write")||!deliveryQuoteApi.includes("status='superseded'"))throw new Error("Delivery quote issuance must be permissioned, versioned and supersede the previous offer");
if(!deliveryQuoteApi.includes("order.status")||!deliveryQuoteApi.includes("marketplace_payments")||!deliveryQuoteApi.includes("delivery_quote_required")||!deliveryQuoteApi.includes("پیش‌فاکتور قبلاً توسط مشتری تأیید شده")||!deliveryQuoteApi.includes("واحد پول پیش‌فاکتور با سفارش یکسان نیست"))throw new Error("Delivery quotes must reject ineligible, paid or already-accepted orders and enforce order currency");
if(!deliveryQuotePage.includes("carrierCost")||!deliveryQuotePage.includes("customerCharge")||!deliveryQuotePage.includes("/api/logistics/marketplace-delivery-quotes")||!deliveryQuotePage.includes("تا پیش از مرحله تأیید مشتری"))throw new Error("Delivery quote workspace must expose separate carrier and customer amounts and clearly mark offers as unaccepted");
if(!deliveryQuoteCss.includes(".delivery-quotes-form")||!deliveryShippingPage.includes("/marketplace/shipping/delivery-quotes"))throw new Error("Shipping operations must link to the delivery quote workspace and provide responsive styling");
console.log("MARKETPLACE_DELIVERY_QUOTE_DRAFT_INTEGRITY_OK");
const deliveryQuoteCheckoutApi=read("apps/api/src/domain-checkout.ts");
const deliveryQuoteCheckoutPage=read("apps/web/app/store/checkout/page.tsx");
if(!deliveryQuoteMigration.includes("delivery_quote_required boolean not null default false")||!deliveryQuoteMigration.includes("alter column delivery_quote_required set default true"))throw new Error("Only newly created marketplace orders should require a customer-approved delivery quote");
if(!deliveryQuoteCheckoutApi.includes("/api/marketplace/orders/:id/delivery-quote/accept")||!deliveryQuoteCheckoutApi.includes("marketplace.delivery_quote_accepted")||!deliveryQuoteCheckoutApi.includes("total_amount=subtotal-discount_amount+$1"))throw new Error("Customer quote acceptance must atomically snapshot the accepted charge and recalculate the order total");
if(!deliveryQuoteCheckoutApi.includes("پیش از پرداخت باید پیش‌فاکتور هزینه ارسال توسط مشتری تأیید شود"))throw new Error("Marketplace payment must be blocked until the delivery quote is accepted");
if(!deliveryQuoteCheckoutApi.includes("2201")||!deliveryQuoteCheckoutApi.includes("4201")||!deliveryQuoteCheckoutApi.includes("5201")||!deliveryQuoteCheckoutApi.includes("5202")||!deliveryQuoteCheckoutApi.includes("lines:refundLedgerLines")||!deliveryQuoteCheckoutApi.includes("lines:paymentLedgerLines")||!deliveryQuoteCheckoutApi.includes("lines:verifiedLedgerLines"))throw new Error("Payment ledger must separate carrier payable, delivery margin and delivery shortfall for both direct and verified payments");
if(!deliveryQuoteCheckoutApi.includes("deliveryQuote:deliveryQuote.rows[0]||null"))throw new Error("Customer order detail must expose the current offered delivery quote");
if(!deliveryQuoteCheckoutApi.includes("total_amount=subtotal-discount_amount+$1")||!deliveryQuoteCheckoutApi.includes("هزینه بازپرداخت وجه حمل به مشتری"))throw new Error("Accepted shipping charges and customer refunds must retain a balanced ledger calculation");
if(!deliveryQuoteCheckoutPage.includes("/delivery-quote/accept")||!deliveryQuoteCheckoutPage.includes("تأیید هزینه ارسال")||!deliveryQuoteCheckoutPage.includes("ثبت سفارش و درخواست استعلام ارسال")||!deliveryQuoteCheckoutPage.includes("پیش‌فاکتور هزینه ارسال"))throw new Error("Checkout must create an unpaid order, show the offered delivery quote and collect customer approval before payment");
console.log("MARKETPLACE_DELIVERY_QUOTE_ACCEPTANCE_AND_PAYMENT_INTEGRITY_OK");
const deliveryQuoteMarketplaceApi=read("apps/api/src/domain-marketplace.ts");
if(!deliveryQuoteCheckoutApi.includes("status in ('offered','accepted')")||!deliveryQuoteCheckoutApi.includes("delivery_quote_snapshot=null")||!deliveryQuoteCheckoutApi.includes("پس از آغاز تلاش پرداخت، نشانی سفارش قابل تغییر نیست"))throw new Error("Changing a delivery destination must invalidate an outstanding quote and be blocked after payment begins");
if(!deliveryQuoteCheckoutPage.includes("addressChanged")||!deliveryQuoteCheckoutPage.includes("پیش‌فاکتور قبلی باطل شد"))throw new Error("Checkout must request a new delivery quote when the customer changes the destination");
if(!deliveryQuoteMarketplaceApi.includes("o.delivery_quote_required"))throw new Error("Marketplace order listing must expose whether a delivery quote is required");
if(!deliveryQuoteCheckoutApi.includes("هزینه بازپرداخت وجه حمل به مشتری")||!deliveryQuoteCheckoutApi.includes("refundLedgerLines"))throw new Error("Refund accounting must return the customer's shipping charge without silently extinguishing the carrier payable");
console.log("MARKETPLACE_DELIVERY_QUOTE_ADDRESS_AND_REFUND_INTEGRITY_OK");
if(!deliveryQuoteCheckoutApi.includes("const [items,payment,refund,deliveryQuote]=await Promise.all([")||!deliveryQuoteCheckoutApi.includes("deliveryQuote:deliveryQuote.rows[0]||null"))throw new Error("Order detail must correctly resolve and return the active delivery quote query result");
if(!deliveryQuoteCheckoutApi.includes("debit:Math.min(refundCustomerShipping,refundCarrierCost)"))throw new Error("Shipping refund journal must reverse delivery margin and recognize only the carrier-cost portion as refund expense");
console.log("MARKETPLACE_DELIVERY_QUOTE_ORDER_DETAIL_AND_REFUND_BALANCE_OK");
const deliveryQuoteTrackingApi=read("apps/api/src/logistics.ts");
const deliveryQuoteTrackingPage=read("apps/web/app/account/orders/[id]/tracking/page.tsx");
const deliveryQuoteTrackingCss=read("apps/web/app/account/orders/[id]/tracking/tracking-workspace.css");
const deliveryQuoteShippingPage=read("apps/web/app/marketplace/shipping/page.tsx");
if(!deliveryQuoteMarketplaceApi.includes("o.delivery_quote_id,o.delivery_quote_snapshot,o.delivery_quote_required"))throw new Error("Marketplace order history must expose the accepted delivery quote snapshot");
if(!deliveryQuoteTrackingApi.includes("delivery_quote_snapshot,delivery_quote_required,shipping_amount,total_amount,currency"))throw new Error("Customer tracking API must expose accepted delivery quote and final order amounts");
if(!deliveryQuoteTrackingApi.includes("mo.delivery_quote_snapshot,mo.shipping_amount,mo.total_amount,mo.currency"))throw new Error("Logistics shipment list must expose accepted delivery quote amounts");
if(!deliveryQuoteTrackingPage.includes("هزینه ارسال تأییدشده")||!deliveryQuoteTrackingPage.includes("در انتظار تأیید هزینه ارسال")||!deliveryQuoteTrackingCss.includes(".tracking-quote-summary"))throw new Error("Customer tracking must display delivery charge status before and after shipment creation");
if(!deliveryQuoteShippingPage.includes("هزینه حمل تأییدشده مشتری")||!deliveryQuoteShippingPage.includes("هزینه ارسال مصوب"))throw new Error("Logistics order and shipment cards must display accepted delivery charge");
console.log("MARKETPLACE_DELIVERY_QUOTE_TRACKING_AND_LOGISTICS_VISIBILITY_OK");






const carrierInvoiceMigration=read("database/migrations/159_logistics_carrier_invoice_reconciliation.sql");
const carrierInvoiceApi=read("apps/api/src/logistics.ts");
const carrierInvoicePage=read("apps/web/app/marketplace/shipping/carrier-invoices/page.tsx");
const carrierInvoiceCss=read("apps/web/app/marketplace/shipping/carrier-invoices/carrier-invoices.css");
if(!carrierInvoiceMigration.includes("logistics_carrier_invoices")||!carrierInvoiceMigration.includes("unique index if not exists uq_logistics_carrier_invoice_active_shipment")||!carrierInvoiceMigration.includes("variance_amount numeric(20,2)"))throw new Error("Carrier invoice reconciliation migration must persist one active invoice per shipment and its amount variance");
if(!carrierInvoiceApi.includes("/api/logistics/carrier-invoices")||!carrierInvoiceApi.includes("shipment_status!==\"delivered\"||source.order_status!==\"delivered\"")||!carrierInvoiceApi.includes("source.quote_status!==\"accepted\""))throw new Error("Carrier invoice capture must require a delivered marketplace order and an accepted delivery quote");
if(!carrierInvoiceApi.includes("Math.abs(variance)<=0.005?\"matched\":\"disputed\"")||!carrierInvoiceApi.includes("برای تأیید اختلاف مبلغ، توضیح تصمیم الزامی است"))throw new Error("Carrier invoice reconciliation must flag variances and require an approval explanation");
if(!carrierInvoiceApi.includes("logistics.carrier_invoice_recorded")||!carrierInvoiceApi.includes("logistics.carrier_invoice_approved"))throw new Error("Carrier invoice creation and approval must be audited");
if(!carrierInvoiceApi.includes("logistics_carrier_invoices")||!carrierInvoiceApi.includes("accounting_receivable_payables")||!carrierInvoiceApi.includes("postLedgerEntry")||!carrierInvoiceApi.includes("logistics_carrier_invoice_adjustment"))throw new Error("Carrier invoice approval must create the supplier payable and post only the invoice variance to the existing ledger");
if(!carrierInvoicePage.includes("صورتحساب شرکت‌های حمل")||!carrierInvoicePage.includes("تأیید و ثبت بدهی")||!carrierInvoicePage.includes("supplierByInvoice"))throw new Error("Carrier invoice workspace must require an accounting supplier and expose payable registration");
if(!carrierInvoiceCss.includes(".carrier-invoice-row")||!read("apps/web/app/marketplace/shipping/page.tsx").includes("/marketplace/shipping/carrier-invoices"))throw new Error("Carrier invoice workspace must be styled and linked from shipping operations");
console.log("MARKETPLACE_CARRIER_INVOICE_RECONCILIATION_INTEGRITY_OK");

const carrierInvoiceFinanceMigration=read("database/migrations/160_logistics_carrier_invoice_finance_link.sql");
if(!carrierInvoiceFinanceMigration.includes("party_id")||!carrierInvoiceFinanceMigration.includes("payable_id")||!carrierInvoiceFinanceMigration.includes("ledger_adjustment_entry_id"))throw new Error("Carrier invoices must link to the existing supplier, payable subledger and ledger adjustment");
if(!carrierInvoiceApi.includes("party_type='supplier'")||!carrierInvoiceApi.includes("invoice_amount")||!carrierInvoiceApi.includes("variance>0"))throw new Error("Carrier invoice approval must validate a supplier and use actual invoice amount plus signed variance");
if(!carrierInvoiceApi.includes("revenueReduction")||!carrierInvoiceApi.includes("expenseReduction")||!carrierInvoiceApi.includes("invoiceAmount<=0"))throw new Error("Carrier invoice variance must preserve the original shipping margin and cost split and require a positive invoice");
console.log("MARKETPLACE_CARRIER_INVOICE_FINANCE_LINK_INTEGRITY_OK");

const carrierInvoiceSettlementMigration=read("database/migrations/161_accounting_payable_settlements.sql");
if(!carrierInvoiceSettlementMigration.includes("accounting_rp_settlements")||!carrierInvoiceSettlementMigration.includes("idempotency_key")||!carrierInvoiceSettlementMigration.includes("ledger_entry_id"))throw new Error("Payable settlements must be auditable and idempotent in the existing accounting subledger");
if(!carrierInvoiceApi.includes("/api/logistics/carrier-invoices/:id/pay")||!carrierInvoiceApi.includes("accounting_rp_settlements")||!carrierInvoiceApi.includes("accounting_bank_accounts")||!carrierInvoiceApi.includes("accounting_rp_settlement"))throw new Error("Carrier payable payments must use mapped accounting bank accounts and post a balanced ledger entry");
if(carrierInvoiceApi.includes("l.is_active=true")||carrierInvoiceApi.includes("l.is_postable=true")||!carrierInvoiceApi.includes("l.status='active'"))throw new Error("Carrier payment bank mapping must use the existing ledger account status schema");

if(!carrierInvoiceApi.includes("settled_amount")||!carrierInvoiceApi.includes("current_balance=current_balance-$1")||!carrierInvoiceApi.includes("ledger_code"))throw new Error("Carrier payable settlement must update the payable balance and mapped bank balance");
if(!carrierInvoiceApi.includes("on conflict(tenant_id,idempotency_key) do nothing returning *")||!carrierInvoiceApi.includes("metadata->>'sourceId' source_id")||!carrierInvoiceApi.includes("کلید یکتای پرداخت قبلاً برای صورتحساب دیگری استفاده شده است"))throw new Error("Carrier payment retries must be concurrency-safe and scoped to the original invoice");
if(!carrierInvoiceApi.includes("payment_history")||!carrierInvoiceApi.includes("accounting_rp_settlements rs")||!carrierInvoicePage.includes("سوابق پرداخت")||!carrierInvoicePage.includes("payment_history.map"))throw new Error("Carrier invoice workspace must expose auditable partial payment history");

if(!carrierInvoicePage.includes("ثبت پرداخت انجام‌شده")||!carrierInvoicePage.includes("شماره مرجع انتقال")||!carrierInvoicePage.includes("data.bankAccounts"))throw new Error("Carrier invoice workspace must support documented payment from mapped bank accounts");
if(!carrierInvoiceCss.includes(".carrier-invoice-payment"))throw new Error("Carrier invoice settlement controls must have responsive styling");
if(!carrierInvoiceApi.includes("approved_payable_total")||!carrierInvoiceApi.includes("outstanding_total")||!carrierInvoiceApi.includes("group by i.currency")||!carrierInvoicePage.includes("خلاصه مالی شرکت‌های حمل")||!carrierInvoicePage.includes("row.outstanding_total")||!carrierInvoiceCss.includes(".carrier-invoice-summary-grid"))throw new Error("Carrier invoice financial summary must be currency-scoped and visible in the workspace");
const treasurySettlementMigration=read("database/migrations/162_treasury_carrier_settlement_reconciliation.sql");
const treasuryBankApi=read("apps/api/src/treasury-bank.ts");
const treasuryBankPage=read("apps/web/app/modules/TreasuryBankWorkspace.tsx");
const treasuryBankCss=read("apps/web/app/modules/TreasuryBankWorkspace.module.css");
if(!treasurySettlementMigration.includes("payable_settlement_id")||!treasurySettlementMigration.includes("uq_treasury_bank_transaction_payable_settlement"))throw new Error("Treasury statement settlement link migration is missing its unique tenant-scoped link");
for(const marker of ["carrier_settlement_candidates","s.metadata->>'sourceType'='carrier_invoice'","s.reference_no=x.reference_no","s.amount=x.amount","s.currency=b.currency","payable_settlement_id=$1"])if(!treasuryBankApi.includes(marker))throw new Error("Treasury reconciliation is missing strict carrier payment match validation: "+marker);
for(const marker of ["carrier_settlement_candidates","payableSettlementId","تطبیق با پرداخت ثبت‌شده"])if(!treasuryBankPage.includes(marker))throw new Error("Treasury workspace is missing carrier settlement reconciliation controls: "+marker);
if(!treasuryBankCss.includes(".settlementCandidate"))throw new Error("Treasury carrier settlement match styling is missing");
const sellerSettlementPayablesMigration=read("database/migrations/163_marketplace_seller_settlement_payables.sql");
const sellerSettlementApi=read("apps/api/src/domain-settlement.ts");
const sellerSettlementPage=read("apps/web/app/marketplace/settlements/page.tsx");
const sellerSettlementCss=read("apps/web/app/marketplace/settlements/settlements-workspace.css");
if(!sellerSettlementPayablesMigration.includes("accounting_party_id")||!sellerSettlementPayablesMigration.includes("payable_id uuid references accounting_receivable_payables")||!sellerSettlementPayablesMigration.includes("'partially_paid'"))throw new Error("Seller settlement payable migration must map sellers to supplier parties and support partial payment");
for(const marker of ["accounting_rp_settlements","sourceType:","bank.ledger_code","on conflict(tenant_id,idempotency_key) do nothing","partially_paid","payment_history"])if(!sellerSettlementApi.includes(marker))throw new Error("Seller settlement accounting payment workflow is incomplete: "+marker);
for(const marker of ["تأیید و ایجاد بدهی مالی","ثبت پرداخت و سند بانکی","انتقال وجه در درگاه بانک انجام نمی‌شود","payment_history","bankAccounts","seller-settlement-summary","outstanding_total"])if(!sellerSettlementPage.includes(marker))throw new Error("Seller settlement workspace is missing bank payment or summary operations: "+marker);
for(const marker of ["group by upper(coalesce(nullif(trim(ss.currency)","outstanding_total","partially_paid_count"])if(!sellerSettlementApi.includes(marker))throw new Error("Seller settlement financial summary must be grouped by currency and payment state: "+marker);
for(const marker of [".seller-settlement-payment",".seller-settlement-history",".settlement-pay"])if(!sellerSettlementCss.includes(marker))throw new Error("Seller settlement payment styles are missing: "+marker);
for(const marker of ["s.metadata->>'sourceType' in ('carrier_invoice','seller_settlement')","s.reference_no=x.reference_no","s.amount=x.amount","s.currency=b.currency"])if(!treasuryBankApi.includes(marker))throw new Error("Treasury statement reconciliation must validate seller settlement reference, amount and currency: "+marker);
if(!treasuryBankPage.includes("تطبیق با پرداخت ثبت‌شده")||!treasuryBankPage.includes("seller_name"))throw new Error("Treasury reconciliation UI must identify seller payment candidates");
const canonicalBankLinkMigration=read("database/migrations/164_treasury_accounting_bank_account_link.sql");
if(!canonicalBankLinkMigration.includes("accounting_bank_account_id")||!canonicalBankLinkMigration.includes("having count(distinct ab.id)=1")||!canonicalBankLinkMigration.includes("uq_treasury_bank_account_accounting_link"))throw new Error("Treasury accounts must link only to one exact, currency-matched accounting bank account");
for(const marker of ["accounting_bank_account_id","accounting_bank_accounts ab","upper(trim(ab.currency))","matches.rowCount===1"])if(!treasuryBankApi.includes(marker))throw new Error("Treasury account creation or overview is missing canonical accounting-bank linking: "+marker);
for(const marker of ["accounting_code","ledger_code","accounting_current_balance","اتصال حسابداری","حساب متناظر حسابداری یافت نشد","مانده حساب خزانه"])if(!treasuryBankPage.includes(marker))throw new Error("Treasury account workspace must show canonical accounting-bank linkage and balance state: "+marker);
const bankStatementMatchMigration=read("database/migrations/165_accounting_bank_statement_line_reconciliation.sql");
const accountingOperationsApi=read("apps/api/src/accounting-finance-operations.ts");
const accountingFinancePage=read("apps/web/app/modules/AccountingFinanceWorkspace.tsx");
if(!bankStatementMatchMigration.includes("accounting_bank_reconciliation_matches")||!bankStatementMatchMigration.includes("unique(tenant_id,treasury_transaction_id)")||!bankStatementMatchMigration.includes("unique(tenant_id,accounting_document_line_id)"))throw new Error("Bank statement line matching must prevent duplicate transaction and ledger-line matches");
for(const marker of ["/bank-reconciliations/from-treasury","/bank-reconciliations/:id/workspace","/bank-reconciliations/:id/matches","d.status='posted'","ledger_account_id","treasury_bank_account_id","تا تعیین تکلیف تمام گردش‌های صورت‌حساب","تأیید نهایی فقط پس از تطبیق کامل"])if(!accountingOperationsApi.includes(marker))throw new Error("Accounting bank reconciliation API is missing statement-to-ledger controls: "+marker);
for(const marker of ["bank-reconciliation","from-treasury","candidate_lines","accountingDocumentLineId","نهایی‌سازی تطبیق","مانده دفترکل از اسناد قطعی"])if(!accountingFinancePage.includes(marker))throw new Error("Accounting finance workspace is missing bank statement matching UI: "+marker);
const bankStatementImportMigration=read("database/migrations/166_treasury_bank_statement_import_and_fee_review.sql");
const treasuryImportApi=read("apps/api/src/treasury-bank.ts");
const accountingFeeDraftApi=read("apps/api/src/accounting-finance-operations.ts");
const treasuryImportPage=read("apps/web/app/modules/TreasuryBankWorkspace.tsx");
const treasuryImportCss=read("apps/web/app/modules/TreasuryBankWorkspace.module.css");
if(!bankStatementImportMigration.includes("treasury_bank_statement_imports")||!bankStatementImportMigration.includes("uq_treasury_bank_transaction_import_fingerprint")||!bankStatementImportMigration.includes("fee_journal_document_id"))throw new Error("Bank statement import migration must track batches, deduplication fingerprints and fee journal links");
for(const marker of ["/api/treasury-bank/statement-imports","router.get(\"/api/treasury-bank/statement-imports/:id\"","createHash(\"sha256\")","on conflict do nothing","fee_candidate_reason","ردیف نامعتبر است"])if(!treasuryImportApi.includes(marker))throw new Error("Treasury CSV import must validate rows, classify fees and prevent duplicate imports: "+marker);
for(const marker of ["/bank-fees/draft-document","bank_fee_import","fee_journal_document_id is null","bank_ledger_account_id",'status:"draft"'])if(!accountingFeeDraftApi.includes(marker))throw new Error("Bank fee draft journal API must remain reviewable and idempotent: "+marker);
for(const marker of ["parseStatementCsv","activeImportId","/api/treasury-bank/statement-imports","fee_candidate","ایجاد پیش‌نویس سند","CSV"])if(!treasuryImportPage.includes(marker))throw new Error("Treasury UI is missing statement import or fee review workflow: "+marker);
for(const marker of [".importSummary",".feeFlag",".feeSelect"])if(!treasuryImportCss.includes(marker))throw new Error("Treasury statement import styles are missing: "+marker);
const bankBalanceAnomalyMigration=read("database/migrations/167_treasury_statement_balance_anomaly_review.sql");
if(!bankBalanceAnomalyMigration.includes("balance_anomaly boolean")||!bankBalanceAnomalyMigration.includes("balance_anomaly_reason"))throw new Error("Statement balance anomaly review columns are missing");
for(const marker of ["balanceAnomalyReason","balance_anomaly_reason","balance_anomaly_count","monotonic&&i<validRows.length"])if(!treasuryImportApi.includes(marker))throw new Error("Statement import must detect sequential running-balance inconsistencies safely: "+marker);
if(!treasuryImportPage.includes("balance_anomaly")||!treasuryImportPage.includes("اختلاف مانده"))throw new Error("Treasury workspace must display imported running-balance anomalies");
if(!treasuryImportCss.includes(".balanceFlag"))throw new Error("Statement balance anomaly warning style is missing");
console.log("TREASURY_BANK_STATEMENT_BALANCE_ANOMALY_INTEGRITY_OK");
console.log("TREASURY_BANK_STATEMENT_IMPORT_AND_FEE_REVIEW_INTEGRITY_OK");
console.log("ACCOUNTING_BANK_STATEMENT_LINE_RECONCILIATION_INTEGRITY_OK");
console.log("TREASURY_CANONICAL_ACCOUNTING_BANK_LINK_INTEGRITY_OK");
console.log("MARKETPLACE_SELLER_SETTLEMENT_BANK_PAYMENT_INTEGRITY_OK");
console.log("TREASURY_CARRIER_PAYABLE_BANK_RECONCILIATION_INTEGRITY_OK");
console.log("MARKETPLACE_CARRIER_INVOICE_SETTLEMENT_INTEGRITY_OK");

