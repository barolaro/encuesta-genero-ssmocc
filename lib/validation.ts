import { z } from "zod";
import { INSTITUTION_CONFIG } from "@/config/institution";

export const submissionSchema = z.object({
  anonymousCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Código anónimo inválido"),
  unit: z.enum(INSTITUTION_CONFIG.units),
  responses: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, "La encuesta no contiene respuestas"),
});
