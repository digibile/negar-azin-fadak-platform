"use client";

import { useMemo, useState } from "react";

type InsuranceOption = {
  id?: string;
  title?: string;
  provider?: string;
  price?: number;
  currency?: string;
  discountPercent?: number;
};

export default function InsuranceOptions({ options, currency }: { options: InsuranceOption[]; currency: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedTotal = useMemo(() => options.reduce((sum, option, index) => {
    const key = option.id || option.title || String(index);
    return selected.includes(key) && typeof option.price === "number" ? sum + option.price : sum;
  }, 0), [options, selected]);

  if (!options.length) return null;

  return (
    <div className="sk-dk-insurance-section">
      <b>بیمه و خدمات تکمیلی</b>
      {options.map((option, index) => {
        const key = option.id || option.title || String(index);
        const priceKnown = typeof option.price === "number" && Number.isFinite(option.price) && option.price >= 0;
        return (
          <label className="sk-dk-insurance-option" key={key}>
            <input
              type="checkbox"
              checked={selected.includes(key)}
              disabled={!priceKnown}
              onChange={(event) => setSelected((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))}
            />
            <span>
              <strong>{option.title || "بیمه کالا"}</strong>
              <small>{option.provider || "ارائه‌دهنده ثبت‌شده"}</small>
            </span>
            <span className="sk-dk-insurance-price">
              {priceKnown ? option.price!.toLocaleString("fa-IR") + " " + (option.currency || currency) : "قیمت در سامانه ثبت نشده"}
              {typeof option.discountPercent === "number" && option.discountPercent > 0 && <small>{option.discountPercent.toLocaleString("fa-IR")}٪ تخفیف ثبت‌شده</small>}
            </span>
          </label>
        );
      })}
      {selected.length > 0 && <div className="sk-dk-insurance-total" role="status">مجموع خدمات انتخاب‌شده: <strong>{selectedTotal.toLocaleString("fa-IR")} {currency}</strong></div>}
    </div>
  );
}
