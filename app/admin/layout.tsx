import { ReactNode } from "react";
import { getAdminRole } from "../lib/admin-page";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const role = await getAdminRole();
  return <AdminShell initialRole={role}>{children}</AdminShell>;
}
