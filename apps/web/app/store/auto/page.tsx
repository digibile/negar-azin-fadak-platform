import type { Metadata } from "next";
import AutoTemplate from "./AutoTemplate";
export const metadata: Metadata = { title: "بازار خودرو | راه‌خودرو", description: "قالب راست‌چین بازار خودرو با مسیرهای خرید نقدی، اقساطی، تعویض و خدمات EFI.", robots: { index: false, follow: false } };
export default function AutoMarketPage(){ return <AutoTemplate page="market" />; }
