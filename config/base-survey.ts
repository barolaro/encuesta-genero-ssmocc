import questions from "@/data/questions.json";
import type { Question, SurveySection } from "@/config/survey";

type SourceQuestion = {
  codigo: string;
  texto: string;
  tipo: string;
  opciones: { etiqueta: string }[];
  items: string[];
};
const sectionStarts = [
  { from: 1, title: "Antecedentes generales" },
  { from: 17, title: "Cultura organizacional e igualdad de oportunidades" },
  { from: 19, title: "Ambiente laboral, discriminación y violencia" },
  { from: 28, title: "Conciliación y corresponsabilidad" },
  { from: 30, title: "Salud integral" },
  { from: 38, title: "Infraestructura, liderazgo y compromiso institucional" },
];
const clean = (value: string) => value.replace(/^Respuestas\s+/i, "").trim();
function convert(q: SourceQuestion): Question {
  const base = { id: q.codigo, title: q.texto, required: true };
  if (q.tipo === "unica")
    return {
      ...base,
      type: "single",
      options: q.opciones.map((o) => clean(o.etiqueta)),
    };
  if (q.tipo === "multiple")
    return {
      ...base,
      type: "multiple",
      hint: "Puedes seleccionar más de una alternativa.",
      options: q.opciones.map((o) => clean(o.etiqueta)),
    };
  if (q.tipo === "matriz_dicotomica")
    return { ...base, type: "dichotomous", rows: q.items };
  if (q.tipo === "matriz_likert5")
    return { ...base, type: "likert", rows: q.items };
  return { ...base, type: "text", maxLength: 1500 };
}
export const BASE_SURVEY_SECTIONS: SurveySection[] = sectionStarts.map(
  (section, index) => {
    const end = sectionStarts[index + 1]?.from ?? questions.length + 1;
    return {
      id: `seccion-${index + 1}`,
      eyebrow: `Sección ${index + 1}`,
      title: section.title,
      description: "Responde todas las preguntas de esta sección.",
      questions: (questions as SourceQuestion[])
        .slice(section.from - 1, end - 1)
        .map(convert),
    };
  },
);
export const BASE_SURVEY_TEMPLATE = {
  title: "Encuesta Comunidad Funcionaria 2026",
  description:
    "Encuesta anónima para el análisis institucional de transversalización de género, inclusión, diversidad y conciliación.",
  sections: BASE_SURVEY_SECTIONS,
};
