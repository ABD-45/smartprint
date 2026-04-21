const { exec } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

const IS_WINDOWS = os.platform() === "win32";
const IS_MOCK = IS_WINDOWS || process.env.NODE_ENV === "development";

/**
 * Download a file from a URL to a temp path
 */
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(dest);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
};

/**
 * Send a file to the physical printer via CUPS (lp command on Linux/Mac)
 * On Windows dev: mocks the print action
 * @param {string} fileUrl - presigned MinIO URL
 * @param {Object} job - the Job document
 */
const printFile = async (fileUrl, job) => {
  if (IS_MOCK) {
    // Mock mode for Windows dev
    console.log(`🖨️  [MOCK PRINT] Job ${job._id}`);
    console.log(`   File: ${job.originalName}`);
    console.log(`   Pages: ${job.pages} | Copies: ${job.copies}`);
    console.log(`   Color: ${job.color} | Duplex: ${job.duplex}`);
    // Simulate 2 second print delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`✅ [MOCK PRINT] Job ${job._id} completed`);
    return { success: true, mock: true };
  }

  // --- Real CUPS printing (Linux/Mac) ---
  const tmpPath = path.join(os.tmpdir(), job.fileName);

  try {
    // Download file from MinIO presigned URL
    await downloadFile(fileUrl, tmpPath);

    // Build lp command options
    const opts = [];
    opts.push(`-n ${job.copies}`); // copies
    if (job.duplex) opts.push("-o sides=two-sided-long-edge");
    if (!job.color) opts.push("-o ColorModel=Gray");
    opts.push(`-o media=${job.paperSize}`);
    opts.push(`-o orientation-requested=${job.orientation === "landscape" ? 4 : 3}`);

    const command = `lp ${opts.join(" ")} "${tmpPath}"`;

    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        // Cleanup temp file
        fs.unlink(tmpPath, () => {});

        if (err) {
          console.error("Print error:", stderr);
          reject(new Error(stderr || "Print command failed"));
        } else {
          console.log(`✅ Print job sent: ${stdout}`);
          resolve({ success: true, output: stdout });
        }
      });
    });
  } catch (err) {
    // Cleanup on error
    if (fs.existsSync(tmpPath)) fs.unlink(tmpPath, () => {});
    throw err;
  }
};

module.exports = { printFile };
