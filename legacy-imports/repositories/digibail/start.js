import { migrate, closePool } from "./backend/api.js";
import { spawn } from "node:child_process";
try {
  await migrate();
  console.log("Database migrations applied.");
} catch (error) {
  console.error("Database migration failed:", error.message);
  await closePool();
  process.exit(1);
}
// Start the API listener before attempting to drain the migration pool.
 // A pool shutdown must never block the legacy API from binding its health-check port.
const child = spawn(process.execPath, ["server.js"], { stdio: "inherit", env: process.env });
child.on("exit", async code => {
  try { await closePool(); } catch (error) { console.error("Migration pool close failed:", error.message); }
  process.exitCode = code ?? 1;
});
