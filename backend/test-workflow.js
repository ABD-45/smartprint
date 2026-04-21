#!/usr/bin/env node
/**
 * Complete workflow test for SmartPrint
 */
const axios = require("axios");

const API = "http://localhost:5000/api";
let studentToken, printshopToken, uploadedJobId;

const log = (msg, level = "INFO") => {
  const colors = { INFO: "\x1b[36m", SUCCESS: "\x1b[32m", ERROR: "\x1b[31m", WARN: "\x1b[33m" };
  console.log(`${colors[level] || ""}[${level}] ${msg}\x1b[0m`);
};

const testRegisterStudent = async () => {
  log("STEP 1: Registering student...");
  try {
    const res = await axios.post(`${API}/auth/register`, {
      name: "Test Student",
      email: `student-${Date.now()}@test.com`,
      password: "TestPass123",
      phone: "9876543210",
      role: "student",
      collegeId: "CS001",
    });
    studentToken = res.data.token;
    log(`✓ Student registered: ${res.data.user.email}`, "SUCCESS");
  } catch (err) {
    log(`✗ Registration failed: ${err.response?.data?.message || err.message}`, "ERROR");
    process.exit(1);
  }
};

const testUploadJob = async () => {
  log("STEP 2: Uploading print job...");
  try {
    const formData = new FormData();
    formData.append("file", new (require("fs")).ReadFileSync(__dirname + "/package.json"), "package.json");
    formData.append("pages", "5");
    formData.append("copies", "2");
    formData.append("color", "true");
    formData.append("duplex", "false");
    formData.append("paperSize", "A4");
    formData.append("orientation", "portrait");

    const res = await axios.post(`${API}/jobs/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${studentToken}`,
      },
    });
    uploadedJobId = res.data.job.id;
    log(`✓ Job uploaded: ${uploadedJobId}`, "SUCCESS");
    log(`  - Pages: ${res.data.job.pages} × ${res.data.job.copies} copies`, "INFO");
    log(`  - Color: ${res.data.job.color ? "Yes" : "No"}, Duplex: ${res.data.job.duplex ? "Yes" : "No"}`, "INFO");
  } catch (err) {
    log(`✗ Upload failed: ${err.response?.data?.message || err.message}`, "ERROR");
    if (err.response?.data) log(JSON.stringify(err.response.data, null, 2), "ERROR");
    process.exit(1);
  }
};

const testPrintShopGetJobs = async () => {
  log("STEP 3: PrintShop fetching uploaded jobs...");
  try {
    const res = await axios.get(`${API}/admin/jobs?status=uploaded`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    log(`✓ Jobs fetched: ${res.data.jobs.length} total`, "SUCCESS");
    if (res.data.jobs.length > 0) {
      const job = res.data.jobs[0];
      log(`  - File: ${job.originalName}`, "INFO");
      log(`  - Pages: ${job.pages} × ${job.copies}`, "INFO");
      log(`  - Color: ${job.color}, Duplex: ${job.duplex}`, "INFO");
      log(`  - Paper: ${job.paperSize} (${job.orientation})`, "INFO");
    }
  } catch (err) {
    log(`✗ Fetch jobs failed: ${err.response?.data?.message || err.message}`, "ERROR");
  }
};

const testRegisterPrintShop = async () => {
  log("STEP 4: Registering printshop user...");
  try {
    const res = await axios.post(`${API}/auth/register`, {
      name: "Test PrintShop",
      email: `printshop-${Date.now()}@test.com`,
      password: "PrintPass123",
      phone: "9999999999",
      role: "printshop",
    });
    printshopToken = res.data.token;
    log(`✓ PrintShop registered: ${res.data.user.email}`, "SUCCESS");
  } catch (err) {
    log(`✗ PrintShop registration failed: ${err.response?.data?.message || err.message}`, "ERROR");
  }
};

const testMarkPrinting = async () => {
  log("STEP 5: Marking job as printing...");
  try {
    // First mark as queued (simulating payment)
    await axios.patch(`${API}/admin/jobs/${uploadedJobId}/status`, 
      { action: "queued" },
      { headers: { Authorization: `Bearer ${printshopToken}` } }
    ).catch(() => {}); // May fail but that's ok

    const res = await axios.patch(
      `${API}/admin/jobs/${uploadedJobId}/status`,
      { action: "start-printing" },
      { headers: { Authorization: `Bearer ${printshopToken}` } }
    );
    log(`✓ Job marked as printing`, "SUCCESS");
  } catch (err) {
    log(`✗ Mark printing failed: ${err.response?.data?.message || err.message}`, "WARN");
  }
};

const testMarkDone = async () => {
  log("STEP 6: Marking job as done (generates OTP)...");
  try {
    const res = await axios.patch(
      `${API}/admin/jobs/${uploadedJobId}/status`,
      { action: "mark-done" },
      { headers: { Authorization: `Bearer ${printshopToken}` } }
    );
    log(`✓ Job marked as done`, "SUCCESS");
    if (res.data.job.otp) {
      log(`  - OTP Generated: ${res.data.job.otp}`, "SUCCESS");
    } else {
      log(`  - WARNING: OTP not in response`, "WARN");
    }
  } catch (err) {
    log(`✗ Mark done failed: ${err.response?.data?.message || err.message}`, "ERROR");
  }
};

const testGetOTPStudent = async () => {
  log("STEP 7: Student fetching OTP for pickup...");
  try {
    const res = await axios.get(`${API}/jobs/${uploadedJobId}/otp`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    log(`✓ OTP retrieved: ${res.data.otp}`, "SUCCESS");
  } catch (err) {
    log(`✗ Get OTP failed: ${err.response?.data?.message || err.message}`, "ERROR");
  }
};

const run = async () => {
  log("=== SmartPrint Workflow Test ===\n");
  await testRegisterStudent();
  await testUploadJob();
  await testPrintShopGetJobs();
  await testRegisterPrintShop();
  await testMarkPrinting();
  await testMarkDone();
  await testGetOTPStudent();
  log("\n=== Test Complete ===", "SUCCESS");
};

run().catch((err) => {
  log(`Fatal error: ${err.message}`, "ERROR");
  process.exit(1);
});
