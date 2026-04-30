const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const BUCKET = "smartprint-files";

/**
 * Ensure bucket exists on startup
 */
const initBucket = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log("ℹ️ Supabase bucket check - creating if needed");
    }

    const bucketExists = data?.find((b) => b.name === BUCKET);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET, {
        public: false,
      });

      if (createError && !createError.message.includes("already exists")) {
        console.error("❌ Supabase bucket creation error:", createError.message);
      } else {
        console.log(`✅ Supabase bucket '${BUCKET}' ready`);
      }
    } else {
      console.log(`✅ Supabase bucket '${BUCKET}' already exists`);
    }
  } catch (err) {
    console.error("❌ Supabase init error:", err.message);
  }
};

// Initialize bucket on module load
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  initBucket().catch((err) => {
    console.error("Failed to initialize Supabase bucket:", err.message);
  });
}

/**
 * Upload a file buffer to Supabase Storage
 * @param {string} fileName - unique file name (key)
 * @param {Buffer} fileBuffer - file data
 * @param {string} mimeType - MIME type
 * @returns {string} - public URL of uploaded file
 */
const uploadFileToSupabase = async (fileName, fileBuffer, mimeType) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("❌ Supabase upload error:", error.message);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    console.log(`✅ File uploaded to Supabase: ${fileName}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Supabase upload exception:", err.message);
    throw err;
  }
};

/**
 * Get a presigned/signed URL for file access
 * @param {string} fileName - file path
 * @param {number} expiresIn - expiration time in seconds (default: 3600 = 1 hour)
 * @returns {string} presigned URL or null
 */
const getPresignedUrl = async (fileName, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(fileName, expiresIn);

    if (error) {
      console.error("Presigned URL error:", error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error("Presigned URL exception:", err.message);
    return null;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} fileName - file path to delete
 * @returns {boolean} - success status
 */
const deleteFile = async (fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .remove([fileName]);

    if (error) {
      console.error("Supabase delete error:", error.message);
      return false;
    }

    console.log(`✅ File deleted from Supabase: ${fileName}`);
    return true;
  } catch (err) {
    console.error("Supabase delete exception:", err.message);
    return false;
  }
};

/**
 * Download file from Supabase (get file buffer)
 * @param {string} fileName - file path
 * @returns {Buffer} file data or null
 */
const downloadFile = async (fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(fileName);

    if (error) {
      console.error("Supabase download error:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Supabase download exception:", err.message);
    return null;
  }
};

/**
 * List all files in bucket
 * @returns {array} - list of file objects
 */
const listFiles = async () => {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).list();

    if (error) {
      console.error("Supabase list error:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Supabase list exception:", err.message);
    return [];
  }
};

module.exports = {
  uploadFileToSupabase,
  uploadFileToMinio: uploadFileToSupabase, // Alias for backward compatibility
  getPresignedUrl,
  deleteFile,
  downloadFile,
  listFiles,
  supabase,
};
