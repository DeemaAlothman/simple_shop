const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ctrl = require("../../controllers/owner/products");

// تأكد من وجود مجلد الرفع
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// إعداد التخزين للأسماء والمسار
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

// فلترة أنواع الملفات (صور فقط)
function fileFilter(_req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(
    file.mimetype
  );
  cb(ok ? null : new Error("Only image files are allowed"), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// إنشاء منتج جديد (يدعم رفع صورة بمفتاح image)
router.post("/", upload.single("image"), ctrl.create);

// تعديل منتج موجود (يدعم رفع صورة بمفتاح image)
router.patch("/:id", upload.single("image"), ctrl.update);

// حذف منتج
router.delete("/:id", ctrl.remove);

// تشغيل/إيقاف منتج (isActive)
router.patch("/:id/toggle", ctrl.toggleActive);

// تعديل المخزون (inc / dec / set)
router.patch("/:id/stock", ctrl.patchStock);

// قراءة قائمة المنتجات مع فلاتر وفرز
router.get("/", ctrl.list);

// قراءة منتج مفرد بالتفاصيل
router.get("/:id", ctrl.getById);

module.exports = router;
