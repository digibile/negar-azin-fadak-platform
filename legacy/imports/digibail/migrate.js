import { migrate, closePool } from "./backend/api.js";
try { await migrate(); console.log("Database migrations applied."); }
catch (error) { console.error("Database migration failed:", error.message); process.exitCode = 1; }
finally { await closePool(); }
