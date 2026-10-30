import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const file = process.argv[2] || "/tmp/legacy-migration.json";
const input = JSON.parse(await readFile(file, "utf8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

function digits(value) {
  return String(value || "").replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");
}
function phone(value) {
  let n = digits(value);
  if (n.startsWith("0098")) n = "0" + n.slice(4);
  else if (n.startsWith("98") && n.length === 12) n = "0" + n.slice(2);
  else if (n.length === 10 && n.startsWith("9")) n = "0" + n;
  return /^09\d{9}$/.test(n) ? n : null;
}
function nationalCode(value) {
  const n = digits(value);
  if (!/^\d{10}$/.test(n) || /^(\d)\1{9}$/.test(n)) return null;
  const sum = n.slice(0,9).split("").reduce((a,d,i)=>a+Number(d)*(10-i),0)%11;
  return (sum < 2 ? Number(n[9]) === sum : Number(n[9]) === 11-sum) ? n : null;
}
function role(value) {
  const r = String(value || "").toLowerCase();
  if (r.includes("superadmin") || r.includes("super admin")) return "superadmin";
  if (r.split(",").some(x => x.trim() === "admin") || r.includes("admin")) return "admin";
  return "customer";
}
function dateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

let usersInserted = 0, usersSkipped = 0, customersInserted = 0, templatesInserted = 0;
let inaccessibleFallbackHash = null;
try {
  await pool.query("BEGIN");
  for (const u of input.users || []) {
    if (!u.legacyId) { usersSkipped++; continue; }
    const userPhone = phone(u.phone);
    const username = String(u.username || u.email || ("legacy_" + u.legacyId)).trim().slice(0,80);
    const fullName = String(u.fullName || "").trim().replace(/\s+/g," ").slice(0,160) || username;
    const rawHash = String(u.passwordHash || "").trim();
    // Missing legacy passwords must never become usable credentials. Generate one
    // random, undisclosed hash per batch instead of running bcrypt once per account.
    if (!rawHash && !inaccessibleFallbackHash) {
      inaccessibleFallbackHash = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12);
    }
    const passwordHash = rawHash ? "aspnet:" + rawHash : inaccessibleFallbackHash;
    const r = await pool.query(
      "INSERT INTO users(username,phone,full_name,national_code,email,password_hash,role,is_active,created_at,legacy_source,legacy_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz,NOW()),'aspnetusers',$10) ON CONFLICT DO NOTHING",
      [username,userPhone,fullName,nationalCode(u.nationalCode),u.email ? String(u.email).trim().slice(0,254) : null,passwordHash,role(u.roles),u.isActive !== false && u.isActive !== 0,dateOrNull(u.createdAt),String(u.legacyId)]
    );
    if (r.rowCount) usersInserted++; else {
      usersSkipped++;
      // Reconcile the trusted legacy identity even when a previous import created the modern row first.
      // Match by the exact legacy username or normalized phone; never overwrite passwords or contact details.
      await pool.query(
        "UPDATE users SET role=$1,is_active=$2,legacy_source=COALESCE(legacy_source,'aspnetusers'),legacy_id=COALESCE(legacy_id,$3),updated_at=NOW() WHERE (legacy_source='aspnetusers' AND legacy_id=$3) OR lower(username)=lower($4) OR ($5::text IS NOT NULL AND phone=$5)",
        [role(u.roles),u.isActive !== false && u.isActive !== 0,String(u.legacyId),username,userPhone]
      );
    }
  }
  for (const x of input.customers || []) {
    if (!x.legacyId) continue;
    const r = await pool.query(
      "INSERT INTO legacy_customers(legacy_id,name,mobile,email,customer_code,registered_at,expires_at,is_permanent,purchased,affiliate_code,parked_domain) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(legacy_id) DO NOTHING",
      [x.legacyId,x.name||null,phone(x.mobile),x.email||null,Number.isInteger(Number(x.code))?Number(x.code):null,dateOrNull(x.createdAt),dateOrNull(x.expiresAt),x.permanent ?? null,x.purchased ?? null,x.affiliateCode||null,x.parkedDomain||null]
    );
    if (r.rowCount) customersInserted++;
  }
  for (const x of input.smsPatterns || []) {
    if (!x.legacyId || !String(x.title||"").trim() || typeof x.pattern !== "string") continue;
    const r = await pool.query(
      "INSERT INTO sms_templates(legacy_id,title,body,is_system,status,category,provider_panel,is_pattern_base,pattern_base_code,reject_reason,legacy_customer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(legacy_id) DO NOTHING",
      [x.legacyId,String(x.title).slice(0,200),x.pattern,Boolean(x.isSystem),Number(x.status)||0,Number(x.category)||0,Number(x.providerPanel)||0,Boolean(x.isPatternBase),x.patternBaseCode||null,x.rejectReason||null,x.legacyCustomerId||null]
    );
    if (r.rowCount) templatesInserted++;
  }
  let purchasePlansInserted = 0, loanStatusesInserted = 0;
  for (const [sourceTable, rows, counter] of [
    ["CustomerPurchasePlan", input.purchasePlans || [], "plans"],
    ["LoanRequestStatuses", input.loanRequestStatuses || [], "statuses"],
    ["AspNetRoles", input.identityRoles || [], "identity"],
    ["AspNetUserRoles", input.identityUserRoles || [], "identity"],
    ["AspNetUserClaims", input.identityClaims || [], "identity"]
  ]) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const legacyId = String(row.legacyRow ?? row.Id ?? row.id ?? (i + 1));
      const result = await pool.query(
        "INSERT INTO legacy_source_data(source_table,legacy_id,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(source_table,legacy_id) DO NOTHING",
        [sourceTable, legacyId, JSON.stringify(row)]
      );
      if (result.rowCount) {
        if (counter === "plans") purchasePlansInserted++;
        else if (counter === "statuses") loanStatusesInserted++;
      }
    }
  }
  let schemaDefinitionsInserted = 0;
  for (const definition of input.schemaDefinitions || []) {
    const sourceTable = String(definition.sourceTable || "").slice(0,120);
    if (!sourceTable) continue;
    const result = await pool.query(
      "INSERT INTO legacy_source_data(source_table,legacy_id,payload) VALUES('__legacy_schema__',$1,$2::jsonb) ON CONFLICT(source_table,legacy_id) DO NOTHING",
      [sourceTable, JSON.stringify(definition)]
    );
    schemaDefinitionsInserted += result.rowCount;
  }
  let genericTablesInserted = 0;
  for (const table of input.genericTables || []) {
    const sourceTable = String(table.sourceTable || "").slice(0,120);
    if (!sourceTable || !Array.isArray(table.rows)) continue;
    const occurrences = new Map();
    const normalized = table.rows.map((entry, index) => {
      if (entry && typeof entry === "object" && Object.hasOwn(entry, "payload") && entry.legacyId != null) {
        return { legacyId: String(entry.legacyId), payload: entry.payload };
      }
      const payload = entry;
      const serialized = JSON.stringify(payload);
      const digest = crypto.createHash("sha256").update(serialized).digest("hex").slice(0,32);
      const count = occurrences.get(digest) || 0;
      occurrences.set(digest, count + 1);
      return { legacyId: digest + ":" + String(count + 1), payload };
    });
    for (let offset = 0; offset < normalized.length; offset += 250) {
      const batch = normalized.slice(offset, offset + 250);
      const values = [];
      const params = [];
      for (let i = 0; i < batch.length; i++) {
        const p = i * 3;
        values.push("($" + (p + 1) + ",$" + (p + 2) + ",$" + (p + 3) + "::jsonb)");
        params.push(sourceTable, batch[i].legacyId, JSON.stringify(batch[i].payload));
      }
      if (!batch.length) continue;
      const result = await pool.query(
        "INSERT INTO legacy_source_data(source_table,legacy_id,payload) VALUES " + values.join(",") +
        " ON CONFLICT(source_table,legacy_id) DO NOTHING",
        params
      );
      genericTablesInserted += result.rowCount;
    }
  }
  await pool.query("COMMIT");
  console.log("LEGACY_TABLE_ROW_COUNTS="+JSON.stringify((input.genericTables||[]).map(t=>({table:t.sourceTable,rows:t.rows.length}))));
  console.log(JSON.stringify({status:"ok",usersInserted,usersSkipped,legacyCustomersInserted:customersInserted,smsTemplatesInserted:templatesInserted,purchasePlansInserted,loanStatusesInserted,genericTablesImported:(input.genericTables||[]).length,genericRowsInserted:genericTablesInserted,schemaDefinitionsInserted}));
} catch (error) {
  await pool.query("ROLLBACK").catch(()=>{});
  console.error("Legacy migration failed; transaction rolled back. Code:", error.code || "unknown");
  process.exitCode = 1;
} finally {
  await pool.end();
}
