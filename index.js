const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const User = require("./module/userSchema");
const Reel = require("./module/reelsSchema");

const app = express();
const PORT = process.env.PORT || 3033;

// === ENV Secrets ===
const DB = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// === Connect to MongoDB ===
mongoose
  .connect(DB)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// === Middlewares ===
app.use(cors({
  origin: ["http://localhost:5173", "https://kaif-insta09.netlify.app"], // ✅ no trailing slash
  credentials: true, // ✅ required for cookies
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "None", // ✅ required for cross-origin cookies
});

// === Create /uploads folder if not exist ===
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// === Serve uploaded files ===
app.use("/uploads", express.static(uploadDir));

// === Multer Setup ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// === Auth Middleware ===
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// === Ping Route ===
app.get("/api/ping", (req, res) => res.send("✅ API working"));

// === Signup Route ===
app.post("/api/signup", upload.single("img"), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      img: req.file?.filename || "",
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true, sameSite: "Lax" }).json({
      message: "Signup successful",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === Login Route ===
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true, sameSite: "Lax" }).json({
      message: "Login successful",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === Profile Route (Protected) ===
app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === Logout Route ===
app.get("/api/logout", (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logged out successfully" });
});

// === Create Reel ===
app.post("/api/reels", async (req, res) => {
  try {
    const { file, des } = req.body;

    if (!file || !des) {
      return res.status(400).json({ message: "File and description required" });
    }

    const newReel = await Reel.create({ file, des });
    res.status(201).json({ message: "Reel created", reel: newReel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === Get All Reels ===
app.get("/api/reels", async (req, res) => {
  try {
    const reels = await Reel.find().sort({ createdAt: -1 });
    res.json(reels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
