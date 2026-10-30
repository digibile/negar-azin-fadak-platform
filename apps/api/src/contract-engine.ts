export type ContractVariable = {
  key: string;
  label: string;
  dataType: "text" | "date" | "number" | "money";
  required?: boolean;
  format?: string;
};

export type ContractInstallment = { no: number; due: Date; amount: number };
export type ContractRenderResult = {
  html: string;
  missing: Array<{ key: string; label: string }>;
  errors: string[];
};

type Node =
  | { type: "text"; value: string }
  | { type: "variable"; key: string }
  | { type: "installments" }
  | { type: "if"; expression: string; yes: Node[]; no: Node[] };

const TOKEN = /\{\{\s*(.+?)\s*\}\}/gs;
const KEY = /^[a-z][a-z0-9_]{0,59}$/;
const ATOM = /^\s*(!?)\s*([a-z][a-z0-9_]*)\s*(?:(==|!=|>=|<=|>|<)\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?)))?\s*$/;
const MAX_BODY = 300_000;
const MAX_DEPTH = 5;
export const INSTALLMENTS_KEY = "installments_table";

function htmlEncode(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function checkExpression(expression: string): string | null {
  if (expression.length > 300) return "عبارت شرط بیش از حد طولانی است";
  const parts = expression.split("||");
  if (!parts.length || parts.some((part) => !part.trim())) return "ساختار شرط نامعتبر است";
  for (const part of parts) {
    const atoms = part.split("&&");
    if (atoms.some((atom) => !ATOM.test(atom))) {
      return "ساختار شرط نامعتبر است؛ نمونه مجاز: key، !key، key >= 100 یا key == 'text'";
    }
  }
  return null;
}

function expressionKeys(expression: string): string[] {
  return expression.split("||").flatMap((part) => part.split("&&"))
    .map((atom) => ATOM.exec(atom)?.[2]).filter((key): key is string => Boolean(key));
}

function parse(body: string): { nodes: Node[] | null; errors: string[] } {
  const errors: string[] = [];
  if (body.length > MAX_BODY) return { nodes: null, errors: ["متن قرارداد بیش از حد طولانی است"] };
  const root: Node[] = [];
  const stack: Array<{ node: Extract<Node, { type: "if" }>; parent: Node[]; inElse: boolean }> = [];
  let current = root;
  let position = 0;
  TOKEN.lastIndex = 0;
  for (const match of body.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > position) current.push({ type: "text", value: body.slice(position, index) });
    position = index + match[0].length;
    const token = match[1].trim().replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
    if (token.startsWith("#if ")) {
      if (stack.length >= MAX_DEPTH) { errors.push("تودرتویی شرط‌ها بیش از ۵ سطح است"); continue; }
      const expression = token.slice(4).trim();
      const issue = checkExpression(expression);
      if (issue) errors.push(`شرط «${expression}»: ${issue}`);
      const node: Extract<Node, { type: "if" }> = { type: "if", expression, yes: [], no: [] };
      current.push(node);
      stack.push({ node, parent: current, inElse: false });
      current = node.yes;
    } else if (token === "else") {
      const frame = stack[stack.length - 1];
      if (!frame || frame.inElse) { errors.push("else بی‌جا یا تکراری است"); continue; }
      frame.inElse = true;
      current = frame.node.no;
    } else if (token === "/if") {
      const frame = stack.pop();
      if (!frame) { errors.push("/if بدون #if است"); continue; }
      current = frame.parent;
    } else if (token === INSTALLMENTS_KEY) {
      current.push({ type: "installments" });
    } else if (KEY.test(token)) {
      current.push({ type: "variable", key: token });
    } else {
      errors.push(`عبارت نامعتبر: {{${token}}}`);
    }
  }
  if (position < body.length) current.push({ type: "text", value: body.slice(position) });
  if (stack.length) errors.push("یک #if بسته نشده است");
  return { nodes: errors.length ? null : root, errors };
}

function truthy(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "boolean") return value;
  return true;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function evaluateAtom(atom: string, get: (key: string) => unknown): boolean {
  const match = ATOM.exec(atom);
  if (!match) return false;
  const [, negate, key, operator, single, double, numberLiteral] = match;
  const value = get(key);
  let result: boolean;
  if (!operator) result = truthy(value);
  else if (numberLiteral !== undefined || [">", "<", ">=", "<="].includes(operator)) {
    const left = numeric(value);
    const right = numberLiteral === undefined ? null : Number(numberLiteral);
    if (left === null || right === null || !Number.isFinite(right)) result = false;
    else result = operator === "==" ? left === right : operator === "!=" ? left !== right
      : operator === ">" ? left > right : operator === "<" ? left < right
      : operator === ">=" ? left >= right : left <= right;
  } else {
    const expected = single ?? double ?? "";
    const actual = value == null ? "" : String(value);
    result = operator === "==" ? actual === expected : actual !== expected;
  }
  return negate ? !result : result;
}

export function evaluateContractCondition(expression: string, get: (key: string) => unknown): boolean {
  if (!expression.trim()) return true;
  if (checkExpression(expression)) return false;
  return expression.split("||").some((part) => part.split("&&").every((atom) => evaluateAtom(atom, get)));
}

export function validateContractTemplate(body: string, definitions: Record<string, ContractVariable>): string[] {
  const parsed = parse(body);
  if (!parsed.nodes) return parsed.errors;
  const keys = new Set<string>();
  const visit = (nodes: Node[]) => nodes.forEach((node) => {
    if (node.type === "variable") keys.add(node.key);
    if (node.type === "installments") keys.add(INSTALLMENTS_KEY);
    if (node.type === "if") {
      expressionKeys(node.expression).forEach((key) => keys.add(key));
      visit(node.yes); visit(node.no);
    }
  });
  visit(parsed.nodes);
  return [...keys].filter((key) => key !== INSTALLMENTS_KEY && !definitions[key])
    .sort().map((key) => `متغیر ناشناخته: ${key}`);
}

function formatValue(value: unknown, definition: ContractVariable): string {
  if (definition.dataType === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value ?? "");
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }
  if (definition.dataType === "money" || definition.dataType === "number") {
    const number = numeric(value);
    if (number !== null) {
      const formatted = new Intl.NumberFormat("fa-IR", {
        maximumFractionDigits: definition.dataType === "money" ? 0 : 2,
      }).format(number);
      return formatted + (definition.format ? ` ${definition.format}` : "");
    }
  }
  return String(value ?? "") + (definition.format ? ` ${definition.format}` : "");
}

function installmentTable(rows: ContractInstallment[]): string {
  const body = rows.map((row) => {
    const due = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(row.due);
    const amount = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(row.amount);
    return `<tr><td>${htmlEncode(String(row.no))}</td><td>${htmlEncode(due)}</td><td>${htmlEncode(amount)}</td></tr>`;
  }).join("");
  return `<table class="inst"><thead><tr><th>ردیف</th><th>سررسید</th><th>مبلغ قسط</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderContractTemplate(
  body: string,
  definitions: Record<string, ContractVariable>,
  get: (key: string) => unknown,
  installments: ContractInstallment[] | null = null,
): ContractRenderResult {
  const parsed = parse(body);
  const missing: ContractRenderResult["missing"] = [];
  const errors = [...parsed.errors];
  if (!parsed.nodes) return { html: "", missing, errors };
  const seen = new Set<string>();
  let html = "";
  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === "text") html += node.value;
      else if (node.type === "installments") {
        if (!installments?.length) {
          if (!seen.has(INSTALLMENTS_KEY)) { seen.add(INSTALLMENTS_KEY); missing.push({ key: INSTALLMENTS_KEY, label: "جدول اقساط" }); }
        } else html += installmentTable(installments);
      } else if (node.type === "variable") {
        const definition = definitions[node.key];
        if (!definition) { errors.push(`متغیر ناشناخته: ${node.key}`); continue; }
        const value = get(node.key);
        if (value == null || value === "") {
          if (definition.required && !seen.has(node.key)) {
            seen.add(node.key); missing.push({ key: node.key, label: definition.label });
          }
          continue;
        }
        html += htmlEncode(formatValue(value, definition));
      } else {
        walk(evaluateContractCondition(node.expression, get) ? node.yes : node.no);
      }
    }
  };
  walk(parsed.nodes);
  return { html, missing, errors };
}

export function calculateContractInstallments(
  amount: number, downPaymentPercent: number, feePercent: number,
  months: number, intervalDays: number, start: Date,
): { downPayment: number; fee: number; total: number; rows: ContractInstallment[] } {
  if (![amount, downPaymentPercent, feePercent, months, intervalDays].every(Number.isFinite)
      || amount <= 0 || downPaymentPercent < 0 || downPaymentPercent > 100
      || feePercent < 0 || months < 1 || !Number.isInteger(months)
      || intervalDays < 1 || !Number.isInteger(intervalDays) || Number.isNaN(start.getTime())) {
    throw new Error("پارامترهای محاسبه اقساط معتبر نیستند");
  }
  const downPayment = Math.round(amount * downPaymentPercent / 100);
  const financed = amount - downPayment;
  const fee = Math.round(financed * feePercent / 100);
  const total = financed + fee;
  const regular = Math.ceil(total / months);
  let remaining = total;
  const rows = Array.from({ length: months }, (_, index) => {
    const installmentAmount = index === months - 1 ? remaining : Math.min(regular, remaining);
    remaining -= installmentAmount;
    return { no: index + 1, due: new Date(start.getTime() + intervalDays * (index + 1) * 86_400_000), amount: installmentAmount };
  });
  return { downPayment, fee, total, rows };
}

export function maskContractValue(value: string): string {
  return value.length <= 3 ? "•".repeat(value.length) : "•".repeat(value.length - 3) + value.slice(-3);
}
