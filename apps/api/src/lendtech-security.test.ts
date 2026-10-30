import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./lendtech.ts",import.meta.url),"utf8");

test("every state-changing LendTech POST route requires CSRF protection",()=>{
 const routes=source.split("\n").filter(line=>/lendtechRouter\.post\(/.test(line));
 const mutations=routes.filter(line=>!line.includes("/api/lendtech/installment-quote"));
 assert.equal(mutations.length,21,"all existing LendTech mutation routes must remain present");
 for(const route of mutations)assert.match(route,/requireCsrf/,route.trim());
});

test("installment quote remains a read-only calculation endpoint",()=>{
 const route=source.split("\n").find(line=>line.includes("/api/lendtech/installment-quote"));
 assert.ok(route);
 assert.doesNotMatch(route,/requireCsrf/);
});
