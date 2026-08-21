import ExcelJS from "exceljs";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { BASE_SURVEY_SECTIONS } from "@/config/base-survey";
import type { Question } from "@/config/survey";
import { getDb } from "@/db";
import { surveyResponses } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { analyzeSurvey } from "@/lib/survey-analysis";
import { getInstitutionSettings } from "@/lib/institution-settings";
import { ADMINISTRATIVE_INDICATORS, REPORT_THEMES } from "@/lib/report-catalog";

export const runtime = "nodejs";

const blue = "0039A6";
const red = "EF3340";
const paleBlue = "EAF2FF";
const border = "DCE4EE";

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${blue}` } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: `FF${border}` } } };
  });
}

function title(sheet: ExcelJS.Worksheet, text: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const cell = sheet.getCell(1, 1);
  cell.value = text;
  cell.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${red}` } };
  cell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 36;
}

function safeValue(value: unknown) {
  if (Array.isArray(value)) return value.join(" | ");
  if (value && typeof value === "object")
    return Object.entries(value).map(([key, answer]) => `${key}: ${String(answer)}`).join(" | ");
  return value == null ? "" : String(value);
}

type ResponseRow = typeof surveyResponses.$inferSelect;
type DistributionRow = {
  questionId: string;
  question: string;
  item: string;
  answer: string;
  count: number;
  base: number;
};

function distributionRows(responses: ResponseRow[], questions: Question[]): DistributionRow[] {
  return questions.flatMap((question) => {
    const counts = new Map<string, Map<string, number>>();
    for (const response of responses) {
      const value = response.responses[question.id];
      if (Array.isArray(value)) {
        const item = "Selecciones";
        const itemCounts = counts.get(item) || new Map<string, number>();
        value.forEach((answer) => {
          const clean = safeValue(answer).trim();
          if (clean) itemCounts.set(clean, (itemCounts.get(clean) || 0) + 1);
        });
        counts.set(item, itemCounts);
      } else if (value && typeof value === "object") {
        Object.entries(value).forEach(([item, answer]) => {
          const clean = safeValue(answer).trim();
          if (!clean) return;
          const itemCounts = counts.get(item) || new Map<string, number>();
          itemCounts.set(clean, (itemCounts.get(clean) || 0) + 1);
          counts.set(item, itemCounts);
        });
      } else {
        const clean = safeValue(value).trim();
        if (!clean) continue;
        const item = question.type === "text" ? "Comentarios recibidos" : "Respuesta";
        const answer = question.type === "text" ? "Con comentario" : clean;
        const itemCounts = counts.get(item) || new Map<string, number>();
        itemCounts.set(answer, (itemCounts.get(answer) || 0) + 1);
        counts.set(item, itemCounts);
      }
    }
    return [...counts.entries()].flatMap(([item, answers]) => {
      const base = question.type === "multiple"
        ? responses.filter((response) => Array.isArray(response.responses[question.id]) && (response.responses[question.id] as unknown[]).length > 0).length
        : [...answers.values()].reduce((sum, count) => sum + count, 0);
      return [...answers.entries()].map(([answer, count]) => ({
        questionId: question.id,
        question: question.title,
        item,
        answer,
        count,
        base,
      }));
    });
  });
}

function addDistributionTable(sheet: ExcelJS.Worksheet, startRow: number, rows: DistributionRow[]) {
  sheet.getRow(startRow).values = ["Pregunta", "Enunciado", "Ítem o afirmación", "Respuesta", "Frecuencia", "Porcentaje", "Base"];
  styleHeader(sheet.getRow(startRow));
  rows.forEach((item) => {
    const row = sheet.addRow([
      item.questionId,
      item.question,
      item.item,
      item.answer,
      item.count,
      item.base ? item.count / item.base : "",
      item.base,
    ]);
    if (item.base) row.getCell(6).numFmt = "0.0%";
  });
  sheet.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow, column: 7 } };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [responses, institution] = await Promise.all([
    getDb().select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt)),
    getInstitutionSettings(),
  ]);
  const analysis = analyzeSurvey(responses);
  const allQuestions = BASE_SURVEY_SECTIONS.flatMap((section) => section.questions);
  const allDistributions = distributionRows(responses, allQuestions);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `${institution.institutionName} · ${institution.networkShortName}`;
  workbook.created = new Date();
  workbook.subject = "Informe institucional de encuesta de género";

  const summary = workbook.addWorksheet("Resumen ejecutivo", { views: [{ state: "frozen", ySplit: 4 }] });
  title(summary, `${institution.surveyTitle} · ${institution.institutionName}`, 5);
  summary.getCell("A3").value = "Generado";
  summary.getCell("B3").value = new Date();
  summary.getCell("B3").numFmt = "dd-mm-yyyy hh:mm";
  summary.getCell("A5").value = "Indicador";
  summary.getCell("B5").value = "Resultado";
  styleHeader(summary.getRow(5));
  [
    ["Respuestas válidas", analysis.responseCount],
    ["Índice global favorable", analysis.overallScore === null ? "Sin base suficiente" : analysis.overallScore / 100],
    ["Indicadores positivos", analysis.summary.positive],
    ["Indicadores intermedios", analysis.summary.intermediate],
    ["Indicadores críticos", analysis.summary.critical],
    ["Indicadores sin base suficiente", analysis.summary.pending],
  ].forEach((row) => summary.addRow(row));
  summary.getCell("B7").numFmt = "0.0%";
  summary.addRow([]);
  summary.addRow(["Alertas de experiencia declarada", "Resultado", "Base"]);
  styleHeader(summary.lastRow!);
  Object.entries({
    "Discriminación en los últimos 2 años": analysis.alerts.discrimination,
    "Acoso laboral en los últimos 2 años": analysis.alerts.workplaceHarassment,
    "Acoso sexual en los últimos 2 años": analysis.alerts.sexualHarassment,
    "Malestar anímico reciente": analysis.alerts.emotionalDistress,
  }).forEach(([label, item]) => {
    const row = summary.addRow([label, item.value === null ? "Sin datos" : item.value / 100, item.base]);
    if (item.value !== null) row.getCell(2).numFmt = "0.0%";
  });
  summary.addRow([]);
  summary.addRow(["Nota metodológica"]);
  summary.addRow([`Los resultados segmentados se ocultan cuando la base es inferior a ${analysis.minimum} respuestas para proteger el anonimato. Los indicadores de percepción se expresan como porcentaje favorable; los indicadores inversos se ajustan al calcular el índice global.`]);
  summary.mergeCells(summary.rowCount, 1, summary.rowCount + 2, 5);
  summary.getCell(summary.rowCount - 2, 1).alignment = { wrapText: true, vertical: "top" };
  summary.columns = [{ width: 48 }, { width: 24 }, { width: 16 }, { width: 16 }, { width: 16 }];

  summary.addRow([]);
  summary.addRow(["Lectura gerencial"]);
  styleHeader(summary.lastRow!);
  const weakest = analysis.dimensions.slice(0, 3);
  if (analysis.responseCount < analysis.minimum)
    summary.addRow(["La base todavía es insuficiente para emitir conclusiones institucionales."]);
  else if (!weakest.length)
    summary.addRow(["No existen indicadores calculables con las respuestas disponibles."]);
  else
    weakest.forEach((item, index) => summary.addRow([
      `${index + 1}. Priorizar ${item.dimension}`,
      item.score / 100,
      "Revisar indicadores críticos y comentarios asociados",
    ]).getCell(2).numFmt = "0.0%");

  const dimensions = workbook.addWorksheet("Dimensiones");
  title(dimensions, "Resultados por dimensión", 3);
  dimensions.addRow([]);
  dimensions.addRow(["Dimensión", "Puntaje favorable", "Indicadores calculados"]);
  styleHeader(dimensions.getRow(3));
  analysis.dimensions.forEach((item) => {
    const row = dimensions.addRow([item.dimension, item.score / 100, item.indicators]);
    row.getCell(2).numFmt = "0.0%";
  });
  dimensions.columns = [{ width: 42 }, { width: 22 }, { width: 24 }];

  const indicators = workbook.addWorksheet("Indicadores");
  title(indicators, "Indicadores de equidad y percepción", 7);
  indicators.addRow([]);
  indicators.addRow(["Código", "Dimensión", "Indicador", "Resultado", "Base", "Estado", "Pregunta origen"]);
  styleHeader(indicators.getRow(3));
  analysis.indicators.forEach((item) => {
    const row = indicators.addRow([item.code, item.dimension, item.name, item.value === null ? "" : item.value / 100, item.base, item.status, item.question]);
    if (item.value !== null) row.getCell(4).numFmt = "0.0%";
    const color = item.status === "Positivo" ? "DDF4E4" : item.status === "Intermedio" ? "FFF1C7" : item.status === "Crítico" ? "FDE1E4" : "EDF0F4";
    row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } };
  });
  indicators.autoFilter = "A3:G3";
  indicators.columns = [{ width: 12 }, { width: 34 }, { width: 50 }, { width: 15 }, { width: 10 }, { width: 16 }, { width: 16 }];

  const units = workbook.addWorksheet("Participación por unidad");
  title(units, "Participación e índice por unidad", 3);
  units.addRow([]);
  units.addRow(["Unidad", "Respuestas", "Índice favorable"]);
  styleHeader(units.getRow(3));
  analysis.byUnit.forEach((item) => {
    const row = units.addRow([item.unit, item.responses, item.score === null ? "Protegido (<5)" : item.score / 100]);
    if (item.score !== null) row.getCell(3).numFmt = "0.0%";
  });
  units.columns = [{ width: 48 }, { width: 16 }, { width: 22 }];

  const matrix = workbook.addWorksheet("Matriz indicadores MINSAL", { views: [{ state: "frozen", ySplit: 3 }] });
  title(matrix, "Matriz integral de indicadores y fuentes", 8);
  matrix.addRow([]);
  matrix.addRow(["Código", "Dimensión", "Indicador", "Fuente", "Resultado", "Base", "Estado", "Observación"]);
  styleHeader(matrix.getRow(3));
  analysis.indicators.forEach((item) => {
    const row = matrix.addRow([
      item.code,
      item.dimension,
      item.name,
      "Encuesta",
      item.value === null ? "" : item.value / 100,
      item.base,
      item.status,
      item.value === null ? `Base inferior a ${analysis.minimum} o sin respuestas válidas` : "Calculado automáticamente",
    ]);
    if (item.value !== null) row.getCell(5).numFmt = "0.0%";
  });
  ADMINISTRATIVE_INDICATORS.forEach((item) => matrix.addRow([
    item.code,
    "Indicador de gestión de personas",
    item.name,
    item.source,
    "",
    "",
    "Pendiente",
    "Requiere nómina, remuneraciones, capacitación, postulaciones o contrataciones; no se calcula desde la encuesta.",
  ]));
  matrix.autoFilter = "A3:H3";
  matrix.columns = [{ width: 12 }, { width: 34 }, { width: 52 }, { width: 18 }, { width: 15 }, { width: 10 }, { width: 16 }, { width: 58 }];

  const distributions = workbook.addWorksheet("Distribución respuestas", { views: [{ state: "frozen", ySplit: 3 }] });
  title(distributions, "Distribución completa de respuestas", 7);
  distributions.addRow([]);
  addDistributionTable(distributions, 3, allDistributions);
  distributions.columns = [{ width: 12 }, { width: 58 }, { width: 58 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 12 }];

  REPORT_THEMES.forEach((theme) => {
    const sheet = workbook.addWorksheet(theme.sheetName, { views: [{ state: "frozen", ySplit: 4 }] });
    title(sheet, theme.title, 7);
    sheet.addRow([]);
    sheet.addRow(["Código", "Indicador", "Fuente", "Resultado", "Base", "Estado", "Observación"]);
    styleHeader(sheet.getRow(3));
    theme.indicatorCodes.forEach((code) => {
      const surveyItem = analysis.indicators.find((item) => item.code === code);
      const administrativeItem = ADMINISTRATIVE_INDICATORS.find((item) => item.code === code);
      if (surveyItem) {
        const row = sheet.addRow([
          surveyItem.code,
          surveyItem.name,
          "Encuesta",
          surveyItem.value === null ? "" : surveyItem.value / 100,
          surveyItem.base,
          surveyItem.status,
          surveyItem.value === null ? "Sin base suficiente" : "Calculado automáticamente",
        ]);
        if (surveyItem.value !== null) row.getCell(4).numFmt = "0.0%";
      } else if (administrativeItem) {
        sheet.addRow([administrativeItem.code, administrativeItem.name, "Administrativa", "", "", "Pendiente", "Requiere una base administrativa complementaria."]);
      }
    });
    const themeRows = allDistributions.filter((row) => theme.questionIds.includes(row.questionId));
    const startRow = Math.max(sheet.rowCount + 2, 7);
    if (themeRows.length) addDistributionTable(sheet, startRow, themeRows);
    else {
      sheet.getCell(startRow, 1).value = "Este apartado no se calcula únicamente con respuestas de encuesta.";
      sheet.mergeCells(startRow, 1, startRow + 1, 7);
      sheet.getCell(startRow, 1).alignment = { wrapText: true, vertical: "middle" };
    }
    sheet.columns = [{ width: 12 }, { width: 54 }, { width: 18 }, { width: 30 }, { width: 14 }, { width: 16 }, { width: 58 }];
  });

  const questionMap = allQuestions.map((question) => ({ id: question.id, title: question.title }));
  const raw = workbook.addWorksheet("Base anonimizada", { views: [{ state: "frozen", ySplit: 1, xSplit: 3 }] });
  raw.addRow(["Código anónimo", "Unidad", "Fecha", ...questionMap.map((question) => `${question.id} · ${question.title}`)]);
  styleHeader(raw.getRow(1));
  responses.forEach((response) => raw.addRow([
    response.anonymousCode,
    response.unit,
    response.createdAt,
    ...questionMap.map((question) => safeValue(response.responses[question.id])),
  ]));
  raw.getColumn(3).numFmt = "dd-mm-yyyy hh:mm";
  raw.columns.forEach((column, index) => { column.width = index < 3 ? [18, 38, 20][index] : 42; });
  raw.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: raw.columnCount } };

  const dictionary = workbook.addWorksheet("Diccionario", { views: [{ state: "frozen", ySplit: 3 }] });
  title(dictionary, "Diccionario de preguntas y estructura de respuestas", 6);
  dictionary.addRow([]);
  dictionary.addRow(["Código", "Sección", "Pregunta", "Tipo", "Ítems", "Alternativas"]);
  styleHeader(dictionary.getRow(3));
  BASE_SURVEY_SECTIONS.forEach((section) => section.questions.forEach((question) => dictionary.addRow([
    question.id,
    section.title,
    question.title,
    question.type,
    "rows" in question ? question.rows.join(" | ") : "",
    "options" in question ? question.options.join(" | ") : "",
  ])));
  dictionary.columns = [{ width: 12 }, { width: 38 }, { width: 70 }, { width: 18 }, { width: 70 }, { width: 60 }];

  const methodology = workbook.addWorksheet("Metodología");
  title(methodology, "Metodología, alcance y resguardo del anonimato", 4);
  methodology.addRow([]);
  [
    ["Propósito", "Consolidar resultados de la encuesta y relacionarlos con los indicadores y complementos de equidad entregados como referencia."],
    ["Unidad de análisis", "Respuesta anónima. No se incluye RUT, correo, nombre ni otro identificador personal."],
    ["Regla de anonimato", `No se muestran resultados segmentados con menos de ${analysis.minimum} respuestas.`],
    ["Indicadores favorables", "Porcentaje de respuestas favorables según la definición de cada indicador."],
    ["Indicadores inversos", "Se invierte el sentido al incorporarlos al índice global."],
    ["Fuente encuesta", "Indicadores calculados directamente a partir de las 39 preguntas."],
    ["Fuente administrativa", "Indicadores que requieren nómina, remuneraciones, capacitación, movilidad, postulaciones o contrataciones."],
    ["Advertencia", "La ausencia de base administrativa no debe interpretarse como resultado cero ni como incumplimiento."],
  ].forEach((row) => methodology.addRow(row));
  methodology.columns = [{ width: 28 }, { width: 110 }, { width: 18 }, { width: 18 }];

  for (const sheet of workbook.worksheets) {
    sheet.properties.defaultRowHeight = 19;
    sheet.eachRow((row) => row.eachCell((cell) => {
      cell.alignment = { ...cell.alignment, vertical: "middle", wrapText: true };
      if (Number(cell.row) > 1) cell.border = { bottom: { style: "hair", color: { argb: `FF${border}` } } };
    }));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="informe_encuesta_genero_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
