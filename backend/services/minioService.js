const Minio = require("minio");
require("dotenv").config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET = process.env.MINIO_BUCKET || "smartprint";

/**
 * Ensure bucket exists on startup
 */
const initBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, "us-east-1");
      console.log(`✅ MinIO bucket '${BUCKET}' created`);
    } else {
      console.log(`✅ MinIO bucket '${BUCKET}' ready`);
    }
  } catch (err) {
    console.error("❌ MinIO init error:", err.message);
  }
};

// Initialize bucket on module load
initBucket();

/**
 * Upload a file buffer to MinIO
 * @param {string} fileName - unique file name (key)
 * @param {Buffer} fileBuffer - file data
 * @param {string} mimeType - MIME type
 * @returns {string} - MinIO URL
 */
const uploadFileToMinio = async (fileName, fileBuffer, mimeType) => {
  await minioClient.putObject(BUCKET, fileName, fileBuffer, fileBuffer.length, {
    "Content-Type": mimeType,
  });
  const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${BUCKET}/${fileName}`;
  return url;
};

/**
 * Get a presigned URL for private file access (valid 1 hour)
 * @param {string} fileName
 * @returns {string} presigned URL
 */
const getPresignedUrl = async (fileName) => {
  try {
    return await minioClient.presignedGetObject(BUCKET, fileName, 3600);
  } catch (err) {
    console.error("Presigned URL error:", err.message);
    return null;
  }
};

/**
 * Delete a file from MinIO
 */
const deleteFile = async (fileName) => {
  try {
    await minioClient.removeObject(BUCKET, fileName);
  } catch (err) {
    console.error("MinIO delete error:", err.message);
  }
};

module.exports = { uploadFileToMinio, getPresignedUrl, deleteFile, minioClient };
