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

// === Setup Express ===
const app = express();
const PORT = 3033;

// === MongoDB & JWT secrets from .env ===
const DB = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// === Connect to MongoDB ===
mongoose
  .connect(DB)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// === User Schema ===

// === Middleware ===
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// === Serve uploaded images ===
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// === Ensure /uploads folder exists ===
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// === Configure Multer ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
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

// === Signup Route with Image Upload ===
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
      img: req.file.filename, // Image filename saved in DB
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true }).json({
      message: "Signup successful",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//reel========start--------------

app.post("/Reels", async (req, res) => {
  try {
    const { file, des } = req.body;

    // Create a new Reel document
    const newReel = await Reel.create({ file, des });

    // Respond with the created reel
    res
      .status(201)
      .json({ message: "Reel created successfully", file: newReel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//reel========end--------------

// Get all Reels

app.get("/Reels", async (req, res) => {
  try {
    const reels = await Reel.find().sort({ createdAt: -1 });
    res.json(reels);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// === Login Route ===
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res.cookie("token", token, { httpOnly: true }).json({
    message: "Login successful",
    user,
  });
});

// === Profile Route ===
app.get("/api/profile", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

// === Logout Route ===
app.get("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
});

// === Start Server ===
app.listen(PORT, () =>
  console.log(`🚀 API running at http://localhost:${PORT}`)
);
