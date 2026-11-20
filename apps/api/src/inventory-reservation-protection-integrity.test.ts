import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const inventory=fs.readFileSync(new URL("./inventory.ts",import.meta.url),"utf8");

test("warehouse issue and transfer documents cannot consume reserved quantities",()=>{
 const start=inventory.indexOf('inventoryRouter.post("/api/inventory/documents/:id/post"');
 const end=inventory.indexOf('inventoryRouter.post("/api/inventory/counts/:id/items"',start);
 const route=inventory.slice(start,end);
 assert.ok(route.includes("select quantity,reserved_quantity from inventory_stock"));
 assert.ok(route.includes("n(cur?.quantity)-n(cur?.reserved_quantity)<q"));
 assert.ok(route.includes("موجودی آزاد پس از کسر رزروها کافی نیست"));
});

test("stock count approval cannot overwrite quantity below active reservations",()=>{
 const start=inventory.indexOf('inventoryRouter.post("/api/inventory/counts/:id/approve"');
 const end=inventory.indexOf('inventoryRouter.get("/api/inventory/counts"',start);
 const route=inventory.slice(start,end);
 assert.ok(route.includes("for update"));
 assert.ok(route.includes("reserved=n(current?.reserved_quantity)"));
 assert.ok(route.includes("if(counted<reserved)"));
 assert.ok(route.includes("مقدار شمارش‌شده از موجودی رزروشده کمتر است"));
 assert.ok(route.includes("await c.query(\"begin\")"));
 assert.ok(route.includes("await c.query(\"commit\")"));
});
