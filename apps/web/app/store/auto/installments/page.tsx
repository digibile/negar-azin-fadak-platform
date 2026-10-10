import type { Metadata } from "next";
import AutoTemplate from "../AutoTemplate";
export const metadata: Metadata = { title: "خرید اقساطی خودرو | راه‌خودرو", description: "قالب خرید اقساطی خودرو با مراحل، مدارک و افشای شفاف شرایط مالی.", robots: { index: false, follow: false } };
export default function VehicleInstallmentsPage(){ return <AutoTemplate page="installments" />; }
