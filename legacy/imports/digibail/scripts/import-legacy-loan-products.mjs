// IMPORT_LEGACY_LOAN_PRODUCTS_V3: direct, resumable, single-row database import.
// Runs as a one-off container so a long import never occupies or OOM-kills the live HTTP API process.
import crypto from "node:crypto";
import pg from "pg";

const connectionString = String(process.env.DATABASE_URL || "");
if (!connectionString) {
  console.error("LEGACY_LOAN_IMPORT_BLOCKED=database configuration unavailable");
  process.exit(2);
}
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 120000 });
const norm = x => String(x ?? "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");
const pick = (p, keys) => {
  const entries = Object.keys(p || {});
  for (const key of keys) {
    const wanted = norm(key);
    const k = entries.find(x => norm(x) === wanted);
    if (k && p[k] !== null && p[k] !== undefined && p[k] !== "") return p[k];
  }
  return null;
};
const num = v => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[٬,\s]/g, "").replace(/٫/g, "."));
  return Number.isFinite(n) ? n : null;
};
const safeHtml = v => String(v || "").slice(0, 50000)
  .replace(/<\s*(script|style|iframe|object|embed|form|meta|link)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
  .replace(/<\s*(script|style|iframe|object|embed|form|meta|link)[^>]*\/?\s*>/gi, "")
  .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
  .replace(/(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "$1=\"#\"");

function parseAllowed(allowedRaw) {
  let allowed = [];
  try {
    const av = typeof allowedRaw === "string" ? JSON.parse(allowedRaw) : allowedRaw;
    if (Array.isArray(av)) allowed = av.map(t => num(typeof t === "object" && t !== null ? (t.value ?? t.months ?? t.Months ?? t.installments ?? t.Installments) : t)).filter(n => n !== null && n > 0 && n <= 600).map(Math.trunc);
    else if (av !== null && av !== undefined) {
      const n = num(av);
      if (n > 0 && n <= 600) allowed = [Math.trunc(n)];
    }
  } catch {
    if (typeof allowedRaw === "string") allowed = allowedRaw.split(/[,;|\/\s]+/).map(num).filter(n => n !== null && n > 0 && n <= 600).map(Math.trunc);
  }
  return allowed;
}

try {
  const source = await pool.query(
    "SELECT source_table,COUNT(*)::int AS row_count FROM legacy_source_data WHERE source_table ~* '^vamcityc_vamcity_import_[0-9]{8}[.]dbo[.]Loans$' GROUP BY source_table ORDER BY source_table DESC LIMIT 1"
  );
  if (!source.rowCount || source.rows[0].row_count < 1) throw new Error("verified VamCity loan-definition source table is not available");
  const sourceTable = source.rows[0].source_table;
  const sourceRows = Number(source.rows[0].row_count);
  console.log("LEGACY_LOAN_SOURCE_TABLE=" + sourceTable);
  console.log("LEGACY_LOAN_SOURCE_ROWS=" + sourceRows);
  let lastLegacyId = null, imported = 0, skipped = 0, processed = 0;

  while (true) {
    // Exactly one JSON payload in memory. The composite index is created by the workflow before this starts.
    const q = await pool.query(
      "SELECT legacy_id,payload FROM legacy_source_data WHERE source_table=$1 AND ($2::text IS NULL OR legacy_id>$2) ORDER BY legacy_id LIMIT 1",
      [sourceTable, lastLegacyId]
    );
    if (!q.rowCount) break;
    const row = q.rows[0];
    lastLegacyId = row.legacy_id;
    processed++;
    const p = row.payload && typeof row.payload === "object" ? row.payload : {};
    const name = String(pick(p, ["Title","Name","LoanName","LoanTitle","نام وام","عنوان وام"]) || "").trim().slice(0, 120);
    if (!name) {
      skipped++;
    } else {
      const title = String(pick(p, ["PlanTitle","Title","Name","عنوان طرح","عنوان"]) || name).trim().slice(0, 160);
      const rawMin = num(pick(p, ["MinAmount","MinimumAmount","MinLoanAmount","AmountFrom","FromAmount","حداقل مبلغ"]));
      const rawMax = num(pick(p, ["MaxAmount","MaximumAmount","MaxLoanAmount","AmountTo","ToAmount","حداکثر مبلغ"]));
      const rawAmount = num(pick(p, ["LoanAmount","Amount","AmountValue","مبلغ وام","مبلغ"]));
      const min = rawMin ?? rawAmount ?? 0, max = rawMax ?? rawAmount ?? rawMin ?? 0;
      const rate = num(pick(p, ["ProfitPercent","InterestPercent","InterestRate","MonthlyInterest","AnnualInterest","RatePercent","درصد بهره","درصد سود","نرخ سود"]));
      const profitType = pick(p, ["LoanProfitType","InterestMethod","InterestType","ProfitType","CalculationMethod","نوع سود","نحوه محاسبه سود"]);
      const methodText = String(profitType ?? "").toLowerCase();
      const method = /annual|year|سالانه|بانک/.test(methodText) || methodText === "1" ? "Annual" : /flat|once|یکجا/.test(methodText) ? "Flat" : "Monthly";
      const allowedRaw = pick(p, ["AllowedInstallments","InstallmentOptions","RepaymentOptions"]);
      const allowed = parseAllowed(allowedRaw);
      const months = num(pick(p, ["Months","InstallmentsCount","InstallmentCount","TermMonths","DurationMonths","MaxInstallments","تعداد اقساط","مدت ماه"])) ?? (allowed.length ? Math.max(...allowed) : null);
      let tiers = [];
      try {
        const av = typeof allowedRaw === "string" ? JSON.parse(allowedRaw) : allowedRaw;
        if (Array.isArray(av)) tiers = av.map(t => ({ months: num(typeof t === "object" && t !== null ? (t.value ?? t.months ?? t.Months ?? t.installments ?? t.Installments) : t), feePercent: 0, downPaymentPercent: 0 })).filter(t => t.months !== null && t.months > 0 && t.months <= 600);
      } catch {}
      if (!tiers.length && months && months > 0) tiers = [{ months: Math.trunc(months), feePercent: 0, downPaymentPercent: 0 }];
      const stableSlug = "legacy-" + crypto.createHash("sha256").update(sourceTable + "|" + row.legacy_id).digest("hex").slice(0, 16);
      const description = String(pick(p, ["PlanShortDescription","ShortDescription","Description","Summary","توضیحات"]) || "").slice(0, 500);
      const conditions = {};
      let costs = [];
      try {
        const rawCosts = pick(p, ["CostsJson","OperationalCostsJson","OperationalCosts"]);
        const parsed = typeof rawCosts === "string" ? JSON.parse(rawCosts) : rawCosts;
        if (Array.isArray(parsed)) costs = parsed.map(c => ({ title: String(c.title ?? c.Title ?? c.name ?? c.Name ?? "هزینه").slice(0, 100), percent: num(c.percent ?? c.Percent ?? c.value ?? c.Value ?? c.amount ?? c.Amount) ?? 0, months: num(c.months ?? c.Months) ?? null }));
      } catch {}
      const intervalDays = num(pick(p, ["IntervalDays","InstallmentIntervalDays","فاصله اقساط"])) ?? 0;
      const lateCoef = num(pick(p, ["DelayPercent","LateDailyCoef","LatePenaltyDailyCoefficient"])) ?? 0;
      const earlyCoef = num(pick(p, ["EarlyPercent","EarlyDailyCoef","EarlyPaymentDailyCoefficient"])) ?? 0;
      const legacyPayload = Object.fromEntries(["Title","Code","DelayPercent","EarlyPercent","ProfitPercent","MaxAmount","MaxMonthGap","AllowedInstallments","CostsJson","Disable","DisableText","IncludePlan","PlanTitle","PlanShortDescription","HasSponsore","DefaultSponsoreCheckoutDays","LoanProfitType"].filter(k => p[k] !== undefined).map(k => [k, p[k]]));
      const disabledRaw = pick(p, ["Disable"]);
      const includedRaw = pick(p, ["IncludePlan"]);
      const asBool = value => value === true || value === 1 || /^(true|1|yes|y)$/i.test(String(value ?? "").trim());
      const isActive = disabledRaw === null ? (min > 0 && max >= min && tiers.length > 0) : !asBool(disabledRaw);
      const showInList = asBool(includedRaw);
      const ins = await pool.query(
        "INSERT INTO loan_products(slug,name,title,description,badge,min_amount,max_amount,interval_days,tiers,conditions,documents,is_active,sort_order,interest_method,interest_percent,late_daily_coef,early_daily_coef,show_in_list,send_reminders,labels,full_description_html,operational_costs,legacy_source_table,legacy_id,legacy_payload,needs_review) VALUES($1,$2,$3,$4,'',$5,$6,$7,$8::jsonb,$9::jsonb,'[]'::jsonb,$10,$11,$12,$13,$14,$15,$16,FALSE,'[]'::jsonb,$17,$18::jsonb,$19,$20,$21::jsonb,$22) ON CONFLICT DO NOTHING RETURNING id",
        [stableSlug,name,title,description,min,max,intervalDays,JSON.stringify(tiers),JSON.stringify(conditions),isActive,1000+imported,method,rate??0,lateCoef,earlyCoef,showInList,safeHtml(pick(p,["PlanHtml","FullDescriptionHtml"])),JSON.stringify(costs),sourceTable,row.legacy_id,JSON.stringify(legacyPayload),(min<=0 || max<min || tiers.length===0)]
      );
      if (ins.rowCount) imported++; else skipped++;
    }
    if (processed % 100 === 0) {
      console.log("LEGACY_LOAN_IMPORT_PROGRESS=" + processed + "/" + sourceRows + " imported=" + imported + " skipped=" + skipped);
    }
  }
  // Reconcile statuses for records imported by earlier versions as well.
  // The source snapshot lives in this site's own PostgreSQL database.
  const synced = await pool.query(
    "UPDATE loan_products lp SET is_active = CASE WHEN lower(COALESCE(src.payload->>'Disable','')) IN ('true','1','yes','y') THEN FALSE WHEN lower(COALESCE(src.payload->>'Disable','')) IN ('false','0','no','n') THEN TRUE ELSE CASE WHEN COALESCE(lp.min_amount,0)>0 AND COALESCE(lp.max_amount,0)>=COALESCE(lp.min_amount,0) AND jsonb_typeof(lp.tiers)='array' AND jsonb_array_length(CASE WHEN jsonb_typeof(lp.tiers)='array' THEN lp.tiers ELSE '[]'::jsonb END)>0 THEN TRUE ELSE lp.is_active END END, show_in_list = CASE WHEN lower(COALESCE(src.payload->>'IncludePlan','')) IN ('true','1','yes','y') THEN TRUE WHEN lower(COALESCE(src.payload->>'IncludePlan','')) IN ('false','0','no','n') THEN FALSE ELSE lp.show_in_list END, updated_at=NOW() FROM legacy_source_data src WHERE lp.legacy_source_table=src.source_table AND lp.legacy_id=src.legacy_id AND src.source_table=$1",
    [sourceTable]
  );
  console.log("LEGACY_LOAN_STATUS_ROWS_RECONCILED=" + synced.rowCount);
  const totals = await pool.query(
    "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE needs_review)::int AS review, COUNT(*) FILTER (WHERE is_active)::int AS active FROM loan_products WHERE legacy_source_table=$1",
    [sourceTable]
  );
  console.log("LEGACY_LOAN_PRODUCTS_IMPORTED_THIS_RUN=" + imported);
  console.log("LEGACY_LOAN_PRODUCTS_SKIPPED_THIS_RUN=" + skipped);
  console.log("LEGACY_LOAN_SOURCE_PROCESSED=" + processed);
  console.log("LEGACY_LOAN_SOURCE_PRODUCTS_TOTAL=" + totals.rows[0].total);
  console.log("LEGACY_LOAN_SOURCE_NEEDS_REVIEW=" + totals.rows[0].review);
  console.log("LEGACY_LOAN_SOURCE_ACTIVE=" + totals.rows[0].active);
  console.log("LEGACY_LOAN_DEFINITION_IMPORT_COMPLETE=1");
} catch (error) {
  console.error("LEGACY_LOAN_PRODUCT_IMPORT_FAILED=" + String(error.message || "unknown").replace(/[\r\n]+/g, " ").slice(0, 300));
  process.exitCode = 1;
} finally {
  await pool.end();
}
