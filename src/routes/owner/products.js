const router = require("express").Router();
const ctrl = require("../../controllers/owner/products");

// إنشاء منتج جديد
router.post("/", ctrl.create);

// تعديل منتج موجود
router.patch("/:id", ctrl.update);

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
