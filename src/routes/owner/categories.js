const router = require("express").Router();
const ctrl = require("../../controllers/owner/categories");

// إنشاء
router.post("/", ctrl.create);

// تحديث
router.patch("/:id", ctrl.update);

// حذف
router.delete("/:id", ctrl.remove);

// قائمة
router.get("/", ctrl.list);

module.exports = router;
