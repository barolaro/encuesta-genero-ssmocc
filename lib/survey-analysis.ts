export type AnalysisResponse = {
  id: string;
  anonymousCode: string;
  unit: string;
  responses: Record<string, unknown>;
  createdAt: string | Date;
};

type IndicatorSpec = {
  code: string;
  name: string;
  dimension: string;
  question: string;
  kind: "single" | "matrix" | "matrix_average" | "stereotypes" | "multi_used" | "preventive" | "healthy";
  item?: number;
  items?: number[];
  favorable?: string[];
  inverse?: boolean;
};

export type IndicatorResult = IndicatorSpec & {
  value: number | null;
  base: number;
  status: "Positivo" | "Intermedio" | "Crítico" | "Sin datos";
};

type PercentageResult = { value: number | null; base: number };
export type SurveyAnalysis = {
  responseCount: number;
  minimum: number;
  overallScore: number | null;
  indicators: IndicatorResult[];
  dimensions: { dimension: string; score: number; indicators: number }[];
  byUnit: { unit: string; responses: number; score: number | null }[];
  alerts: {
    discrimination: PercentageResult;
    workplaceHarassment: PercentageResult;
    sexualHarassment: PercentageResult;
    emotionalDistress: PercentageResult;
  };
  summary: { positive: number; intermediate: number; critical: number; pending: number };
};

const AGREE = new Set(["Totalmente de acuerdo", "Parcialmente de acuerdo"]);
const DISAGREE = new Set(["Totalmente en desacuerdo", "Parcialmente en desacuerdo"]);

export const INDICATORS: IndicatorSpec[] = [
  { code: "ES01", name: "Rechazo de estereotipos de género", dimension: "Cultura organizacional", question: "P17w", kind: "stereotypes" },
  { code: "DC2", name: "Igualdad de oportunidades de desarrollo", dimension: "Gestión de personas", question: "P18w", kind: "matrix_average", items: [0, 1] },
  { code: "RSC4", name: "Selección y contratación inclusiva", dimension: "Gestión de personas", question: "P18w", kind: "matrix", item: 2 },
  { code: "CAP2", name: "Acceso igualitario a capacitación", dimension: "Gestión de personas", question: "P18w", kind: "matrix", item: 3 },
  { code: "REM2", name: "Equidad percibida en remuneraciones", dimension: "Gestión de personas", question: "P18w", kind: "matrix", item: 4 },
  { code: "AL1", name: "Ambiente laboral seguro y respetuoso", dimension: "Ambiente laboral", question: "P19w", kind: "matrix", item: 0 },
  { code: "AL3", name: "Difusión de mecanismos de denuncia", dimension: "Ambiente laboral", question: "P19w", kind: "matrix", item: 1 },
  { code: "AL2", name: "Confianza en mecanismos de denuncia", dimension: "Ambiente laboral", question: "P19w", kind: "matrix", item: 2 },
  { code: "VIF1", name: "Confianza en apoyo institucional ante VIF", dimension: "Violencia intrafamiliar", question: "P19w", kind: "matrix", item: 3 },
  { code: "CC5", name: "Corresponsabilidad en el hogar", dimension: "Conciliación y corresponsabilidad", question: "P14w", kind: "single", favorable: ["Todas las personas adultas"] },
  { code: "CC1", name: "Aplicabilidad de medidas de conciliación", dimension: "Conciliación y corresponsabilidad", question: "P28w", kind: "matrix", item: 0 },
  { code: "CC2", name: "Liderazgo que facilita la conciliación", dimension: "Conciliación y corresponsabilidad", question: "P28w", kind: "matrix", item: 1 },
  { code: "CC3", name: "Desconexión laboral", dimension: "Conciliación y corresponsabilidad", question: "P28w", kind: "matrix", item: 2 },
  { code: "CC4", name: "Promoción de la corresponsabilidad", dimension: "Conciliación y corresponsabilidad", question: "P28w", kind: "matrix", item: 3 },
  { code: "USO", name: "Uso de medidas de conciliación", dimension: "Conciliación y corresponsabilidad", question: "P29w", kind: "multi_used" },
  { code: "SFM1", name: "Chequeos preventivos de salud", dimension: "Salud integral", question: "P30w", kind: "preventive" },
  { code: "SFM2", name: "Hábitos saludables", dimension: "Salud integral", question: "P31w", kind: "healthy" },
  { code: "SFM3", name: "Malestar anímico reciente", dimension: "Salud integral", question: "P35w", kind: "single", favorable: ["Sí"], inverse: true },
  { code: "INF1", name: "Infraestructura adecuada", dimension: "Infraestructura inclusiva", question: "P38w", kind: "matrix", item: 0 },
  { code: "INF2", name: "Infraestructura que previene violencias", dimension: "Infraestructura inclusiva", question: "P38w", kind: "matrix", item: 1 },
  { code: "EPP1", name: "Vestuario y EPP inclusivos", dimension: "Infraestructura inclusiva", question: "P38w", kind: "matrix", item: 2 },
  { code: "CO1", name: "Valor estratégico de la igualdad", dimension: "Cultura organizacional", question: "P39w", kind: "matrix", item: 0 },
  { code: "CO2", name: "Liderazgo inclusivo", dimension: "Cultura organizacional", question: "P39w", kind: "matrix", item: 1 },
  { code: "CO3", name: "Compromiso con la igualdad", dimension: "Cultura organizacional", question: "P39w", kind: "matrix", item: 2 },
  { code: "CO4", name: "Disposición al cambio", dimension: "Cultura organizacional", question: "P39w", kind: "matrix", item: 3 },
  { code: "CO5", name: "Recomendación institucional", dimension: "Cultura organizacional", question: "P39w", kind: "matrix", item: 4 },
];

export const cleanAnswer = (value: unknown) =>
  typeof value === "string" ? value.replace(/^Respuestas\s+/, "").trim() : "";

function matrixValue(answers: Record<string, unknown>, code: string, index: number) {
  const value = answers[code];
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return cleanAnswer(Object.values(value)[index]);
}

function score(spec: IndicatorSpec, answers: Record<string, unknown>): number | null {
  if (spec.kind === "single") {
    const value = cleanAnswer(answers[spec.question]);
    return value ? Number((spec.favorable || []).some((item) => value.includes(item))) : null;
  }
  if (spec.kind === "matrix") {
    const value = matrixValue(answers, spec.question, spec.item || 0);
    return value ? Number(new Set(spec.favorable || [...AGREE]).has(value)) : null;
  }
  if (spec.kind === "matrix_average") {
    const values = (spec.items || []).map((item) => matrixValue(answers, spec.question, item));
    if (!values.length || values.some((value) => !value)) return null;
    const favorable = new Set(spec.favorable || [...AGREE]);
    return values.filter((value) => favorable.has(value)).length / values.length;
  }
  if (spec.kind === "stereotypes") {
    const value = answers[spec.question];
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const values = Object.values(value).map(cleanAnswer).filter(Boolean);
    return values.length ? values.filter((item) => DISAGREE.has(item)).length / values.length : null;
  }
  if (spec.kind === "multi_used") {
    const value = answers[spec.question];
    if (!Array.isArray(value)) return null;
    return Number(value.some((item) => {
      const answer = cleanAnswer(item);
      return answer && !answer.includes("No conozco") && !answer.includes("No he utilizado");
    }));
  }
  if (spec.kind === "preventive") {
    const value = answers[spec.question];
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const values = Object.values(value).map(cleanAnswer).filter((item) => item && item !== "No aplica");
    return values.length ? values.filter((item) => item === "Sí").length / values.length : null;
  }
  const values = [
    cleanAnswer(answers.P31w) === "Sí",
    cleanAnswer(answers.P32w) === "Sí",
    ["Sí", "No consumo"].includes(cleanAnswer(answers.P33w)),
    cleanAnswer(answers.P34w) === "No",
  ];
  return values.filter(Boolean).length / values.length;
}

function status(value: number | null, inverse = false): IndicatorResult["status"] {
  if (value === null) return "Sin datos";
  const adjusted = inverse ? 100 - value : value;
  return adjusted >= 70 ? "Positivo" : adjusted >= 50 ? "Intermedio" : "Crítico";
}

function percentage(rows: AnalysisResponse[], question: string, values: string[]) {
  const valid = rows.map((row) => cleanAnswer(row.responses[question])).filter(Boolean);
  return valid.length
    ? { value: Math.round((valid.filter((value) => values.includes(value)).length / valid.length) * 1000) / 10, base: valid.length }
    : { value: null, base: 0 };
}

export function analyzeSurvey(rows: AnalysisResponse[], minimum = 5, includeUnits = true): SurveyAnalysis {
  const indicators: IndicatorResult[] = INDICATORS.map((spec) => {
    const values = rows.map((row) => score(spec, row.responses)).filter((value): value is number => value !== null);
    const value = values.length >= minimum ? Math.round((values.reduce((sum, item) => sum + item, 0) / values.length) * 1000) / 10 : null;
    return { ...spec, value, base: values.length, status: status(value, spec.inverse) };
  });
  const dimensions = Object.entries(
    indicators.reduce<Record<string, number[]>>((result, item) => {
      if (item.value !== null) (result[item.dimension] ||= []).push(item.inverse ? 100 - item.value : item.value);
      return result;
    }, {}),
  ).map(([dimension, values]) => ({
    dimension,
    score: Math.round((values.reduce((sum, item) => sum + item, 0) / values.length) * 10) / 10,
    indicators: values.length,
  })).sort((a, b) => a.score - b.score);
  const byUnit: SurveyAnalysis["byUnit"] = includeUnits ? Object.entries(rows.reduce<Record<string, AnalysisResponse[]>>((result, row) => {
    (result[row.unit] ||= []).push(row);
    return result;
  }, {})).map(([unit, unitRows]) => {
    const unitAnalysis = unitRows.length >= minimum ? analyzeSurvey(unitRows, minimum, false) : null;
    return { unit, responses: unitRows.length, score: unitAnalysis?.overallScore ?? null };
  }).sort((a, b) => b.responses - a.responses) : [];
  const comparable = indicators.filter((item) => item.value !== null);
  const overallScore = comparable.length
    ? Math.round((comparable.reduce((sum, item) => sum + (item.inverse ? 100 - item.value! : item.value!), 0) / comparable.length) * 10) / 10
    : null;
  return {
    responseCount: rows.length,
    minimum,
    overallScore,
    indicators,
    dimensions,
    byUnit,
    alerts: {
      discrimination: percentage(rows, "P20w", ["Sí"]),
      workplaceHarassment: percentage(rows, "P23w", ["Sí"]),
      sexualHarassment: percentage(rows, "P25w", ["Sí"]),
      emotionalDistress: percentage(rows, "P35w", ["Sí"]),
    },
    summary: {
      positive: indicators.filter((item) => item.status === "Positivo").length,
      intermediate: indicators.filter((item) => item.status === "Intermedio").length,
      critical: indicators.filter((item) => item.status === "Crítico").length,
      pending: indicators.filter((item) => item.status === "Sin datos").length,
    },
  };
}
