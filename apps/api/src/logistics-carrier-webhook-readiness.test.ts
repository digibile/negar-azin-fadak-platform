import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const server=fs.readFileSync(new URL("./server.ts",import.meta.url),"utf8");
const logistics=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");

test("API preserves raw request bytes for future provider signature verification",()=>{
 assert.match(server,/express\.json\(\{limit:"12mb",verify:\(req,_,buf\)=>\{\(req as any\)\.rawBody=Buffer\.from\(buf\)\}\}\)/);
});

test("CSRF bypass is restricted to the existing payment webhook route",()=>{
 const middleware=server.slice(server.indexOf("app.use((req,res,next)=>"),server.indexOf("app.get(\"/health\""));
 assert.match(middleware,/^app\.use\(\(req,res,next\)=>/);
 assert.ok(middleware.includes("payment-gateways"));
 assert.ok(middleware.includes("webhook"));
 assert.doesNotMatch(middleware,/logistics|carrier/i);
});

test("logistics router is mounted without exposing an unverified public carrier webhook",()=>{
 assert.match(server,/app\.use\(logisticsRouter\)/);
 assert.doesNotMatch(logistics,/logisticsRouter\.(post|put|patch)\([^\n]*carrier[^\n]*webhook/i);
});

test("carrier webhook readiness cannot be inferred from payment provider adapter",()=>{
 const paymentProvider=fs.readFileSync(new URL("./payment-provider.ts",import.meta.url),"utf8");
 assert.match(paymentProvider,/export interface PaymentProvider/);
 assert.doesNotMatch(paymentProvider,/Carrier|Shipment|DeliveryEvent/);
});
