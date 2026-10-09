import { redirect } from "next/navigation";

// Keep one canonical template-management surface under Frontend Management.
export default function Templates() {
  redirect("/modules/?code=16-page-builder&panel=frontend");
}
