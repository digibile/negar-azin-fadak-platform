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
 assert.match(source,/finally\s*\{\s*client\.release\(\);\s*\}/);
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

test("legal identity edits are routed through a reviewed, owner-scoped change request",()=>{
 assert.match(source,/router\.post\("\/api\/identity\/profile-change-requests",requireAuth,requireCsrf/);
 assert.match(source,/router\.patch\("\/api\/identity\/profile-change-requests\/:id\/review",requireAuth,guardAdmin,requireCsrf/);
 assert.match(source,/ویرایش حساب دیگران مجاز نیست/);
 assert.match(source,/تغییر اطلاعات قانونی باید از مسیر درخواست اصلاح پروفایل/);
});

test("identity change approval checks stale snapshots and records field provenance",()=>{
 assert.match(source,/for update/);
 assert.match(source,/identity_profile_field_provenance/);
 assert.match(source,/reviewer_approved/);
 assert.match(source,/hashProfileValue/);
 assert.match(source,/identity_profile_change_events/);
});
