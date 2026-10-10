import type { Metadata } from "next";
import AutoTemplate from "../AutoTemplate";
export const metadata: Metadata = { title: "خدمات EFI و عیب‌یابی خودرو | راه‌خودرو", description: "قالب خدمات خودرو برای معرفی عیب‌یابی EFI، بررسی فنی و درخواست نوبت.", robots: { index: false, follow: false } };
export default function VehicleEfiPage(){ return <AutoTemplate page="efi" />; }
