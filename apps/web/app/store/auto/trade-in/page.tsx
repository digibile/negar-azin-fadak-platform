import type { Metadata } from "next";
import AutoTemplate from "../AutoTemplate";
export const metadata: Metadata = { title: "تعویض و معاوضه خودرو | راه‌خودرو", description: "قالب ثبت مشخصات خودرو، کارشناسی و مسیر تعویض یا معاوضه.", robots: { index: false, follow: false } };
export default function VehicleTradeInPage(){ return <AutoTemplate page="tradein" />; }
