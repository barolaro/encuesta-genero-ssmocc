import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { surveys } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { INSTITUTION_CONFIG } from "@/config/institution";
import { BASE_SURVEY_TEMPLATE } from "@/config/base-survey";
export async function POST() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [created] = await getDb()
    .insert(surveys)
    .values({
      ...BASE_SURVEY_TEMPLATE,
      status: "draft",
      anonymous: true,
      units: [...INSTITUTION_CONFIG.units],
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
