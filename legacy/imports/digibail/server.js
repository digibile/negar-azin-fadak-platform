import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dbHealth, handleApi, verifyAdminSession, verifySession } from "./backend/api.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT || "1631", 10);
const HOST = process.env.HOST || "0.0.0.0";
const ROUTES = new Map([
  ["/", "web/template-v3.html"], ["/index.html", "web/template-v3.html"],
  ["/login.html", "backend/security/login-v2.html"], ["/register.html", "backend/security/register-v2.html"],
  ["/documents.html", "web/documents.html"], ["/contracts.html", "web/contracts.html"],
  ["/loan-definition.html", "web/loan-definition.html"],
  ["/loan-requests.html", "web/loan-requests.html"],
  ["/agents.html", "web/agents.html"],
  ["/customers.html", "web/customers.html"],
  ["/terms.html", "web/terms.html"], ["/privacy.html", "web/privacy.html"],
  ["/profile.html", "web/customer-panel.html"],
  ["/admin.html", "backend/core/panel.html"], ["/management-panel.html", "backend/core/panel.html"],
  ["/sms-settings.html", "web/sms-settings.html"]
]);
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };

export function resolveRoute(urlPath) { return ROUTES.get(urlPath) ?? null; }
function send(res, status, type, value) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(value);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname === "/healthz") {
    try {
      await dbHealth();
      return send(res, 200, "application/json; charset=utf-8", JSON.stringify({ status: "ok", database: "ok", port: PORT }));
    } catch {
      return send(res, 503, "application/json; charset=utf-8", JSON.stringify({ status: "degraded", database: "unavailable" }));
    }
  }
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    if (!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      return send(res, 405, "application/json; charset=utf-8", JSON.stringify({ message: "روش درخواست مجاز نیست." }));
    }
    const handled = await handleApi(req, res, url);
    if (handled !== false) return;
    return send(res, 404, "application/json; charset=utf-8", JSON.stringify({ message: "مسیر API پیدا نشد." }));
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return send(res, 405, "application/json; charset=utf-8", JSON.stringify({ error: "method_not_allowed" }));
  }
  const relative = resolveRoute(url.pathname);
  if (url.pathname === "/admin") {
    res.writeHead(302, { Location: "/admin.html", "Cache-Control": "no-store" });
    return res.end();
  }
  if (url.pathname === "/panel.html") {
    const isAdmin = await verifyAdminSession(req);
    if (!isAdmin) {
      res.writeHead(302, { Location: "/login.html?next=%2Fadmin.html", "Cache-Control": "no-store" });
      return res.end();
    }
    res.writeHead(302, { Location: "/admin.html", "Cache-Control": "no-store" });
    return res.end();
  }
  if (url.pathname === "/admin.html" || url.pathname === "/management-panel.html" || url.pathname === "/sms-settings.html" || url.pathname === "/loan-definition.html" || url.pathname === "/loan-requests.html" || url.pathname === "/customers.html" || url.pathname === "/agents.html") {
    const isAdmin = await verifyAdminSession(req);
    if (!isAdmin) {
      res.writeHead(302, { Location: `/login.html?next=${encodeURIComponent(url.pathname)}`, "Cache-Control": "no-store" });
      return res.end();
    }
  }
  if (url.pathname === "/profile.html") {
    const session = verifySession(String(req.headers.cookie || "").split(";").map(v=>v.trim()).find(v=>v.startsWith("db_session="))?.slice("db_session=".length) || "");
    if (!session) {
      res.writeHead(302, { Location: "/login.html?next=%2Fprofile.html", "Cache-Control": "no-store" });
      return res.end();
    }
  }
  if (!relative) return send(res, 404, "text/plain; charset=utf-8", req.method === "HEAD" ? "" : "Not found");
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(ROOT + path.sep)) return send(res, 400, "text/plain; charset=utf-8", "Bad request");
  try {
    await stat(target);
    const content = await readFile(target);
    res.writeHead(200, { "Content-Type": MIME[path.extname(target)] || "application/octet-stream" });
    return res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    return send(res, 503, "text/plain; charset=utf-8", "Configured page is missing");
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => console.log(`Digibail app listening on http://${HOST}:${PORT}`));
}
