import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { institutionSettings } from "@/db/schema";
import { getInstitutionSettings } from "@/lib/institution-settings";
import { SSMOCC_ESTABLISHMENTS } from "@/config/institution";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await getInstitutionSettings());
}

export async function PATCH(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  const institutionName = String(body.institutionName || "").trim();
  const establishment = SSMOCC_ESTABLISHMENTS.find(
    (item) => item.name === institutionName,
  );
  const shortName = establishment?.shortName || "";
  const logoUrl = String(body.logoUrl || "").trim();
  const units = Array.isArray(body.units)
    ? body.units.map((unit: unknown) => String(unit).trim()).filter(Boolean)
    : [];
  if (!establishment)
    return NextResponse.json(
      { error: "Selecciona un establecimiento perteneciente a la Red SSMOCC." },
      { status: 400 },
    );
  if (!logoUrl || !units.length)
    return NextResponse.json(
      { error: "Completa el nombre, la sigla, el logo y al menos una unidad." },
      { status: 400 },
    );
  if (logoUrl.startsWith("data:") && logoUrl.length > 1_100_000)
    return NextResponse.json(
      { error: "El logo debe pesar menos de 750 KB." },
      { status: 413 },
    );
  const [saved] = await getDb()
    .insert(institutionSettings)
    .values({ id: "current", institutionName, shortName, logoUrl, units })
    .onConflictDoUpdate({
      target: institutionSettings.id,
      set: { institutionName, shortName, logoUrl, units, updatedAt: new Date() },
    })
    .returning();
  return NextResponse.json(saved);
}
