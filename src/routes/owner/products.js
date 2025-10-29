const router = require("express").Router();
const ctrl = require("../../controllers/owner/products");

// CRUD
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

// أدوات سريعة
router.patch("/:id/toggle", ctrl.toggleActive);
router.patch("/:id/stock", ctrl.patchStock);

// قائمة + تفاصيل
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);

module.exports = router;
