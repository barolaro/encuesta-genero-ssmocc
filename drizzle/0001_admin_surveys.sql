CREATE TABLE IF NOT EXISTS "surveys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo" varchar(220) NOT NULL,
  "descripcion" text DEFAULT '' NOT NULL,
  "estado" varchar(20) DEFAULT 'draft' NOT NULL,
  "anonima" boolean DEFAULT true NOT NULL,
  "unidades" jsonb NOT NULL,
  "secciones" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "survey_responses" ADD COLUMN IF NOT EXISTS "survey_id" uuid REFERENCES "surveys"("id");
