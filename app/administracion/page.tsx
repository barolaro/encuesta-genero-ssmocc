import { isAdmin } from "@/lib/admin-auth";
import { AdminPortal } from "@/components/admin-portal";
import { getInstitutionSettings } from "@/lib/institution-settings";
export const dynamic = "force-dynamic";
export default async function AdministrationPage() {
  const [authenticated, institution] = await Promise.all([
    isAdmin(),
    getInstitutionSettings(),
  ]);
  return <AdminPortal authenticated={authenticated} initialInstitution={institution} />;
}
