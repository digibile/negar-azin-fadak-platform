import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./identity.ts",import.meta.url),"utf8");

test("identity overview limits user and security-event data for non-admins",()=>{
 assert.match(source,/where id=\$1.*req\.user\.id/);
 assert.match(source,/where user_id=\$1.*req\.user\.id/);
 assert.match(source,/canViewGlobalAudit:admin/);
});

test("identity role permission replacement is transactional",()=>{
 assert.match(source,/await client\.query\("begin"\)/);
 assert.match(source,/await client\.query\("delete from identity_role_permissions/);
 assert.match(source,/await client\.query\("commit"\)/);
 assert.match(source,/await client\.query\("rollback"\)/);
 assert.match(source,/finally\{client\.release\(\)\}/);
});

test("identity group membership verifies both group and real user",()=>{
 assert.match(source,/select id from identity_groups where id=\$1 and is_active=true/);
 assert.match(source,/select id from users where id=\$1/);
});

test("session revocation is restricted to own sessions for non-admin users",()=>{
 assert.match(source,/where id=\$1 and user_id=\$2 and revoked_at is null returning id/);
 assert.match(source,/if\(!UUID\.test\(String\(req\.params\.id\)\)\)/);
});

test("identity role and account state inputs are validated",()=>{
 assert.match(source,/ROLE_KEY=/);
 assert.match(source,/\["active","pending","suspended"\]/);
 assert.match(source,/یک یا چند مجوز معتبر نیست یا غیرفعال است/);
});
