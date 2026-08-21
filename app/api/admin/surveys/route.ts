import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { surveys } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { INSTITUTION_CONFIG } from "@/config/institution";
export async function POST(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  if (
    !body.title?.trim() ||
    !Array.isArray(body.sections) ||
    body.sections.length === 0
  )
    return NextResponse.json(
      { error: "Completa el título y al menos una sección" },
      { status: 400 },
    );
  const [created] = await getDb()
    .insert(surveys)
    .values({
      title: body.title.trim(),
      description: body.description || "",
      status: "draft",
      anonymous: true,
      units: body.units?.length ? body.units : [...INSTITUTION_CONFIG.units],
      sections: body.sections,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
export async function PATCH(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, status, title, description, sections, units } =
    await request.json();
  if (title && Array.isArray(sections)) {
    const [edited] = await getDb()
      .update(surveys)
      .set({ title, description: description || "", sections, units })
      .where(eq(surveys.id, id))
      .returning();
    return NextResponse.json(edited);
  }
  if (status === "published")
    await getDb()
      .update(surveys)
      .set({ status: "closed" })
      .where(eq(surveys.status, "published"));
  const [updated] = await getDb()
    .update(surveys)
    .set({ status })
    .where(eq(surveys.id, id))
    .returning();
  return NextResponse.json(updated);
}
