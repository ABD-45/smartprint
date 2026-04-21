const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateOTP } = require("../utils/helpers");
const { sendVerificationOTP } = require("../services/whatsappService");

// Temporary store for verification OTPs (Use Redis in production)
const verificationStore = new Map();

/**
 * Generate a signed JWT token for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

/**
 * POST /api/auth/request-otp
 * Send an OTP to the user's phone via WhatsApp
 */
const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required." });

    // Check if phone already registered
    const existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ success: false, message: "Phone number already registered." });

    const otp = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 mins

    verificationStore.set(phone, { otp, expires });

    await sendVerificationOTP(phone, otp);

    res.json({ success: true, message: "OTP sent to WhatsApp" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const stored = verificationStore.get(phone);

    if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // Mark as verified in the store
    verificationStore.set(phone, { ...stored, verified: true });

    res.json({ success: true, message: "Phone verified successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    console.log("🔍 Register request received:", req.body);
    const { name, email, phone, password, role, collegeId } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: "Name, email, phone, and password are required." });
    }

    // Check if phone was verified
    const stored = verificationStore.get(phone);
    if (!stored || !stored.verified) {
      return res.status(400).json({ success: false, message: "Please verify your phone number first." });
    }

    // Allow all roles for self-registration (admin can restrict later)
    const allowedRoles = ["student", "staff", "admin", "printshop"];
    const userRole = allowedRoles.includes(role) ? role : "student";

    console.log("✓ Checking if email already exists:", email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    console.log("✓ Creating new user...");
    const user = await User.create({
      name, email, phone, password, role: userRole, collegeId,
    });

    console.log("✓ User created, generating token...");
    const token = generateToken(user);

    // Cleanup verification store
    verificationStore.delete(phone);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }
    res.status(500).json({ success: false, message: err.message || "Registration failed" });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, collegeId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, collegeId },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, updateProfile, requestOTP, verifyOTP };
