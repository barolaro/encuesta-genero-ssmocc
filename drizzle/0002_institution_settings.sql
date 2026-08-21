CREATE TABLE IF NOT EXISTS "institution_settings" (
  "id" varchar(30) PRIMARY KEY DEFAULT 'current' NOT NULL,
  "institution_name" varchar(180) NOT NULL,
  "short_name" varchar(30) NOT NULL,
  "logo_url" text NOT NULL,
  "units" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
