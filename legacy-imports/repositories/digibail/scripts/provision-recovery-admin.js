import bcrypt from "bcryptjs";
import { Pool } from "pg";

const username = "digibail-recovery";
const password = String(process.env.RECOVERY_PASSWORD || "");
if (password.length < 40 || !/^[a-f0-9]{48}$/.test(password)) {
  console.error("RECOVERY_PASSWORD must be a 48-character hex secret.");
  process.exit(2);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO users(username,full_name,password_hash,role,is_active) VALUES($1,$2,$3,'superadmin',TRUE) ON CONFLICT(username) DO UPDATE SET full_name=EXCLUDED.full_name,password_hash=EXCLUDED.password_hash,role='superadmin',is_active=TRUE,updated_at=NOW()",
    [username, "مدیر بازیابی دیجی‌بایل", passwordHash]
  );
  console.log("RECOVERY_ADMIN_PROVISIONED=1");
} catch (error) {
  console.error("RECOVERY_ADMIN_PROVISION_FAILED=" + String(error.code || error.message || "unknown").slice(0, 100));
  process.exitCode = 1;
} finally {
  await pool.end();
}
