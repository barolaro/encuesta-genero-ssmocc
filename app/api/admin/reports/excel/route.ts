import ExcelJS from "exceljs";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { BASE_SURVEY_SECTIONS } from "@/config/base-survey";
import { INSTITUTION_CONFIG } from "@/config/institution";
import { getDb } from "@/db";
import { surveyResponses } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { analyzeSurvey } from "@/lib/survey-analysis";

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

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const responses = await getDb().select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt));
  const analysis = analyzeSurvey(responses);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = INSTITUTION_CONFIG.institutionName;
  workbook.created = new Date();
  workbook.subject = "Informe institucional de encuesta de género";

  const summary = workbook.addWorksheet("Resumen ejecutivo", { views: [{ state: "frozen", ySplit: 4 }] });
  title(summary, `${INSTITUTION_CONFIG.surveyTitle} · Informe ejecutivo`, 5);
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

  const questionMap = BASE_SURVEY_SECTIONS.flatMap((section) => section.questions).map((question) => ({ id: question.id, title: question.title }));
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
