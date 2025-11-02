// routes/owner/uploads.js
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  verifyAccessToken,
  checkRole,
} = require("../../controllers/middleware/auth");

// تأكد إنشاء مجلد uploads على مسار المشروع الجذري
const UPLOAD_DIR = path.join(__dirname, "..", "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext.toLowerCase());
  },
});

function fileFilter(_req, file, cb) {
  const ok = /image\/(jpeg|png|webp|gif)/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only images (jpg/png/webp/gif) are allowed"));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /owner/uploads  (multipart/form-data with key: file)
router.post(
  "/",
  verifyAccessToken,
  checkRole("OWNER"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "file is required" });
    }
    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    return res
      .status(201)
      .json({ url: publicUrl, filename: req.file.filename });
  }
);

// Error handler خاص بمولتر
router.use((err, _req, res, _next) => {
  if (err) {
    return res.status(400).json({ message: err.message || "Upload error" });
  }
  res.status(500).json({ message: "Unknown error" });
});

module.exports = router;
