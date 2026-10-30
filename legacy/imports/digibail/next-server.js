import http from "node:http";
import { spawn } from "node:child_process";
import next from "next";

const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "1631", 10);
const legacyPort = Number.parseInt(process.env.LEGACY_PORT || "1632", 10);
const legacy = spawn(process.execPath, ["start.js"], {
  env: { ...process.env, PORT: String(legacyPort), HOST: "127.0.0.1" },
  stdio: "inherit"
});
legacy.on("exit", code => {
  if (code && code !== 0) {
    console.error("Legacy API process exited with code", code);
    process.exitCode = code;
  }
});

const app = next({ dev: false, hostname: host, port });
const handleNext = app.getRequestHandler();

await app.prepare();
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/" || pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return handleNext(req, res);
  }
  const proxy = http.request({
    hostname: "127.0.0.1",
    port: legacyPort,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${legacyPort}` }
  }, upstream => {
    res.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(res);
  });
  proxy.on("error", error => {
    console.error("Legacy route proxy failed:", error.message);
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "legacy_backend_unavailable" }));
  });
  req.pipe(proxy);
});
server.listen(port, host, () => console.log(`Next.js UI listening on http://${host}:${port}`));
const shutdown = () => {
  server.close();
  legacy.kill("SIGTERM");
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
