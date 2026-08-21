import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const surveys = pgTable("surveys", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("titulo", { length: 220 }).notNull(),
  description: text("descripcion").notNull().default(""),
  status: varchar("estado", { length: 20 }).notNull().default("draft"),
  anonymous: boolean("anonima").notNull().default(true),
  units: jsonb("unidades").$type<string[]>().notNull(),
  sections: jsonb("secciones").$type<unknown[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").references(() => surveys.id),
  anonymousCode: varchar("codigo_anonimo", { length: 9 }).notNull().unique(),
  unit: varchar("unidad", { length: 160 }).notNull(),
  responses: jsonb("respuestas").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
