import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { surveyResponses } from "@/db/schema";

export async function GET(request: Request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  const suppliedKey = request.headers.get("x-admin-key");
  if (!configuredKey || suppliedKey !== configuredKey) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await getDb().select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt));
  return NextResponse.json({ count: rows.length, responses: rows });
}
