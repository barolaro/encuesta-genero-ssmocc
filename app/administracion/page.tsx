import { isAdmin } from "@/lib/admin-auth";
import { AdminPortal } from "@/components/admin-portal";
export const dynamic = "force-dynamic";
export default async function AdministrationPage() {
  return <AdminPortal authenticated={await isAdmin()} />;
}
