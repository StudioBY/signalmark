import { jsPDF } from "jspdf";
import { stripEmDashes } from "@/lib/noEmDash";

/**
 * Renders the complete report into a PDF, in the same editorial register as the screen:
 * off-white page, dark ink, small letter-spaced labels, thin rules. No third-party logos.
 */
const INK = [27, 36, 48];
const MUTED = [120, 124, 130];
const RULE = [220, 221, 224];
const MARGIN = 56;
const WIDTH = 595; // A4 points
const BOTTOM = 780;

const clean = (t) => stripEmDashes(String(t || ""));
const spaced = (t) => clean(t).toUpperCase().split("").join(" ");

class Doc {
  constructor() {
    this.pdf = new jsPDF({ unit: "pt", format: "a4" });
    this.y = MARGIN + 20;
    this.paint();
  }

  paint() {
    this.pdf.setFillColor(252, 252, 251);
    this.pdf.rect(0, 0, WIDTH, 842, "F");
  }

  space(n) {
    this.y += n;
  }

  need(h) {
    if (this.y + h > BOTTOM) {
      this.pdf.addPage();
      this.paint();
      this.y = MARGIN;
    }
  }

  label(text) {
    this.need(30);
    this.pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    this.pdf.text(spaced(text), MARGIN, this.y);
    this.y += 18;
  }

  rule() {
    this.need(14);
    this.pdf.setDrawColor(...RULE).setLineWidth(0.6);
    this.pdf.line(MARGIN, this.y, WIDTH - MARGIN, this.y);
    this.y += 20;
  }

  heading(text, size = 17) {
    if (!clean(text)) return;
    this.pdf.setFont("helvetica", "normal").setFontSize(size).setTextColor(...INK);
    const lines = this.pdf.splitTextToSize(clean(text), WIDTH - MARGIN * 2);
    this.need(lines.length * (size + 6));
    this.pdf.text(lines, MARGIN, this.y);
    this.y += lines.length * (size + 6);
  }

  body(text, { muted = false, italic = false, size = 10.5 } = {}) {
    if (!clean(text)) return;
    this.pdf
      .setFont("helvetica", italic ? "italic" : "normal")
      .setFontSize(size)
      .setTextColor(...(muted ? MUTED : INK));
    const lines = this.pdf.splitTextToSize(clean(text), WIDTH - MARGIN * 2);
    this.need(lines.length * (size + 5));
    this.pdf.text(lines, MARGIN, this.y);
    this.y += lines.length * (size + 5) + 4;
  }

  row(key, value) {
    this.need(20);
    this.pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    this.pdf.text(spaced(key), MARGIN, this.y);
    this.pdf.setFontSize(10).setTextColor(...INK);
    this.pdf.text(clean(value), WIDTH - MARGIN, this.y, { align: "right" });
    this.y += 18;
  }
}

export function buildReportPdf(analysis, displayName) {
  const d = new Doc();
  const stats = analysis.lexical_stats || {};

  d.label("Linguistic signal report");
  d.space(6);
  d.heading(displayName || analysis.full_name || "", 22);
  d.body(analysis.profile_url, { muted: true, size: 9 });
  d.body(
    `Analyzed ${new Date(analysis.created_date || Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, engine ${analysis.engine_version || ""}`,
    { muted: true, size: 9 }
  );

  d.space(14);
  d.rule();
  d.heading(`Composite ${analysis.overall_score ?? 0} / 100`, 20);
  d.space(4);
  d.heading(analysis.verdict_title, 14);
  d.space(2);
  d.body(analysis.verdict_summary, { muted: true });

  d.space(16);
  d.rule();
  d.label("The five signals");
  for (const m of analysis.metrics || []) {
    d.need(60);
    d.row(m.label || m.key || "", `${m.score ?? 0}`);
    d.body(m.observation, { muted: true, size: 9.5 });
    d.space(6);
  }

  d.rule();
  d.label("Lexical measurements");
  d.row("Word count", stats.word_count ?? "");
  d.row("Type-token ratio", stats.type_token_ratio ?? "");
  d.row("Mean sentence length", `${stats.avg_sentence_length ?? ""} words`);
  d.row("Evidence markers", `${stats.evidence_marker_count ?? ""} (${stats.evidence_per_100_words ?? 0} per 100)`);
  d.row("Trigram repeat rate", stats.trigram_repeat_rate ?? "");
  d.row("Filler per 100 words", stats.filler_per_100_words ?? "");
  d.space(8);
  d.body(`Repeated phrases: ${(stats.repeated_phrases || []).join(", ") || "none"}`, {
    muted: true,
    size: 9.5,
  });
  d.body(`Dominant topics: ${(stats.dominant_topics || []).join(", ") || "none"}`, {
    muted: true,
    size: 9.5,
  });

  d.space(10);
  d.rule();
  d.label("Signal findings");
  for (const f of analysis.signal_findings || []) {
    d.need(70);
    d.heading(f.title, 12);
    d.body(f.body, { muted: true, size: 10 });
    d.space(8);
  }

  d.rule();
  d.label("Line-level revisions");
  for (const r of analysis.rewrites || []) {
    d.need(90);
    d.body(r.original, { muted: true, italic: true, size: 9.5 });
    d.body(r.revised, { size: 10.5 });
    d.body(r.rationale, { muted: true, size: 9 });
    d.space(10);
  }

  return d.pdf.output("blob");
}