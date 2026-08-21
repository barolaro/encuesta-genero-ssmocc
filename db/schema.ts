import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  anonymousCode: varchar("codigo_anonimo", { length: 9 }).notNull().unique(),
  unit: varchar("unidad", { length: 160 }).notNull(),
  responses: jsonb("respuestas").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
