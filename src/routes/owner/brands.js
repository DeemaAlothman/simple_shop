const router = require("express").Router();
const ctrl = require("../../controllers/owner/brands");

router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/", ctrl.list);

module.exports = router;
