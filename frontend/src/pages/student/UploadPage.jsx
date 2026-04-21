import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FileUploader } from "../../components/FileUploader";
import { jobService } from "../../services/jobService";

const PAPER_SIZES = ["A4", "A3", "Letter"];

/* ── helpers ──────────────────────────────────────────────── */
const fmtSize = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const fileIcon = (mime = "") => {
  if (mime.includes("pdf"))   return { icon: "picture_as_pdf", color: "#e53935" };
  if (mime.includes("word"))  return { icon: "description",    color: "#1565c0" };
  if (mime.includes("text"))  return { icon: "article",        color: "#558b2f" };
  if (mime.startsWith("image")) return { icon: "image",        color: "#6a1b9a" };
  return { icon: "insert_drive_file", color: "var(--primary)" };
};

const confidenceMeta = (c) =>
  c === "exact"
    ? { label: "Exact Count", color: "#2e7d32", bg: "rgba(46,125,50,0.1)" }
    : { label: "Estimated",   color: "#e65100", bg: "rgba(230,81,0,0.1)"  };

/* ── component ────────────────────────────────────────────── */
export default function UploadPage() {
  const navigate = useNavigate();

  const [file,     setFile]     = useState(null);
  const [analysis, setAnalysis] = useState(null);   // { pages, confidence, method, fileName, fileSize, mimeType }
  const [analyzing,setAnalyzing]= useState(false);
  const [pagesOverride, setPagesOverride] = useState(""); // user-editable
  const [options, setOptions]   = useState({
    copies: 1, color: false, duplex: false, paperSize: "A4", orientation: "portrait",
  });
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);

  const abortRef = useRef(null);

  /* auto-analyze whenever a file is selected */
  useEffect(() => {
    if (!file) { setAnalysis(null); setPagesOverride(""); return; }

    setAnalyzing(true);
    setAnalysis(null);

    jobService.analyzeFile(file)
      .then((data) => {
        setAnalysis(data);
        setPagesOverride(String(data.pages));
      })
      .catch(() => {
        // server unavailable — fall back gracefully
        const fallback = file.type.startsWith("image/") ? 1 : null;
        setAnalysis({ pages: fallback, confidence: "estimated", method: "client-fallback",
          fileName: file.name, fileSize: file.size, mimeType: file.type });
        setPagesOverride(fallback ? String(fallback) : "");
        toast("⚠️ Couldn't auto-detect pages — please enter manually.", { icon: "ℹ️" });
      })
      .finally(() => setAnalyzing(false));
  }, [file]);

  const isExact     = analysis?.confidence === "exact";
  // For exact (PDF/image/Word app.xml): hard cap at detected
  // For estimated (DOCX heuristic):     soft cap — allow up to detected×1.5
  //   so users can correct underestimates without being blocked
  const detectedMax  = analysis ? analysis.pages : null;
  const absoluteMax  = detectedMax
    ? (isExact ? detectedMax : Math.round(detectedMax * 1.5))
    : 999;
  const pages        = Math.min(parseInt(pagesOverride) || 0, absoluteMax);
  const exceedsEst   = !isExact && detectedMax && pages > detectedMax;
  const pricePerPage = options.color ? 5 : 1;
  const discount     = options.duplex ? 0.9 : 1;
  const total        = Math.round(pricePerPage * discount * pages * options.copies * 100) / 100;

  const handlePagesChange = (e) => {
    const raw = parseInt(e.target.value);
    if (isExact && detectedMax && raw > detectedMax) {
      // Hard cap for exact detection
      setPagesOverride(String(detectedMax));
      toast("⚠️ Cannot exceed exact page count.", { icon: "🚫", id: "page-cap" });
    } else if (!isExact && detectedMax && raw > absoluteMax) {
      // Soft cap at 1.5× for estimated
      setPagesOverride(String(absoluteMax));
      toast(`Max allowed is ${absoluteMax} (1.5× estimated).`, { icon: "⚠️", id: "page-cap" });
    } else {
      setPagesOverride(e.target.value);
    }
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setOptions(o => ({ ...o, [name]: type === "checkbox" ? checked : value }));
  };

  const handleRemove = () => { setFile(null); setAnalysis(null); setPagesOverride(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file first.");
    if (!pages || pages < 1) return toast.error("Enter or wait for page count.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pages", pages);
    Object.entries(options).forEach(([k, v]) => formData.append(k, v));

    setUploading(true);
    try {
      const res = await jobService.upload(formData, setProgress);
      toast.success("File uploaded! Proceed to payment.");
      navigate(`/pay/${res.job.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally { setUploading(false); setProgress(0); }
  };

  const fi = file ? fileIcon(file.type) : null;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48 }}>
        <div>
          <span style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em",
            color:"var(--on-surface-variant)", display:"block", marginBottom:6 }}>New Submission</span>
          <h1 style={{ letterSpacing:"-0.03em", lineHeight:1.1, marginBottom:8 }}>Upload Print Job</h1>
          <p style={{ maxWidth:420 }}>Upload your document — pages are detected automatically.</p>
        </div>
        <div style={{ background:"var(--surface-container-low)", borderRadius:"var(--radius-xl)",
          padding:"16px 24px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ background:"rgba(0,104,121,0.1)", borderRadius:"var(--radius-full)", padding:10 }}>
            <span className="material-symbols-outlined" style={{ color:"var(--secondary)", fontSize:22 }}>verified</span>
          </div>
          <div>
            <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.06em", color:"var(--on-surface-variant)" }}>Printer Status</div>
            <div style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--secondary)" }}>Main Lab Online</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} id="upload-form">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:32, alignItems:"start" }}>

          {/* ── LEFT ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

            {/* Drop zone */}
            <div style={{ background:"var(--surface-container-lowest)", borderRadius:"var(--radius-xl)",
              padding:4, boxShadow:"var(--shadow-sm)" }}>
              <FileUploader file={file} onFileSelect={setFile} onRemove={handleRemove} />
            </div>

            {/* ── File Info Card (appears after file selected) ── */}
            {(file && (analyzing || analysis)) && (
              <div style={{ background:"var(--surface-container-low)", borderRadius:"var(--radius-xl)",
                padding:24, border:"1px solid var(--outline-variant)", position:"relative", overflow:"hidden" }}>

                {/* shimmer bar while analyzing */}
                {analyzing && (
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                    background:"linear-gradient(90deg, transparent, var(--primary), transparent)",
                    animation:"shimmer 1.4s infinite" }} />
                )}

                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                  <span className="material-symbols-outlined" style={{ color:"var(--primary)", fontSize:18 }}>
                    {analyzing ? "autorenew" : "info"}
                  </span>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.06em", color:"var(--on-surface-variant)" }}>
                    {analyzing ? "Analyzing File…" : "File Intelligence"}
                  </span>
                  {analysis && !analyzing && (
                    <span style={{ marginLeft:"auto", fontSize:"0.7rem", fontWeight:700, padding:"2px 10px",
                      borderRadius:999, color: confidenceMeta(analysis.confidence).color,
                      background: confidenceMeta(analysis.confidence).bg }}>
                      {confidenceMeta(analysis.confidence).label}
                    </span>
                  )}
                </div>

                {analyzing ? (
                  <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                    <div style={{ width:44, height:44, borderRadius:"var(--radius-lg)",
                      background:"var(--surface-container-highest)", display:"flex",
                      alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span className="material-symbols-outlined"
                        style={{ color:fi?.color, fontSize:24, animation:"spin 1s linear infinite" }}>
                        {fi?.icon}
                      </span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:"0.9rem", marginBottom:4 }}>{file.name}</div>
                      <div style={{ fontSize:"0.75rem", color:"var(--on-surface-variant)" }}>
                        Detecting pages · {fmtSize(file.size)}
                      </div>
                      <div style={{ marginTop:10, height:6, borderRadius:999,
                        background:"var(--surface-container-highest)", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:"60%", borderRadius:999,
                          background:"linear-gradient(90deg, var(--primary), var(--secondary))",
                          animation:"pulse 1.4s ease-in-out infinite" }} />
                      </div>
                    </div>
                  </div>
                ) : analysis && (
                  <>
                    {/* File meta row */}
                    <div style={{ display:"flex", gap:14, alignItems:"center", marginBottom:20 }}>
                      <div style={{ width:44, height:44, borderRadius:"var(--radius-lg)",
                        background:`${fi?.color}18`, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0 }}>
                        <span className="material-symbols-outlined" style={{ color:fi?.color, fontSize:24 }}>
                          {fi?.icon}
                        </span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:"0.9rem", whiteSpace:"nowrap",
                          overflow:"hidden", textOverflow:"ellipsis" }}>{analysis.fileName}</div>
                        <div style={{ fontSize:"0.75rem", color:"var(--on-surface-variant)", marginTop:2 }}>
                          {fmtSize(analysis.fileSize)} · {analysis.mimeType}
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                      {[
                        { icon:"menu_book", label:"Detected Pages", val: analysis.pages ?? "—" },
                        { icon:"layers",    label:"Copies",         val: options.copies },
                        { icon:"payments",  label:"Est. Cost",
                          val: analysis.pages ? `₹${(pricePerPage * discount * (analysis.pages) * options.copies).toFixed(2)}` : "—" },
                      ].map(({ icon, label, val }) => (
                        <div key={label} style={{ background:"var(--surface-container-lowest)",
                          borderRadius:"var(--radius-lg)", padding:"14px 16px" }}>
                          <span className="material-symbols-outlined"
                            style={{ color:"var(--primary)", fontSize:18, marginBottom:6, display:"block" }}>
                            {icon}
                          </span>
                          <div style={{ fontSize:"1.2rem", fontWeight:900, letterSpacing:"-0.02em",
                            color:"var(--on-surface)" }}>{val}</div>
                          <div style={{ fontSize:"0.68rem", fontWeight:600, textTransform:"uppercase",
                            letterSpacing:"0.05em", color:"var(--on-surface-variant)", marginTop:2 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Editable page count — max = detected, can go lower */}
                    <div style={{ background:"rgba(0,104,121,0.06)", borderRadius:"var(--radius-lg)",
                      padding:"14px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                        <span className="material-symbols-outlined" style={{ color:"var(--primary)", fontSize:18 }}>
                          edit
                        </span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
                            letterSpacing:"0.05em", color:"var(--on-surface-variant)", marginBottom:6 }}>
                            Print Page Count
                            <span style={{ marginLeft:8, fontWeight:500, textTransform:"none",
                              letterSpacing:0, color:"var(--on-surface-variant)" }}>
                              (max: {analysis.pages})
                            </span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <input
                              id="pages-input"
                              type="number" min="1" max={absoluteMax}
                              value={pagesOverride}
                              onChange={handlePagesChange}
                              onBlur={() => {
                                const v = parseInt(pagesOverride);
                                if (!v || v < 1) setPagesOverride("1");
                                if (v > absoluteMax) setPagesOverride(String(absoluteMax));
                              }}
                              style={{ width:80, padding:"6px 10px", borderRadius:"var(--radius-md)",
                                border: exceedsEst
                                  ? "1.5px solid #e65100"
                                  : "1.5px solid var(--outline-variant)",
                                fontWeight:700, fontSize:"1rem",
                                background:"var(--surface-container-lowest)",
                                color: exceedsEst ? "#e65100" : "var(--on-surface)" }}
                            />
                            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                              {isExact ? (
                                <>
                                  <span style={{ fontSize:"0.75rem", color:"var(--on-surface-variant)" }}>
                                    Exact count — can print fewer
                                  </span>
                                  <span style={{ fontSize:"0.7rem", color:"#c62828", fontWeight:600 }}>
                                    🔒 Hard limit: {detectedMax} pages
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize:"0.75rem", color:"var(--on-surface-variant)" }}>
                                    Estimated — verify and adjust if needed
                                  </span>
                                  <span style={{ fontSize:"0.7rem",
                                    color: exceedsEst ? "#e65100" : "#2e7d32", fontWeight:600 }}>
                                    {exceedsEst
                                      ? `⚠ Exceeds estimate (${detectedMax}) — check your doc`
                                      : `✓ Within estimate (max allowed: ${absoluteMax})`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Visual page range bar */}
                      <div style={{ marginTop:4 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          fontSize:"0.68rem", color:"var(--on-surface-variant)", marginBottom:4 }}>
                          <span>1</span>
                          <span style={{ fontWeight:700,
                            color: exceedsEst ? "#e65100" : "var(--primary)" }}>
                            Printing: {pages || 0} of {detectedMax} estimated pages
                          </span>
                          <span>{absoluteMax}</span>
                        </div>
                        <div style={{ height:6, borderRadius:999,
                          background:"var(--surface-container-highest)", overflow:"hidden" }}>
                          <div style={{
                            height:"100%", borderRadius:999,
                            width: `${absoluteMax > 0 ? Math.min((pages / absoluteMax) * 100, 100) : 0}%`,
                            background: exceedsEst
                              ? "linear-gradient(90deg, #e65100, #ff8f00)"
                              : pages === detectedMax
                              ? "linear-gradient(90deg, var(--primary), var(--secondary))"
                              : "linear-gradient(90deg, #e65100, #ff8f00)",
                            transition:"width 0.3s ease",
                          }} />
                        </div>
                        {exceedsEst && (
                          <div style={{ fontSize:"0.68rem", color:"#e65100", marginTop:4, fontWeight:600 }}>
                            ⚠ {pages - detectedMax} page{pages - detectedMax > 1 ? "s" : ""} above estimate — please verify
                          </div>
                        )}
                        {!exceedsEst && pages < detectedMax && (
                          <div style={{ fontSize:"0.68rem", color:"#e65100", marginTop:4, fontWeight:600 }}>
                            Partial print: {detectedMax - pages} page{detectedMax - pages > 1 ? "s" : ""} skipped
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Settings bento ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {/* Primary Config */}
              <div style={{ background:"var(--surface-container-low)", borderRadius:"var(--radius-xl)", padding:28 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                  <span className="material-symbols-outlined" style={{ color:"var(--primary)", fontSize:18 }}>settings_applications</span>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.06em", color:"var(--on-surface-variant)" }}>Primary Config</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  <div className="form-group">
                    <label className="form-label">Copies</label>
                    <div style={{ display:"flex", alignItems:"center", background:"var(--surface-container-lowest)",
                      borderRadius:"var(--radius-lg)", padding:4, width:"fit-content" }}>
                      <button type="button" onClick={() => setOptions(o => ({ ...o, copies: Math.max(1, o.copies - 1) }))}
                        style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer",
                          borderRadius:"var(--radius-md)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize:18 }}>remove</span>
                      </button>
                      <span style={{ width:36, textAlign:"center", fontWeight:700, fontSize:"1rem" }}>{options.copies}</span>
                      <button type="button" onClick={() => setOptions(o => ({ ...o, copies: Math.min(50, o.copies + 1) }))}
                        style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer",
                          borderRadius:"var(--radius-md)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize:18 }}>add</span>
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paper Format</label>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {PAPER_SIZES.map(s => (
                        <button key={s} type="button" onClick={() => setOptions(o => ({ ...o, paperSize: s }))}
                          style={{ padding:"10px", borderRadius:"var(--radius-lg)", border:"none", cursor:"pointer",
                            background: options.paperSize === s ? "var(--surface-container-highest)" : "var(--surface-container-lowest)",
                            color: options.paperSize === s ? "var(--primary)" : "var(--on-surface-variant)",
                            fontWeight:700, fontSize:"0.8rem",
                            outline: options.paperSize === s ? "2px solid var(--primary)" : "none" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Finish */}
              <div style={{ background:"var(--surface-container-low)", borderRadius:"var(--radius-xl)", padding:28 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                  <span className="material-symbols-outlined" style={{ color:"var(--primary)", fontSize:18 }}>palette</span>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.06em", color:"var(--on-surface-variant)" }}>Visual Finish</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  <div className="form-group">
                    <label className="form-label">Color Mode</label>
                    <div style={{ display:"flex", background:"var(--surface-container-lowest)",
                      borderRadius:"var(--radius-xl)", padding:4 }}>
                      {[{ val:false, label:"Grayscale" }, { val:true, label:"Full Color" }].map(opt => (
                        <button key={opt.label} type="button" onClick={() => setOptions(o => ({ ...o, color: opt.val }))}
                          style={{ flex:1, padding:"9px", borderRadius:"var(--radius-lg)", border:"none", cursor:"pointer",
                            background: options.color === opt.val ? "var(--surface-container-highest)" : "transparent",
                            color: options.color === opt.val ? "var(--primary)" : "var(--on-surface-variant)",
                            fontWeight:700, fontSize:"0.8rem" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Orientation</label>
                    <select name="orientation" className="form-select" value={options.orientation} onChange={handleChange}>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                    <div style={{ position:"relative" }}>
                      <input id="duplex-check" name="duplex" type="checkbox" checked={options.duplex}
                        onChange={handleChange} style={{ position:"absolute", opacity:0, width:0, height:0 }} />
                      <div style={{ width:44, height:24, borderRadius:12,
                        background: options.duplex ? "var(--primary)" : "var(--surface-container-highest)",
                        position:"relative", transition:"background 0.2s", cursor:"pointer" }}>
                        <div style={{ position:"absolute", top:2, left: options.duplex ? 22 : 2,
                          width:20, height:20, borderRadius:"50%", background:"#fff",
                          transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--on-surface)" }}>Double-sided (Duplex)</div>
                      <div style={{ fontSize:"0.7rem", color:"var(--on-surface-variant)" }}>10% discount applied</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div style={{ position:"sticky", top:80 }}>
            <div style={{ background:"#1a1c2e", color:"#f0f0ff", borderRadius:"var(--radius-xl)",
              padding:32, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-40, right:-40, width:120, height:120,
                background:"rgba(0,104,121,0.2)", borderRadius:"50%", filter:"blur(40px)" }} />

              <h3 style={{ color:"#ffffff", marginBottom:28, position:"relative", fontSize:"1.2rem" }}>
                Order Summary
              </h3>

              <div style={{ position:"relative" }}>
                <div className="price-breakdown" style={{ borderColor:"rgba(255,255,255,0.08)" }}>
                  {[
                    ["Price per page", `₹${pricePerPage.toFixed(2)}`],
                    ["Pages × Copies", `${pages || 0} × ${options.copies}`],
                    ...(options.duplex ? [["Duplex discount", "-10%"]] : []),
                  ].map(([label, val]) => (
                    <div className="price-row" key={label}
                      style={{ color:"rgba(240,240,255,0.65)", borderBottomColor:"rgba(255,255,255,0.08)" }}>
                      <span>{label}</span>
                      <span style={{ color:"#ffffff", fontWeight:600 }}>{val}</span>
                    </div>
                  ))}

                  <div style={{ paddingTop:20, borderTop:"1px solid rgba(255,255,255,0.12)",
                    display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                    <div>
                      <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.08em", color:"#54d7f2", marginBottom:4 }}>
                        Total Est. Price
                      </div>
                      <div style={{ fontFamily:"var(--font-headline)", fontSize:"2.5rem", fontWeight:900,
                        color:"#fff", letterSpacing:"-0.03em" }}>
                        ₹{total.toFixed(2)}
                      </div>
                    </div>
                    <span className="material-symbols-outlined"
                      style={{ color:"#54d7f2", fontSize:32, opacity:0.5 }}>payments</span>
                  </div>
                </div>

                {/* analyzing indicator in summary panel */}
                {analyzing && (
                  <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:8,
                    background:"rgba(255,255,255,0.06)", borderRadius:"var(--radius-lg)", padding:"10px 14px" }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize:16, color:"#54d7f2", animation:"spin 1s linear infinite" }}>
                      autorenew
                    </span>
                    <span style={{ fontSize:"0.78rem", color:"rgba(240,240,255,0.75)" }}>
                      Detecting pages…
                    </span>
                  </div>
                )}

                {uploading && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6,
                      fontSize:"0.8rem", color:"rgba(255,255,255,0.7)" }}>
                      <span>Uploading…</span><span>{progress}%</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:999, overflow:"hidden", height:4 }}>
                      <div style={{ width:`${progress}%`, height:"100%",
                        background:"linear-gradient(90deg, var(--primary), #00adc8)",
                        transition:"width 0.2s", boxShadow:"0 0 8px rgba(0,173,200,0.6)" }} />
                    </div>
                  </div>
                )}

                <button type="submit" id="upload-submit-btn"
                  disabled={uploading || !file || analyzing || !pages}
                  style={{ width:"100%", padding:"16px",
                    background: (uploading || !file || analyzing || !pages)
                      ? "rgba(0,104,121,0.4)" : "#006879",
                    color:"#ffffff",
                    border:"none", borderRadius:"var(--radius-lg)", fontFamily:"var(--font-headline)",
                    fontWeight:900, fontSize:"1rem",
                    cursor: (uploading || !file || analyzing || !pages) ? "not-allowed" : "pointer",
                    opacity: (uploading || !file || analyzing || !pages) ? 0.6 : 1,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    gap:10, transition:"all 0.2s" }}>
                  {uploading
                    ? <><span className="spinner" /> Uploading {progress}%</>
                    : analyzing
                    ? <><span className="material-symbols-outlined"
                        style={{ fontSize:18, animation:"spin 1s linear infinite" }}>autorenew</span> Analyzing…</>
                    : <>Proceed to Payment <span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_forward</span></>}
                </button>

                <div style={{ marginTop:16, background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-lg)",
                  padding:"12px 14px", display:"flex", gap:8 }}>
                  <span className="material-symbols-outlined"
                    style={{ fontSize:16, color:"var(--primary-fixed-dim)", marginTop:1, flexShrink:0 }}>info</span>
                  <p style={{ fontSize:"0.7rem", color:"rgba(249,249,255,0.6)", lineHeight:1.5, margin:0 }}>
                    Pages are auto-detected. You can edit the count if needed before submitting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes pulse   { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
