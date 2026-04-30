const { PDFParse } = require("pdf-parse");
const { PDFDocument } = require("pdf-lib");
const AdmZip = require("adm-zip");
const mammoth = require("mammoth");

/**
 * Mobile-friendly: Detect file type by magic bytes instead of relying on MIME type
 * because mobile browsers often send application/octet-stream instead of correct MIME
 */
const detectFileTypeByMagic = (buffer) => {
  if (!buffer || buffer.length < 4) return null;

  // PDF magic: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf";
  }

  // DOCX/ZIP magic: PK (504b)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    // Could be DOCX (ZIP-based Office format)
    try {
      new AdmZip(buffer);
      return "docx"; // Successfully parsed as ZIP, likely DOCX
    } catch (_) {
      return null;
    }
  }

  // DOC magic: D0CF (Office Binary)
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf) {
    return "doc";
  }

  return null;
};

/**
 * Detect page count from an uploaded file buffer.
 * MOBILE-FRIENDLY: Uses magic bytes as fallback when MIME type is unreliable.
 *
 * Priority:
 * 1. File extension (if valid)
 * 2. Magic bytes (for mobile where MIME is wrong)
 * 3. MIME type (last resort)
 *
 * PDF  → pdf-parse → pdf-lib → size heuristic
 * DOCX → app.xml <Pages> → page-breaks → multi-signal
 * DOC  → size heuristic
 * TXT  → word-count ÷ 500
 * IMG  → always 1
 */
const detectPageCount = async (buffer, mimeType, originalName = "") => {
  const mime = (mimeType || "").toLowerCase();
  const ext = (originalName.split(".").pop() || "").toLowerCase();

  // ── Step 1: Try magic bytes first (mobile safety) ───────────────────────
  const magicType = detectFileTypeByMagic(buffer);

  // ── Step 2: Determine actual file type ──────────────────────────────────
  // Priority: extension > magic bytes > MIME type
  let fileType = ext;
  if (!fileType && magicType) {
    fileType = magicType;
  }
  if (!fileType) {
    // Fall back to MIME type
    if (mime.includes("pdf")) fileType = "pdf";
    else if (mime.includes("wordprocessingml")) fileType = "docx";
    else if (mime.includes("msword")) fileType = "doc";
    else if (mime.includes("text")) fileType = "txt";
    else if (mime.includes("image")) fileType = "image";
  }

  console.log(`   [pageDetector] File: ${originalName || "unknown"} | ext=${ext} | magic=${magicType} | mime=${mime} → type=${fileType}`);

  // ── PDF ──────────────────────────────────────────────────────────────────
  // Priority: pdf-lib (best for scanned/image PDFs) → pdf-parse → size heuristic
  if (fileType === "pdf" || mime === "application/pdf" || ext === "pdf") {
    // Tier 1: pdf-lib (most reliable for scanned + image-heavy PDFs)
    // Uses PDF page structure directly, not text extraction
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = Math.max(1, pdfDoc.getPageCount());
      console.log(`   [pageDetector] pdf-lib (structure) → ${pages} pages [scanned-safe]`);
      return { pages, method: "pdf-lib", confidence: "exact" };
    } catch (e1) {
      console.warn("   [pageDetector] pdf-lib failed:", e1.message);
    }

    // Tier 2: pdf-parse (fallback, uses numpages from PDF metadata)
    // Works for both text and image PDFs, but pdf-lib is more robust
    try {
      const data = await pdfParse(buffer);
      const pages = Math.max(1, data.numpages);
      console.log(`   [pageDetector] pdf-parse (metadata) → ${pages} pages`);
      return { pages, method: "pdf-parse", confidence: "exact" };
    } catch (e2) {
      console.warn("   [pageDetector] pdf-parse failed:", e2.message);
    }

    // Tier 3: Size-based heuristic (last resort, roughly 3KB per page)
    const pages = Math.max(1, Math.ceil(buffer.length / 3072));
    console.log(`   [pageDetector] size-heuristic → ${pages} pages [estimated]`);
    return { pages, method: "size-heuristic", confidence: "estimated" };
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    fileType === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    let zip = null;
    try {
      zip = new AdmZip(buffer);
    } catch (_) {}

    if (zip) {
      // Tier 1: docProps/app.xml — Microsoft Word stores rendered page count here
      try {
        const appXml = zip.readAsText("docProps/app.xml");
        const match = appXml.match(/<Pages>(\d+)<\/Pages>/i);
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
        const docXml = zip.readAsText("word/document.xml");
        const hardBreaks = (docXml.match(/<w:br[^>]*w:type=["']page["']/g) || []).length;
        const sectionBreaks = (docXml.match(/<w:type\s+w:val=["'](nextPage|evenPage|oddPage)["']/g) || []).length;
        const breakPages = hardBreaks + sectionBreaks + 1;
        if (breakPages > 1) {
          console.log(`   [pageDetector] DOCX page-breaks → ${breakPages} pages`);
          return { pages: breakPages, method: "docx-page-breaks", confidence: "estimated" };
        }
        console.warn("   [pageDetector] DOCX: no explicit breaks, using fallback");
      } catch (e2) {
        console.warn("   [pageDetector] DOCX document.xml failed:", e2.message);
      }
    }

    // Tier 3: Multi-signal estimator using text extraction
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      const chars = text.length;

      // Count embedded images and tables from the ZIP
      let imageCount = 0;
      let tableCount = 0;
      if (zip) {
        try {
          const entries = zip.getEntries();
          imageCount = entries.filter((e) =>
            e.entryName.startsWith("word/media/") &&
            /\.(png|jpg|jpeg|gif|bmp|wmf|emf|svg)$/i.test(e.entryName)
          ).length;
          const docXml = zip.readAsText("word/document.xml");
          tableCount = (docXml.match(/<w:tbl[\s>]/g) || []).length;
        } catch (_) {}
      }

      // Adaptive words-per-page calibration based on content density
      const bytesPerWord = words > 0 ? buffer.length / words : Infinity;
      const wordsPerPage =
        bytesPerWord < 150 ? 450 : bytesPerWord < 500 ? 380 : 300;

      const textPages = Math.max(1, words / wordsPerPage);
      const imageBoost = Math.min(imageCount * 0.5, textPages * 0.5);
      const tableBoost = Math.min(tableCount * 0.3, textPages * 0.2);
      const pages = Math.max(1, Math.round(textPages + imageBoost + tableBoost));

      console.log(
        `   [pageDetector] DOCX multi-signal → ${pages} pages [words=${words}, images=${imageCount}, tables=${tableCount}]`
      );
      return { pages, method: "docx-multi-signal", confidence: "estimated" };
    } catch (e3) {
      console.warn("   [pageDetector] multi-signal failed:", e3.message);
    }

    // Tier 4: last-resort file size only
    const pages = Math.max(1, Math.ceil(buffer.length / (100 * 1024)));
    console.log(`   [pageDetector] DOCX size-heuristic → ${pages} pages`);
    return { pages, method: "docx-size-heuristic", confidence: "estimated" };
  }

  // ── DOC (binary Word) ────────────────────────────────────────────────────
  if (fileType === "doc" || mime === "application/msword" || ext === "doc") {
    const pages = Math.max(1, Math.ceil(buffer.length / 10240));
    console.log(`   [pageDetector] DOC size-heuristic → ${pages} pages`);
    return { pages, method: "doc-size-heuristic", confidence: "estimated" };
  }

  // ── Plain text ───────────────────────────────────────────────────────────
  if (fileType === "txt" || mime === "text/plain" || ext === "txt") {
    const words = buffer.toString("utf8").trim().split(/\s+/).filter(Boolean).length;
    const pages = Math.max(1, Math.ceil(words / 500));
    console.log(`   [pageDetector] TXT word-count → ${pages} pages`);
    return { pages, method: "txt-word-count", confidence: "estimated" };
  }

  // ── Images ───────────────────────────────────────────────────────────────
  if (fileType === "image" || mime.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext)) {
    console.log(`   [pageDetector] Image → 1 page`);
    return { pages: 1, method: "image-default", confidence: "exact" };
  }

  // Default fallback
  console.log(`   [pageDetector] Unknown type → 1 page (fallback)`);
  return { pages: 1, method: "unknown-fallback", confidence: "estimated" };
};

module.exports = { detectPageCount };
