import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [allSurveys, responses] = await Promise.all([getDb().select().from(surveys).orderBy(desc(surveys.createdAt)), getDb().select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt))]);
  const byUnit = responses.reduce<Record<string, number>>((a, r) => ({ ...a, [r.unit]: (a[r.unit] || 0) + 1 }), {});
  const byDay = responses.reduce<Record<string, number>>((a, r) => { const d = r.createdAt.toISOString().slice(0, 10); return { ...a, [d]: (a[d] || 0) + 1 }; }, {});
  return NextResponse.json({ surveys: allSurveys, responses, metrics: { total: responses.length, surveys: allSurveys.length, active: allSurveys.filter(s => s.status === "published").length, units: Object.keys(byUnit).length }, byUnit, byDay });
}
