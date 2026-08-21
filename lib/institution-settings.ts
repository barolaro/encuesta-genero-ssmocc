import "server-only";
import { eq } from "drizzle-orm";
import { INSTITUTION_CONFIG, type InstitutionSettings } from "@/config/institution";
import { getDb } from "@/db";
import { institutionSettings } from "@/db/schema";

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  try {
    const [saved] = await getDb()
      .select()
      .from(institutionSettings)
      .where(eq(institutionSettings.id, "current"))
      .limit(1);
    if (!saved) return INSTITUTION_CONFIG;
    return {
      ...INSTITUTION_CONFIG,
      institutionName: saved.institutionName,
      shortName: saved.shortName,
      logoUrl: saved.logoUrl,
      units: saved.units,
    };
  } catch {
    return INSTITUTION_CONFIG;
  }
}
