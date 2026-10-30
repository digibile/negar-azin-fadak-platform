import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateContractInstallments, evaluateContractCondition, maskContractValue,
  renderContractTemplate, validateContractTemplate,
} from "./contract-engine.js";

const variable = (key: string, dataType: "text"|"number"|"money"|"date" = "text", required = false, format = "") =>
  ({ key, label: key, dataType, required, format });
const defs = (...items: ReturnType<typeof variable>[]) => Object.fromEntries(items.map((item) => [item.key, item]));

test("renders variables and HTML-encodes values", () => {
  const result = renderContractTemplate("سلام {{name}}", defs(variable("name")), () => "<b>x</b>");
  assert.equal(result.html, "سلام &lt;b&gt;x&lt;/b&gt;");
});

test("unknown variables are reported, never silently blank", () => {
  const result = renderContractTemplate("{{missing}}", defs(variable("known")), () => null);
  assert.ok(result.errors.some((error) => error.includes("missing")));
});

test("required values and installment table are reported when missing", () => {
  const result = renderContractTemplate("{{name}}{{installments_table}}", defs(variable("name","text",true)), () => null);
  assert.deepEqual(result.missing.map((item) => item.key).sort(), ["installments_table","name"]);
});

test("if/else, boolean operators and numeric comparisons work", () => {
  const definitions = defs(variable("amount","number"), variable("flag"));
  const template = "{{#if amount >= 100 && flag}}approved{{else}}review{{/if}}";
  assert.equal(renderContractTemplate(template, definitions, (key) => ({amount:150,flag:"yes"}[key as "amount"|"flag"])).html, "approved");
  assert.equal(renderContractTemplate(template, definitions, (key) => ({amount:10,flag:"yes"}[key as "amount"|"flag"])).html, "review");
  assert.equal(evaluateContractCondition("flag == 'yes' || amount > 500", (key) => ({flag:"yes",amount:1}[key as "flag"|"amount"])), true);
});

test("rejects malformed, unclosed and over-nested templates", () => {
  assert.ok(validateContractTemplate("{{#if amount}}unfinished", defs(variable("amount"))).length);
  assert.ok(validateContractTemplate("{{#if process.exit(1)}}bad{{/if}}", defs(variable("amount"))).length);
  const nested = "{{#if a}}".repeat(7) + "x" + "{{/if}}".repeat(7);
  assert.ok(validateContractTemplate(nested, defs(variable("a"))).length);
});

test("installments reconcile exactly and the final row absorbs rounding", () => {
  const result = calculateContractInstallments(10_000_000,10,5,3,30,new Date("2026-01-01T00:00:00Z"));
  assert.equal(result.downPayment,1_000_000);
  assert.equal(result.fee,450_000);
  assert.equal(result.total,9_450_000);
  assert.equal(result.rows.reduce((sum,row)=>sum+row.amount,0),result.total);
});

test("rejects invalid installment inputs", () => {
  assert.throws(() => calculateContractInstallments(0,10,5,3,30,new Date()), /معتبر نیست/);
});

test("masks sensitive values", () => assert.equal(maskContractValue("0499370899"), "•••••••899"));
