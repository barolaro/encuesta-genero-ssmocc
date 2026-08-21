import { z } from "zod";
export const submissionSchema = z.object({
  surveyId: z.string().uuid().optional(),
  anonymousCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Código anónimo inválido"),
  unit: z.string().trim().min(2).max(160),
  responses: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, "La encuesta no contiene respuestas"),
});
