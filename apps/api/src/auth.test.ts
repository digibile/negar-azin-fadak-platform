import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const auth=fs.readFileSync(new URL("./auth.ts",import.meta.url),"utf8");
const login=fs.readFileSync(new URL("../../web/app/login/page.tsx",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/151_platform_owner_account.sql",import.meta.url),"utf8");

test("canonical and legacy platform super-admin role names are recognized",()=>{
 assert.match(auth,/\["super_admin","superadmin"\]/);
 assert.match(auth,/isPlatformSuperAdminRole\(user\.role\)\)return next\(\)/);
});

test("password and OTP login route both super-admin role spellings to the admin workspace",()=>{
 assert.equal((login.match(/\["super_admin","superadmin","admin","manager"\]\.includes\(role\)\?"\/admin"/g)||[]).length,2);
});

test("platform owner migration links only one active existing super-admin and never creates a user",()=>{
 assert.match(migration,/references users\(id\) on delete restrict/i);
 assert.match(migration,/lower\(u\.role\) in \('super_admin','superadmin'\)/i);
 assert.match(migration,/select count\(\*\) from users candidate/i);
 assert.match(migration,/on conflict\(account_key\) do nothing/i);
 assert.doesNotMatch(migration,/insert into users/i);
 assert.doesNotMatch(migration,/update users/i);
});
