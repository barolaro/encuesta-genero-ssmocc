import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { analyzeSurvey } from "@/lib/survey-analysis";

export async function GET(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const requestedSurveyId = new URL(request.url).searchParams.get("surveyId");
  const db = getDb();
  const allSurveys = await db
    .select()
    .from(surveys)
    .orderBy(desc(surveys.createdAt));
  const selectedSurvey = requestedSurveyId
    ? allSurveys.find((survey) => survey.id === requestedSurveyId) || null
    : allSurveys.find((survey) => survey.status === "published") || null;
  const responses = selectedSurvey
    ? await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, selectedSurvey.id))
        .orderBy(desc(surveyResponses.createdAt))
    : [];
  const byUnit = responses.reduce<Record<string, number>>(
    (accumulator, response) => ({
      ...accumulator,
      [response.unit]: (accumulator[response.unit] || 0) + 1,
    }),
    {},
  );
  const byDay = responses.reduce<Record<string, number>>(
    (accumulator, response) => {
      const day = response.createdAt.toISOString().slice(0, 10);
      return { ...accumulator, [day]: (accumulator[day] || 0) + 1 };
    },
    {},
  );

  return NextResponse.json({
    surveys: allSurveys,
    selectedSurvey,
    responses,
    analysis: analyzeSurvey(responses),
    metrics: {
      total: responses.length,
      surveys: allSurveys.length,
      active: allSurveys.filter((survey) => survey.status === "published")
        .length,
      units: Object.keys(byUnit).length,
    },
    byUnit,
    byDay,
  });
}
