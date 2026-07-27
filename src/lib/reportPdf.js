import { jsPDF } from "jspdf";
import { stripEmDashes } from "@/lib/noEmDash";
import { loadGrayscaleDataUrl } from "@/lib/pdfImage";

/**
 * Renders the complete report into a PDF, in the same editorial register as the screen:
 * off-white page, dark ink, small letter-spaced labels, thin rules, score ring and
 * signal bars. No third-party logos.
 */
const INK = [27, 36, 48];
const MUTED = [120, 124, 130];
const RULE = [220, 221, 224];
const MARGIN = 56;
const WIDTH = 595; // A4 points
const HEIGHT = 842;
const BOTTOM = 762;

const clean = (t) => stripEmDashes(String(t || ""));
const spaced = (t) => clean(t).toUpperCase().split("").join(" ");

/** "Linguistic-Signal-Report-Jonathan-Pacifici.pdf" */
export function reportFileName(name) {
  const slug = clean(name)
    .replace(/[^A-Za-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `Linguistic-Signal-Report${slug ? `-${slug}` : ""}.pdf`;
}

class Doc {
  constructor() {
    this.pdf = new jsPDF({ unit: "pt", format: "a4" });
    this.y = MARGIN + 20;
    this.paint();
  }

  paint() {
    this.pdf.setFillColor(252, 252, 251);
    this.pdf.rect(0, 0, WIDTH, HEIGHT, "F");
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
    this.pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    this.pdf.text(spaced(text), MARGIN, this.y);
    this.y += 22;
  }

  rule() {
    this.pdf.setDrawColor(...RULE).setLineWidth(0.6);
    this.pdf.line(MARGIN, this.y, WIDTH - MARGIN, this.y);
    this.y += 24;
  }

  /** Rule + label + the first block of a section, kept together to avoid orphan headings. */
  section(text, firstBlockHeight = 90) {
    this.need(46 + firstBlockHeight);
    this.rule();
    this.label(text);
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
    this.y += 20;
  }

  /** Small grayscale circle photo, drawn beside the name. Returns the width consumed. */
  photo(dataUrl, x, y, size) {
    const r = size / 2;
    this.pdf.saveGraphicsState();
    this.pdf.circle(x + r, y + r, r);
    this.pdf.clip();
    this.pdf.discardPath();
    this.pdf.addImage(dataUrl, "PNG", x, y, size, size);
    this.pdf.restoreGraphicsState();
    this.pdf.setDrawColor(...RULE).setLineWidth(0.6);
    this.pdf.circle(x + r, y + r, r, "S");
  }

  /** Thin-stroke ring with the composite score inside, like the on-screen dial. */
  ring(score) {
    const r = 34;
    this.need(r * 2 + 24);
    const cx = MARGIN + r;
    const cy = this.y + r;
    const pct = Math.max(0, Math.min(100, Number(score) || 0)) / 100;

    this.pdf.setLineWidth(1.2).setDrawColor(...RULE);
    this.pdf.circle(cx, cy, r, "S");

    // Progress arc, drawn clockwise from the top as short segments.
    this.pdf.setDrawColor(...INK).setLineWidth(1.6);
    const sweep = pct * 2 * Math.PI;
    const steps = Math.max(1, Math.round(pct * 120));
    for (let i = 0; i < steps; i++) {
      const a1 = -Math.PI / 2 + (i / steps) * sweep;
      const a2 = -Math.PI / 2 + ((i + 1) / steps) * sweep;
      this.pdf.line(
        cx + r * Math.cos(a1),
        cy + r * Math.sin(a1),
        cx + r * Math.cos(a2),
        cy + r * Math.sin(a2)
      );
    }

    this.pdf.setFont("helvetica", "normal").setFontSize(20).setTextColor(...INK);
    this.pdf.text(String(Math.round(Number(score) || 0)), cx, cy + 4, { align: "center" });
    this.pdf.setFontSize(6.5).setTextColor(...MUTED);
    this.pdf.text(spaced("of 100"), cx, cy + 18, { align: "center" });

    this.y = cy + r + 22;
  }

  /** Thin horizontal score bar, filled proportionally, like the on-screen metric bar. */
  bar(score) {
    this.need(14);
    const pct = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
    const full = WIDTH - MARGIN * 2;
    this.pdf.setLineWidth(1.4).setDrawColor(...RULE);
    this.pdf.line(MARGIN, this.y, MARGIN + full, this.y);
    if (pct > 0) {
      this.pdf.setDrawColor(...INK);
      this.pdf.line(MARGIN, this.y, MARGIN + full * pct, this.y);
    }
    this.y += 16;
  }

  /** Marketing footer on every page, added once the content is complete. */
  footers(site) {
    const total = this.pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.pdf.setPage(p);
      this.pdf.setDrawColor(...RULE).setLineWidth(0.6);
      this.pdf.line(MARGIN, HEIGHT - 62, WIDTH - MARGIN, HEIGHT - 62);
      this.pdf.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...MUTED);
      this.pdf.text(spaced(`Linguistic signal score · ${site}`), MARGIN, HEIGHT - 46);
    }
  }
}

export async function buildReportPdf(analysis, displayName) {
  const d = new Doc();
  const stats = analysis.lexical_stats || {};
  const name = displayName || analysis.full_name || "";
  const photo = await loadGrayscaleDataUrl(analysis.photo_url);

  d.label("Linguistic signal report");
  d.space(4);

  if (photo) {
    const top = d.y - 16;
    d.photo(photo, MARGIN, top, 40);
    d.pdf.setFont("helvetica", "normal").setFontSize(22).setTextColor(...INK);
    d.pdf.text(clean(name), MARGIN + 54, top + 27);
    d.y = top + 56;
  } else {
    d.heading(name, 22);
  }

  d.body(analysis.profile_url, { muted: true, size: 9 });
  d.body(
    `Analyzed ${new Date(analysis.created_date || Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, engine ${analysis.engine_version || ""}`,
    { muted: true, size: 9 }
  );

  d.space(20);
  d.rule();
  d.label("Signal score");
  d.ring(analysis.overall_score ?? 0);
  d.heading(analysis.verdict_title, 14);
  d.space(2);
  d.body(analysis.verdict_summary, { muted: true });

  d.space(24);
  d.section("The five signals", 96);
  for (const m of (analysis.metrics || [])) {
    d.need(76);
    d.row(m.label || m.key || "", `${m.score ?? 0}`);
    d.bar(m.score);
    d.body(m.observation, { muted: true, size: 9.5 });
    d.space(14);
  }

  d.space(10);
  d.section("Lexical measurements", 140);
  d.row("Word count", stats.word_count ?? "");
  d.row("Type-token ratio", stats.type_token_ratio ?? "");
  d.row("Mean sentence length", `${stats.avg_sentence_length ?? ""} words`);
  d.row("Evidence markers", `${stats.evidence_marker_count ?? ""} (${stats.evidence_per_100_words ?? 0} per 100)`);
  d.row("Trigram repeat rate", stats.trigram_repeat_rate ?? "");
  d.row("Filler per 100 words", stats.filler_per_100_words ?? "");
  d.space(10);
  d.body(`Repeated phrases: ${(stats.repeated_phrases || []).join(", ") || "none"}`, {
    muted: true,
    size: 9.5,
  });
  d.body(`Dominant topics: ${(stats.dominant_topics || []).join(", ") || "none"}`, {
    muted: true,
    size: 9.5,
  });

  d.space(24);
  d.section("Signal findings", 96);
  for (const f of (analysis.signal_findings || [])) {
    d.need(84);
    d.heading(f.title, 12);
    d.body(f.body, { muted: true, size: 10 });
    d.space(16);
  }

  d.space(10);
  d.section("Line-level revisions", 110);
  for (const r of (analysis.rewrites || [])) {
    d.need(104);
    d.body(r.original, { muted: true, italic: true, size: 9.5 });
    d.body(r.revised, { size: 10.5 });
    d.body(r.rationale, { muted: true, size: 9 });
    d.space(18);
  }

  const site =
    typeof window !== "undefined"
      ? window.location.host.replace(/^www\./, "")
      : "linguistic-signal-score";
  d.footers(site);

  return d.pdf.output("blob");
}