/**
 * Calculate print job pricing
 * @param {Object} options - { pages, copies, color, duplex }
 * @returns {Object} { pricePerPage, totalAmount }
 */
const calculatePrice = ({ pages, copies = 1, color = false, duplex = false }) => {
  let pricePerPage = color ? 5.0 : 1.0; // INR
  if (duplex) pricePerPage *= 0.9; // 10% discount for duplex
  const totalAmount = pricePerPage * pages * copies;
  return { pricePerPage, totalAmount: Math.round(totalAmount * 100) / 100 };
};

/**
 * Generate a secure 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Format bytes to human-readable string
 */
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Estimate printing time in minutes
 * @param {number} pages - total pages to print (pages * copies)
 * @param {number} pagesAhead - total pages of jobs ahead in queue
 */
const estimatePrintTime = (pages, pagesAhead = 0) => {
  const PPM = 20; // pages per minute (typical laser printer)
  return Math.ceil((pagesAhead + pages) / PPM);
};

/**
 * Paginate mongoose query results
 */
const paginate = async (model, query, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
    model.countDocuments(query),
  ]);
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  };
};

module.exports = { calculatePrice, generateOTP, formatFileSize, estimatePrintTime, paginate };
