# Encuesta anónima SSMOCC

Aplicación institucional de encuestas anónimas con Next.js, TypeScript, Tailwind CSS, Drizzle ORM y PostgreSQL, preparada para Vercel.

## Configuración

1. Cambie identidad, colores y unidades en `config/institution.ts`.
2. Modifique secciones y preguntas en `config/survey.ts`.
3. Copie `.env.example` a `.env.local` y configure `DATABASE_URL` y `ADMIN_API_KEY`.
4. Ejecute `npm install`, `npm run db:push` y `npm run dev`.

## Vercel

Importe el repositorio en Vercel, agregue `DATABASE_URL` y `ADMIN_API_KEY`, y despliegue. Vercel detectará Next.js automáticamente. La base puede ser Vercel Postgres/Neon, Supabase u otro PostgreSQL compatible.

## API

- `POST /api/survey/submit`: registra una participación anónima.
- `GET /api/survey/responses`: requiere el encabezado `x-admin-key` igual a `ADMIN_API_KEY`.

La aplicación no solicita nombre, RUT, correo, IP ni otros datos personales. Evite preguntas que permitan identificar indirectamente a personas en unidades pequeñas.
