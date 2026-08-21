import { SurveyApp } from "@/components/survey-app";
import { getDb } from "@/db";
import { surveys } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SurveySection } from "@/config/survey";
export const dynamic = "force-dynamic";
export default async function Home() {
  try {
    const [active] = await getDb()
      .select()
      .from(surveys)
      .where(eq(surveys.status, "published"))
      .limit(1);
    return (
      <SurveyApp
        survey={
          active
            ? {
                id: active.id,
                title: active.title,
                description: active.description,
                sections: active.sections as SurveySection[],
              }
            : undefined
        }
      />
    );
  } catch {
    return <SurveyApp />;
  }
}
