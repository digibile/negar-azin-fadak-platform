import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const ROOT = "/home/digibail/domains/digebail.ir";
const SQLC = "vamcity-stage-sql";
const DB_NAMES = [
  "vamcityc_vamcity_import_20261028",
  "vamcityc_bluvamdb_import_20261028",
  "vamcityc_transferDb_import_20261028"
];
const MAX_BUFFER = 1024 * 1024 * 1024;
const dockerPrefix = (() => {
  try { execFileSync("sudo", ["-n", "docker", "info"], { stdio: "ignore" }); return ["sudo", "-n", "docker"]; }
  catch { execFileSync("docker", ["info"], { stdio: "ignore" }); return ["docker"]; }
})();
function docker(args, options = {}) {
  return execFileSync(dockerPrefix[0], [...dockerPrefix.slice(1), ...args], {
    encoding: "utf8", maxBuffer: MAX_BUFFER, ...options
  });
}
function clean(value) { return String(value ?? "").trim(); }
function shellQuote(value) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
function targetQuery(query) {
  const command = 'export PGPASSWORD="$POSTGRES_PASSWORD"; psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -c ' + shellQuote(query);
  return clean(docker(["compose", "exec", "-T", "db", "sh", "-lc", command], { cwd: ROOT }));
}
function targetCount(sourceTable) {
  const table = String(sourceTable).replace(/'/g, "''");
  const value = Number(targetQuery("SELECT COUNT(*) FROM legacy_source_data WHERE source_table='" + table + "'"));
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Could not verify existing legacy row count");
  return value;
}
function sql(args) {
  return docker(["exec", SQLC, SQLCMD, "-S", "localhost", "-U", "sa", "-P", SA_PASS, "-C", ...args]);
}
function jsonFromSql(raw, label) {
  const first = raw.indexOf("[");
  const last = raw.lastIndexOf("]");
  if (first < 0 || last < first) {
    if (!raw.trim()) return [];
    throw new Error("SQL JSON array missing for " + label + ": " + raw.slice(-500));
  }
  return JSON.parse(raw.slice(first, last + 1).replace(/[\r\n]/g, ""));
}
function queryRows(db, query, label) {
  const raw = sql(["-b", "-w", "65535", "-y", "0", "-d", db, "-Q", query]);
  return jsonFromSql(raw, label);
}
function importInput(tempDir, input, label) {
  const path = join(tempDir, "legacy-migration.json");
  writeFileSync(path, JSON.stringify(input), { mode: 0o644 });
  let out;
  try {
    // Isolate the heavy migration process from the live web container.
    out = docker([
      "compose", "run", "--rm", "-T", "--no-deps",
      "-v", path + ":/tmp/legacy-migration.json:ro",
      "app", "node", "/app/scripts/migrate-legacy-digibail.js", "/tmp/legacy-migration.json"
    ], { cwd: ROOT });
  } catch (error) {
    let diagnostic = [error?.stdout, error?.stderr, error?.message].map(value => String(value || "")).join("\n");
    if (SA_PASS) diagnostic = diagnostic.split(SA_PASS).join("[REDACTED]");
    diagnostic = diagnostic.replace(/-P\s+\S+/g, "-P [REDACTED]").slice(-1200);
    console.error("IMPORT_BATCH_FAILED=" + label + " exit=" + String(error?.status ?? "unknown") +
      " signal=" + String(error?.signal ?? "none") + " code=" + String(error?.code ?? "none") +
      " stdout_bytes=" + String(String(error?.stdout || "").length) +
      " stderr_bytes=" + String(String(error?.stderr || "").length) + " " + diagnostic);
    throw new Error("Import batch failed; diagnostic details filtered");
  }
  const line = out.split("\n").filter(x => x.trim()).slice(-2).join(" ");
  console.log("IMPORT_BATCH=" + label + " " + line);
}
let SQLCMD = "";
let SA_PASS = "";
const tempDir = mkdtempSync(join(tmpdir(), "vamcity-real-data-"));
try {
  SQLCMD = clean(docker(["exec", SQLC, "sh", "-lc", "command -v /opt/mssql-tools18/bin/sqlcmd || command -v /opt/mssql-tools/bin/sqlcmd || command -v sqlcmd"])).split("\n")[0];
  SA_PASS = clean(docker(["exec", SQLC, "printenv", "MSSQL_SA_PASSWORD"]));
  if (!SQLCMD || !SA_PASS) throw new Error("SQL Server connection unavailable");
  docker(["compose", "config", "-q"], { cwd: ROOT });
  const online = clean(sql(["-h", "-1", "-W", "-Q",
    "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name IN ('" +
    DB_NAMES.join("','") + "') AND state_desc='ONLINE';"])).replace(/\s/g, "");
  if (online !== "3") throw new Error("Expected all three isolated restore databases ONLINE, got " + online);

  console.log("SOURCE_DATABASES_ONLINE=" + DB_NAMES.join(","));
  const primary = DB_NAMES[0];
  const coreQueries = {
    users: "SET NOCOUNT ON; SELECT CAST(u.Id AS nvarchar(40)) AS legacyId, NULLIF(LTRIM(RTRIM(u.UserName)),'') AS username, NULLIF(LTRIM(RTRIM(CONCAT(ISNULL(u.FirstName,''),' ',ISNULL(u.LastName,'')))),'') AS fullName, NULLIF(LTRIM(RTRIM(u.Email)),'') AS email, NULLIF(LTRIM(RTRIM(u.NationalCode)),'') AS nationalCode, NULLIF(LTRIM(RTRIM(u.PasswordHash)),'') AS passwordHash, CAST(u.IsActive AS bit) AS isActive, COALESCE(NULLIF(LTRIM(RTRIM(u.Mobile)),''),NULLIF(LTRIM(RTRIM(u.Phone)),'')) AS phone, COALESCE((SELECT STRING_AGG(r.Name, ',') FROM AspNetUserRoles ur JOIN AspNetRoles r ON r.Id=ur.RoleId WHERE ur.UserId=u.Id),'') AS roles, u.RegDate AS createdAt FROM dbo.AspNetUsers u FOR JSON PATH;",
    customers: "SET NOCOUNT ON; SELECT CONVERT(nvarchar(36),Id) AS legacyId, Name AS name, Mobile AS mobile, Email AS email, Code AS code, RegDate AS createdAt, ExpireDate AS expiresAt, Permanent AS permanent, Purchased AS purchased, AffCode AS affiliateCode, ParkDomain AS parkedDomain FROM dbo.Customers FOR JSON PATH;",
    sms: "SET NOCOUNT ON; SELECT CONVERT(nvarchar(36),Id) AS legacyId, Title AS title, Pattern AS pattern, IsSystem AS isSystem, Status AS status, Category AS category, SmsPatternPanel AS providerPanel, IsPatternBase AS isPatternBase, PatternBaseCode AS patternBaseCode, RejectReason AS rejectReason, CONVERT(nvarchar(36),CustomerId) AS legacyCustomerId FROM dbo.SmsPatterns FOR JSON PATH;"
  };
  const core = {};
  for (const [key, query] of Object.entries(coreQueries)) {
    core[key] = queryRows(primary, query, "core " + key);
    console.log("CORE_SOURCE_ROWS_" + key.toUpperCase() + "=" + core[key].length);
  }
  const importedUserRows = targetCount("vamcityc_vamcity_import_20261028.dbo.AspNetUsers");
  const modernLegacyUsers = Number(targetQuery("SELECT COUNT(*) FROM users WHERE legacy_source='aspnetusers'"));
  if (importedUserRows >= core.users.length && modernLegacyUsers > 0) {
    console.log("SKIP_CORE_USERS_ALREADY_MIGRATED=1 source_rows=" + core.users.length + " raw_rows=" + importedUserRows + " modern_rows=" + modernLegacyUsers);
  } else {
    for (let offset = 0; offset < core.users.length; offset += 500) {
      const batch = core.users.slice(offset, offset + 500);
      importInput(tempDir, { users: batch, customers: [], smsPatterns: [] },
        "users " + (offset + 1) + "-" + (offset + batch.length));
      if ((offset + batch.length) % 5000 === 0 || offset + batch.length === core.users.length) {
        console.log("CORE_USERS_IMPORTED=" + (offset + batch.length) + "/" + core.users.length);
      }
    }
  }
  importInput(tempDir, { users: [], customers: core.customers, smsPatterns: core.sms }, "customers and SMS templates");

  let totalSourceRows = 0;
  let totalTables = 0;
  for (const db of DB_NAMES) {
    console.log("BEGIN_SOURCE_DATABASE=" + db);
    const tableRaw = sql(["-b", "-h", "-1", "-W", "-s", "|", "-d", db, "-Q",
      "SET NOCOUNT ON; SELECT s.name+'|'+t.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name;"]);
    const tables = tableRaw.split(/\r?\n/).map(line => {
      const ix = line.indexOf("|");
      if (ix < 0) return null;
      return { schema: clean(line.slice(0, ix)), table: clean(line.slice(ix + 1)) };
    }).filter(x => x && x.schema && x.table);
    console.log("SOURCE_TABLE_COUNT=" + db + ":" + tables.length);
    let tableNo = 0;
    for (const item of tables) {
      tableNo++;
      const schemaQ = item.schema.replace(/]/g, "]]");
      const tableQ = item.table.replace(/]/g, "]]");
      const fullName = db + "." + item.schema + "." + item.table;
      let sourceTable = fullName;
      if (sourceTable.length > 120) sourceTable = sourceTable.slice(0, 100) + "_" + crypto.createHash("sha256").update(fullName).digest("hex").slice(0, 16);
      console.log("EXPORT_TABLE=" + fullName);
      let rows;
      try {
        rows = queryRows(db, "SET NOCOUNT ON; SELECT * FROM [" + schemaQ + "].[" + tableQ + "] FOR JSON PATH, INCLUDE_NULL_VALUES;", fullName);
      } catch (err) {
        console.error("TABLE_EXPORT_FAILED=" + fullName + "; diagnostic details suppressed");
        throw err;
      }
      console.log("SOURCE_ROW_COUNT=" + fullName + ":" + rows.length);
      totalSourceRows += rows.length;
      const alreadyImported = targetCount(sourceTable);
      if (alreadyImported >= rows.length) {
        console.log("SKIP_ALREADY_IMPORTED_TABLE=1 TABLE=" + fullName + " source_rows=" + rows.length + " target_rows=" + alreadyImported);
        totalTables++;
        continue;
      }
      console.log("RESUME_PARTIAL_TABLE=1 TABLE=" + fullName + " source_rows=" + rows.length + " target_rows=" + alreadyImported);
      for (let offset = 0; offset < rows.length; offset += 1000) {
        const batch = rows.slice(offset, offset + 1000).map((payload, i) => ({
          legacyId: String(offset + i + 1),
          payload
        }));
        importInput(tempDir, {
          genericTables: [{ sourceTable, rows: batch }]
        }, sourceTable + " rows " + (offset + 1) + "-" + (offset + batch.length));
      }
      totalTables++;
      if (tableNo % 10 === 0) console.log("PROGRESS_DATABASE=" + db + " TABLES_DONE=" + tableNo + "/" + tables.length);
    }
    console.log("END_SOURCE_DATABASE=" + db + " TABLES=" + tables.length);
  }

  console.log("TOTAL_SOURCE_TABLES_IMPORTED=" + totalTables);
  console.log("TOTAL_SOURCE_ROWS_EXPORTED=" + totalSourceRows);
  console.log("IMPORT_SCRIPT_FINISHED=1");
} catch (error) {
  console.error("VAMCITY_IMPORT_FAILED=SQL export/import failed; sensitive command details suppressed.");
  process.exitCode = 1;
} finally {
  if (SA_PASS) SA_PASS = "";
  rmSync(tempDir, { recursive: true, force: true });
}
