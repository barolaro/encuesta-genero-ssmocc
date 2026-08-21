import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { surveyResponses } from "@/db/schema";
import { submissionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = submissionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa los datos ingresados.", details: parsed.error.flatten() }, { status: 400 });
    await getDb().insert(surveyResponses).values(parsed.data);
    return NextResponse.json({ ok: true, anonymousCode: parsed.data.anonymousCode, submittedAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    console.error("survey_submit_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: duplicate ? "Este código ya fue utilizado. Genera uno nuevo." : "No fue posible guardar la respuesta. Intenta nuevamente." }, { status: duplicate ? 409 : 500 });
  }
}
