import { readFile } from "node:fs/promises";
import path from "node:path";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { getDb } from "@/db";
import { surveyResponses } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { getInstitutionSettings } from "@/lib/institution-settings";
import { analyzeSurvey, type SurveyAnalysis } from "@/lib/survey-analysis";

export const runtime = "nodejs";

const A4: [number, number] = [595.28, 841.89];
const BLUE = rgb(0, 0.224, 0.651);
const RED = rgb(0.937, 0.2, 0.251);
const INK = rgb(0.075, 0.118, 0.192);
const MUTED = rgb(0.34, 0.42, 0.53);
const PALE = rgb(0.94, 0.96, 0.985);
const GREEN = rgb(0.12, 0.55, 0.31);
const AMBER = rgb(0.88, 0.55, 0.08);

function normalizePdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...");
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const words = normalizePdfText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  return lines;
}

async function embedLogo(pdf: PDFDocument, logoUrl: string): Promise<PDFImage | null> {
  try {
    let bytes: Uint8Array;
    let mime = "";
    if (logoUrl.startsWith("data:image/")) {
      const match = logoUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
      if (!match) return null;
      mime = match[1];
      bytes = Buffer.from(match[2], "base64");
    } else {
      if (!logoUrl.startsWith("/") || logoUrl.endsWith(".svg")) return null;
      const localPath = path.join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
      bytes = await readFile(localPath);
      mime = logoUrl.toLowerCase().endsWith(".jpg") || logoUrl.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
    }
    return mime === "image/jpeg" ? pdf.embedJpg(bytes) : pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function fitImage(page: PDFPage, image: PDFImage, x: number, y: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, { x: x + (maxWidth - width) / 2, y: y + (maxHeight - height) / 2, width, height });
}

function statusColor(status: string) {
  if (status === "Positivo") return GREEN;
  if (status === "Intermedio") return AMBER;
  if (status === "Crítico") return RED;
  return MUTED;
}

function recommendation(dimension: string) {
  const options: Record<string, string> = {
    "Ambiente laboral": "Reforzar prevención, difusión y confianza en los mecanismos de denuncia y acompañamiento.",
    "Conciliación y corresponsabilidad": "Revisar acceso, uso y liderazgo de jefaturas respecto de las medidas de conciliación.",
    "Cultura organizacional": "Instalar compromisos visibles de liderazgo inclusivo y seguimiento periódico de acciones.",
    "Gestión de personas": "Auditar oportunidades de desarrollo, selección, capacitación y remuneraciones con enfoque de género.",
    "Infraestructura inclusiva": "Levantar brechas de infraestructura, vestuario y EPP, con participación de las unidades.",
    "Salud integral": "Fortalecer promoción, prevención y acceso oportuno a apoyos de salud física y mental.",
    "Violencia intrafamiliar": "Difundir rutas confidenciales de orientación y apoyo institucional ante situaciones de VIF.",
  };
  return options[dimension] || "Definir un plan de mejora con responsables, plazos e indicadores de seguimiento.";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const [responses, institution] = await Promise.all([
    getDb().select().from(surveyResponses).orderBy(desc(surveyResponses.createdAt)),
    getInstitutionSettings(),
  ]);
  const analysis = analyzeSurvey(responses);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${institution.surveyTitle} - Informe gerencial`);
  pdf.setAuthor(`${institution.institutionName} - ${institution.networkShortName}`);
  pdf.setSubject("Informe gerencial de resultados de encuesta de género");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [networkLogo, institutionLogo] = await Promise.all([
    embedLogo(pdf, institution.networkLogoUrl),
    embedLogo(pdf, institution.logoUrl),
  ]);
  const generatedAt = new Date();
  const pages: PDFPage[] = [];

  const addPage = (section: string) => {
    const page = pdf.addPage(A4);
    pages.push(page);
    page.drawRectangle({ x: 0, y: A4[1] - 18, width: A4[0] * 0.36, height: 18, color: BLUE });
    page.drawRectangle({ x: A4[0] * 0.36, y: A4[1] - 18, width: A4[0] * 0.64, height: 18, color: RED });
    page.drawText(normalizePdfText(section.toUpperCase()), { x: 42, y: A4[1] - 48, size: 8, font: bold, color: BLUE });
    return page;
  };

  const drawTextBlock = (page: PDFPage, text: string, x: number, y: number, width: number, size = 10, lineHeight = 14, font = regular, color = INK) => {
    const lines = wrap(font, text, size, width);
    lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
    return y - lines.length * lineHeight;
  };

  const cover = addPage("Informe gerencial");
  if (networkLogo) fitImage(cover, networkLogo, 42, 682, 150, 86);
  if (institutionLogo) fitImage(cover, institutionLogo, 405, 682, 140, 86);
  cover.drawText(normalizePdfText(institution.networkName), { x: 42, y: 650, size: 10, font: bold, color: MUTED });
  drawTextBlock(cover, institution.surveyTitle, 42, 585, 500, 28, 33, bold, INK);
  cover.drawText("INFORME GERENCIAL DE RESULTADOS", { x: 42, y: 500, size: 13, font: bold, color: RED });
  drawTextBlock(cover, institution.institutionName, 42, 465, 500, 18, 23, bold, BLUE);
  cover.drawRectangle({ x: 42, y: 260, width: 511, height: 130, color: PALE });
  cover.drawText("Síntesis ejecutiva", { x: 62, y: 360, size: 13, font: bold, color: INK });
  cover.drawText(`${analysis.responseCount}`, { x: 62, y: 305, size: 34, font: bold, color: BLUE });
  cover.drawText("respuestas válidas", { x: 62, y: 287, size: 10, font: regular, color: MUTED });
  cover.drawText(analysis.overallScore === null ? "S/D" : `${analysis.overallScore.toFixed(1)}%`, { x: 250, y: 305, size: 34, font: bold, color: analysis.overallScore === null ? MUTED : BLUE });
  cover.drawText("índice global favorable", { x: 250, y: 287, size: 10, font: regular, color: MUTED });
  cover.drawText(`${analysis.summary.critical}`, { x: 455, y: 305, size: 34, font: bold, color: RED });
  cover.drawText("indicadores críticos", { x: 435, y: 287, size: 10, font: regular, color: MUTED });
  cover.drawText(`Fecha de emisión: ${generatedAt.toLocaleDateString("es-CL")}`, { x: 42, y: 105, size: 10, font: regular, color: MUTED });
  cover.drawText("Documento confidencial para análisis institucional. Resultados agregados y anónimos.", { x: 42, y: 82, size: 9, font: bold, color: RED });

  const overview = addPage("1. Resumen ejecutivo");
  overview.drawText("Resultado institucional", { x: 42, y: 760, size: 20, font: bold, color: INK });
  let y = 722;
  if (analysis.responseCount < analysis.minimum) {
    y = drawTextBlock(overview, `La encuesta registra ${analysis.responseCount} respuestas. La base mínima definida es ${analysis.minimum}; por lo tanto, no corresponde emitir conclusiones segmentadas todavía.`, 42, y, 510, 11, 16, regular, RED);
  } else {
    y = drawTextBlock(overview, `El índice global favorable alcanza ${analysis.overallScore?.toFixed(1) ?? "sin dato"}%. Se calcularon ${analysis.indicators.filter((item) => item.value !== null).length} indicadores a partir de ${analysis.responseCount} respuestas anónimas.`, 42, y, 510, 11, 16);
  }
  y -= 28;
  overview.drawText("Dimensiones priorizadas", { x: 42, y, size: 14, font: bold, color: BLUE });
  y -= 28;
  analysis.dimensions.slice(0, 5).forEach((item, index) => {
    overview.drawText(`${index + 1}. ${normalizePdfText(item.dimension)}`, { x: 42, y, size: 10, font: bold, color: INK });
    overview.drawRectangle({ x: 270, y: y - 2, width: 220, height: 10, color: PALE });
    overview.drawRectangle({ x: 270, y: y - 2, width: 220 * (item.score / 100), height: 10, color: item.score >= 70 ? GREEN : item.score >= 50 ? AMBER : RED });
    overview.drawText(`${item.score.toFixed(1)}%`, { x: 500, y: y - 1, size: 9, font: bold, color: INK });
    y -= 27;
  });
  y -= 10;
  overview.drawText("Recomendaciones prioritarias", { x: 42, y, size: 14, font: bold, color: BLUE });
  y -= 26;
  analysis.dimensions.slice(0, 3).forEach((item, index) => {
    y = drawTextBlock(overview, `${index + 1}. ${recommendation(item.dimension)}`, 48, y, 495, 10, 14);
    y -= 8;
  });

  const indicatorsPage = addPage("2. Indicadores");
  indicatorsPage.drawText("Indicadores de equidad y percepción", { x: 42, y: 760, size: 20, font: bold, color: INK });
  y = 725;
  const calculated = analysis.indicators.filter((item) => item.value !== null).sort((a, b) => (a.inverse ? 100 - a.value! : a.value!) - (b.inverse ? 100 - b.value! : b.value!));
  const drawIndicatorHeader = (page: PDFPage, top: number) => {
    page.drawRectangle({ x: 42, y: top - 5, width: 511, height: 22, color: BLUE });
    page.drawText("Código e indicador", { x: 50, y: top + 2, size: 8, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Resultado", { x: 440, y: top + 2, size: 8, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Base", { x: 515, y: top + 2, size: 8, font: bold, color: rgb(1, 1, 1) });
    return top - 23;
  };
  y = drawIndicatorHeader(indicatorsPage, y);
  let current = indicatorsPage;
  calculated.forEach((item) => {
    if (y < 90) {
      current = addPage("2. Indicadores - continuación");
      y = drawIndicatorHeader(current, 755);
    }
    const adjusted = item.inverse ? 100 - item.value! : item.value!;
    current.drawText(`${item.code} - ${normalizePdfText(item.name).slice(0, 62)}`, { x: 50, y, size: 8.5, font: regular, color: INK });
    current.drawText(`${adjusted.toFixed(1)}%`, { x: 450, y, size: 8.5, font: bold, color: statusColor(item.status) });
    current.drawText(`${item.base}`, { x: 520, y, size: 8.5, font: regular, color: INK });
    current.drawLine({ start: { x: 42, y: y - 6 }, end: { x: 553, y: y - 6 }, thickness: 0.5, color: PALE });
    y -= 22;
  });

  const alerts = addPage("3. Alertas y participación");
  alerts.drawText("Alertas de experiencia declarada", { x: 42, y: 760, size: 20, font: bold, color: INK });
  y = 715;
  const alertRows: [string, SurveyAnalysis["alerts"][keyof SurveyAnalysis["alerts"]]][] = [
    ["Discriminación en los últimos 2 años", analysis.alerts.discrimination],
    ["Acoso laboral en los últimos 2 años", analysis.alerts.workplaceHarassment],
    ["Acoso sexual en los últimos 2 años", analysis.alerts.sexualHarassment],
    ["Malestar anímico reciente", analysis.alerts.emotionalDistress],
  ];
  alertRows.forEach(([label, item]) => {
    alerts.drawText(normalizePdfText(label), { x: 42, y, size: 10, font: bold, color: INK });
    alerts.drawText(item.value === null ? "Sin datos" : `${item.value.toFixed(1)}%`, { x: 435, y, size: 11, font: bold, color: item.value === null ? MUTED : RED });
    alerts.drawText(`n=${item.base}`, { x: 505, y, size: 9, font: regular, color: MUTED });
    y -= 34;
  });
  y -= 20;
  alerts.drawText("Participación por unidad", { x: 42, y, size: 15, font: bold, color: BLUE });
  y -= 28;
  analysis.byUnit.slice(0, 12).forEach((item) => {
    alerts.drawText(normalizePdfText(item.unit).slice(0, 58), { x: 42, y, size: 9, font: regular, color: INK });
    alerts.drawText(`${item.responses} respuestas`, { x: 420, y, size: 9, font: bold, color: BLUE });
    alerts.drawText(item.score === null ? "Índice protegido" : `${item.score.toFixed(1)}%`, { x: 500, y, size: 8, font: regular, color: MUTED });
    y -= 22;
  });

  const methodology = addPage("4. Metodología");
  methodology.drawText("Metodología y límites de interpretación", { x: 42, y: 760, size: 20, font: bold, color: INK });
  y = 718;
  const notes = [
    "La encuesta es anónima y no solicita RUT, correo electrónico, nombre ni otro dato de identificación personal.",
    `Los resultados por unidad se protegen cuando existen menos de ${analysis.minimum} respuestas válidas.`,
    "Los indicadores de percepción corresponden al porcentaje favorable definido para cada pregunta. Los indicadores inversos se ajustan al calcular el índice global.",
    "Los resultados describen percepciones de quienes respondieron y no sustituyen una investigación administrativa, laboral o clínica.",
    "Los indicadores de participación, movilidad, capacitación, reclutamiento y brecha salarial requieren bases administrativas adicionales. No se calculan ni se imputan desde la encuesta.",
    "Las alertas de discriminación, acoso, violencia o malestar deben analizarse con protocolos institucionales, enfoque preventivo y estricto resguardo de la confidencialidad.",
  ];
  notes.forEach((note, index) => {
    methodology.drawCircle({ x: 50, y: y + 3, size: 3, color: index === 5 ? RED : BLUE });
    y = drawTextBlock(methodology, note, 62, y + 7, 480, 10.5, 15, regular, index === 5 ? RED : INK) - 14;
  });
  methodology.drawRectangle({ x: 42, y: 120, width: 511, height: 90, color: PALE });
  methodology.drawText("Próximo paso recomendado", { x: 62, y: 180, size: 12, font: bold, color: BLUE });
  drawTextBlock(methodology, "Validar los resultados con la contraparte técnica, complementar los indicadores administrativos pendientes y aprobar un plan de acción con responsables, plazos y seguimiento trimestral.", 62, 155, 470, 10.5, 15);

  pages.forEach((page, index) => {
    page.drawLine({ start: { x: 42, y: 48 }, end: { x: 553, y: 48 }, thickness: 0.6, color: PALE });
    page.drawText(`${institution.networkShortName} - ${normalizePdfText(institution.institutionName)}`, { x: 42, y: 30, size: 7.5, font: regular, color: MUTED });
    page.drawText(`Página ${index + 1} de ${pages.length}`, { x: 500, y: 30, size: 7.5, font: regular, color: MUTED });
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe_gerencial_encuesta_${generatedAt.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
