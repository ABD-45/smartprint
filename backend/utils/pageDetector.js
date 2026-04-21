const { PDFParse } = require("pdf-parse");
const { PDFDocument } = require("pdf-lib");
const AdmZip = require("adm-zip");
const mammoth = require("mammoth");

/**
 * Detect page count from an uploaded file buffer.
 *
 * PDF  → pdf-parse v2 (exact) → pdf-lib (exact) → size heuristic
 * DOCX → app.xml <Pages> (exact) → page-break count → multi-signal estimator
 * DOC  → file-size heuristic
 * TXT  → word-count ÷ 500
 * IMG  → always 1
 */
const detectPageCount = async (buffer, mimeType, originalName = "") => {
  const mime = (mimeType || "").toLowerCase();
  const ext  = (originalName.split(".").pop() || "").toLowerCase();

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mime === "application/pdf" || ext === "pdf") {
    try {
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      await parser.load();
      const pages = Math.max(1, parser.doc.numPages);
      console.log(`   [pageDetector] pdf-parse → ${pages} pages`);
      return { pages, method: "pdf-parse", confidence: "exact" };
    } catch (e1) {
      console.warn("   [pageDetector] pdf-parse failed:", e1.message);
    }
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages  = Math.max(1, pdfDoc.getPageCount());
      console.log(`   [pageDetector] pdf-lib → ${pages} pages`);
      return { pages, method: "pdf-lib", confidence: "exact" };
    } catch (e2) {
      console.warn("   [pageDetector] pdf-lib failed:", e2.message);
    }
    const pages = Math.max(1, Math.ceil(buffer.length / 3072));
    return { pages, method: "size-heuristic", confidence: "estimated" };
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    let zip = null;
    try { zip = new AdmZip(buffer); } catch (_) {}

    if (zip) {
      // Tier 1: docProps/app.xml — Microsoft Word stores rendered page count here
      try {
        const appXml = zip.readAsText("docProps/app.xml");
        const match  = appXml.match(/<Pages>(\d+)<\/Pages>/i);
        if (match) {
          const pages = Math.max(1, parseInt(match[1], 10));
          console.log(`   [pageDetector] DOCX app.xml → ${pages} pages`);
          return { pages, method: "docx-app-xml", confidence: "exact" };
        }
        console.warn("   [pageDetector] DOCX app.xml: no <Pages> tag");
      } catch (_) {
        console.warn("   [pageDetector] DOCX: docProps/app.xml not found");
      }

      // Tier 2: explicit page/section breaks in word/document.xml
      try {
        const docXml        = zip.readAsText("word/document.xml");
        const hardBreaks    = (docXml.match(/<w:br[^>]*w:type=["']page["']/g) || []).length;
        const sectionBreaks = (
          docXml.match(/<w:type\s+w:val=["'](nextPage|evenPage|oddPage)["']/g) || []
        ).length;
        const breakPages = hardBreaks + sectionBreaks + 1;
        if (breakPages > 1) {
          console.log(`   [pageDetector] DOCX page-breaks → ${breakPages} pages`);
          return { pages: breakPages, method: "docx-page-breaks", confidence: "estimated" };
        }
        console.warn("   [pageDetector] DOCX: no explicit breaks, using multi-signal");
      } catch (e2) {
        console.warn("   [pageDetector] DOCX document.xml failed:", e2.message);
      }
    }

    // Tier 3: Multi-signal estimator
    // Word count alone badly underestimates image-heavy reports.
    // We combine: word density + character density + media count + file size.
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text   = result.value.trim();
      const words  = text.split(/\s+/).filter(Boolean).length;
      const chars  = text.length;

      // Count embedded images and tables from the ZIP
      let imageCount = 0;
      let tableCount = 0;
      if (zip) {
        try {
          const entries = zip.getEntries();
          imageCount = entries.filter(e =>
            e.entryName.startsWith("word/media/") &&
            /\.(png|jpg|jpeg|gif|bmp|wmf|emf|svg)$/i.test(e.entryName)
          ).length;
          const docXml = zip.readAsText("word/document.xml");
          tableCount   = (docXml.match(/<w:tbl[\s>]/g) || []).length;
        } catch (_) {}
      }

      // ── Adaptive words-per-page calibration ──────────────────────────────
      // bytes-per-word is a proxy for image density:
      //   low  (<150 B/word) → dense text document, ~450 words/page
      //   mid  (<500 B/word) → mixed content,       ~380 words/page
      //   high (≥500 B/word) → image-heavy report,  ~300 words/page
      const bytesPerWord = words > 0 ? buffer.length / words : Infinity;
      const wordsPerPage = bytesPerWord < 150 ? 450
                         : bytesPerWord < 500 ? 380
                         : 300;

      const textPages  = Math.max(1, words / wordsPerPage);

      // Images and tables boost page count, but are capped so they never
      // add more than 50% / 20% of the text-based page estimate.
      // This prevents media dominating very large multi-image documents.
      const imageBoost = Math.min(imageCount * 0.5, textPages * 0.5);
      const tableBoost = Math.min(tableCount * 0.3, textPages * 0.2);

      const pages = Math.max(1, Math.round(textPages + imageBoost + tableBoost));


      console.log(
        `   [pageDetector] DOCX multi-signal → ${pages} pages` +
        ` [words=${words}→${fromWords.toFixed(1)}, chars→${fromChars.toFixed(1)},` +
        ` size=${(buffer.length/1024).toFixed(0)}KB→${fromSize.toFixed(1)},` +
        ` images=${imageCount}, tables=${tableCount}, media+=${mediaContrib.toFixed(1)}]`
      );
      return { pages, method: "multi-signal-estimate", confidence: "estimated" };
    } catch (e3) {
      console.warn("   [pageDetector] multi-signal failed:", e3.message);
    }

    // Tier 4: last-resort file size only
    const pages = Math.max(1, Math.ceil(buffer.length / (100 * 1024)));
    return { pages, method: "size-heuristic", confidence: "estimated" };
  }

  // ── DOC (binary Word) ────────────────────────────────────────────────────
  if (mime === "application/msword" || ext === "doc") {
    const pages = Math.max(1, Math.ceil(buffer.length / 10240));
    console.log(`   [pageDetector] DOC size-heuristic → ${pages} pages`);
    return { pages, method: "size-heuristic", confidence: "estimated" };
  }

  // ── Plain text ───────────────────────────────────────────────────────────
  if (mime === "text/plain" || ext === "txt") {
    const words = buffer.toString("utf8").trim().split(/\s+/).filter(Boolean).length;
    const pages = Math.max(1, Math.ceil(words / 500));
    console.log(`   [pageDetector] TXT word-count → ${pages} pages`);
    return { pages, method: "word-count-estimate", confidence: "estimated" };
  }

  // ── Images ───────────────────────────────────────────────────────────────
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext)) {
    return { pages: 1, method: "image-default", confidence: "exact" };
  }

  return { pages: 1, method: "unknown-fallback", confidence: "estimated" };
};

module.exports = { detectPageCount };
