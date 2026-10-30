import test from "node:test";
import assert from "node:assert/strict";
import { resolveRoute } from "./server.js";

test("root maps to existing Persian storefront", () => {
  assert.equal(resolveRoute("/"), "web/template-v3.html");
});

test("supported pages map to repository files", () => {
  assert.equal(resolveRoute("/login.html"), "backend/security/login-v2.html");
  assert.equal(resolveRoute("/register.html"), "backend/security/register-v2.html");
  assert.equal(resolveRoute("/documents.html"), "web/documents.html");
  assert.equal(resolveRoute("/contracts.html"), "web/contracts.html");
  assert.equal(resolveRoute("/admin.html"), "backend/core/panel.html");
  assert.equal(resolveRoute("/management-panel.html"), "backend/core/panel.html");
  assert.equal(resolveRoute("/loan-definition.html"), "web/loan-definition.html");
  assert.equal(resolveRoute("/loan-requests.html"), "web/loan-requests.html");
  assert.equal(resolveRoute("/agents.html"), "web/agents.html");
  assert.equal(resolveRoute("/customers.html"), "web/customers.html");
  assert.equal(resolveRoute("/profile.html"), "web/customer-panel.html");
  assert.equal(resolveRoute("/panel.html"), null);
});

test("unknown and traversal paths do not map to files", () => {
  assert.equal(resolveRoute("/../../etc/passwd"), null);
  assert.equal(resolveRoute("/missing"), null);
  assert.equal(resolveRoute("/api/v1/security/login"), null);
});

test("health endpoint is handled separately from static pages", () => {
  assert.equal(resolveRoute("/healthz"), null);
});
