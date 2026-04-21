/**
 * SmartPrint — frontend utility helpers
 */

// ── Price ──────────────────────────────────────────────────────────────────

/**
 * Calculate print price on the client side (mirrors backend logic).
 * @param {{ pages, copies, color, duplex }} opts
 * @returns {{ pricePerPage, subtotal, discount, totalAmount }}
 */
export const calculatePrice = ({ pages = 0, copies = 1, color = false, duplex = false }) => {
  const pricePerPage = color ? 5 : 1;
  const subtotal = pricePerPage * pages * copies;
  const discount = duplex ? subtotal * 0.1 : 0;
  const totalAmount = Math.round((subtotal - discount) * 100) / 100;
  return { pricePerPage, subtotal, discount, totalAmount };
};

/**
 * Format a number as Indian Rupees
 * @param {number} amount
 * @returns {string}  e.g. "₹12.50"
 */
export const formatCurrency = (amount) =>
  `₹${Number(amount).toFixed(2)}`;

// ── Date / Time ────────────────────────────────────────────────────────────

/**
 * Relative time string (e.g., "3 minutes ago", "just now")
 * @param {string|Date} date
 */
export const timeAgo = (date) => {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Format a date to readable string
 * @param {string|Date} date
 */
export const formatDate = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── File ───────────────────────────────────────────────────────────────────

/**
 * Format bytes to human-readable size
 * @param {number} bytes
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get file extension emoji
 * @param {string} filename
 */
export const fileEmoji = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map = { pdf: "📄", doc: "📝", docx: "📝", txt: "📃", png: "🖼️", jpg: "🖼️", jpeg: "🖼️" };
  return map[ext] || "📎";
};

// ── String ─────────────────────────────────────────────────────────────────

/**
 * Capitalize first letter of each word
 * @param {string} str
 */
export const titleCase = (str = "") =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Get initials from a name (up to 2 letters)
 * @param {string} name
 */
export const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

// ── Queue / ETA ────────────────────────────────────────────────────────────

const PPM = 20; // pages per minute

/**
 * Estimate minutes to clear N pages
 * @param {number} pages
 */
export const estimateMinutes = (pages) => Math.ceil(pages / PPM);

/**
 * Convert minutes to "~X min" or "~X h Y min"
 * @param {number} minutes
 */
export const formatETA = (minutes) => {
  if (!minutes || minutes <= 0) return "< 1 min";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}h ${m > 0 ? `${m}m` : ""}`;
};

// ── Status ─────────────────────────────────────────────────────────────────

const STATUS_META = {
  uploaded:  { label: "Uploaded",  color: "#94a3b8", emoji: "📤" },
  paid:      { label: "Paid",      color: "#fbbf24", emoji: "💳" },
  queued:    { label: "Queued",    color: "#60a5fa", emoji: "⏳" },
  printing:  { label: "Printing",  color: "#a78bfa", emoji: "🖨️" },
  done:      { label: "Done",      color: "#34d399", emoji: "✅" },
  failed:    { label: "Failed",    color: "#f87171", emoji: "❌" },
  cancelled: { label: "Cancelled", color: "#64748b", emoji: "🚫" },
};

export const getStatusMeta = (status) =>
  STATUS_META[status] || { label: status, color: "#94a3b8", emoji: "❓" };
