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

  // === ENV ===
  const PORT = process.env.PORT || 3033;
  const DB = process.env.MONGO_URI;
  const JWT_SECRET = process.env.JWT_SECRET;


  // === Connect to MongoDB ===
  mongoose
    .connect(DB)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

  // === CORS Configuration ===
  app.use(
    cors({
      origin: "https://kaif-insta09.netlify.app",
      credentials: true,
    })
  );

  // === Body Parsers ===
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // === Multer Upload Setup ===
  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });
  const upload = multer({ storage });

  // === Serve uploads ===
  app.use("/uploads", express.static(uploadDir));

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
  app.get("/api/ping", (req, res) => res.send("✅ API is working!"));

  // === Signup ===
  app.post("/api/signup", upload.single("img"), async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "User already exists" });

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        password: hashed,
        img: req.file?.filename || "",
      });

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
        })
        .json({ message: "Signup successful", user });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Login ===
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "User not found" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: "Invalid password" });

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
        })
        .json({ message: "Login successful", user });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Get Profile ===
  app.get("/api/profile", authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Logout ===
  app.get("/api/logout", (req, res) => {
    res
      .clearCookie("token", {
        sameSite: "None",
        secure: true,
      })
      .json({ message: "Logged out" });
  });

  // === Post Reels ===
// === Post Reels ===
app.post("/api/reels", upload.single("file"), async (req, res) => {
  try {
    const { des } = req.body;
    if (!req.file || !des) {
      return res.status(400).json({ message: "Missing file or description" });
    }

    const reel = await Reel.create({
      file: req.file.filename,
      des,
    });

    res.status(201).json({ message: "Reel posted", reel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

  // === Get Reels ===
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
