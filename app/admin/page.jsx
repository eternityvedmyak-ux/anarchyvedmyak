import { cookies } from "next/headers";
import AdminEditor from "@/components/AdminEditor";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const authed = cookies().get("admin_auth")?.value === "1";
  if (!authed) return <AdminLogin />;
  return <AdminEditor />;
}
