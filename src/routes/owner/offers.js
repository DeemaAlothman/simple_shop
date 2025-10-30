const express = require("express");
const router = express.Router();

const {
  verifyAccessToken,
  checkRole,
} = require("../../controllers/middleware/auth");
const ctl = require("../../controllers/owner/offers");

// حماية جميع المسارات للمالك فقط
router.use(verifyAccessToken, checkRole("OWNER"));

router.get("/offers", ctl.list);
router.get("/offers/:id", ctl.getById);
router.post("/offers", ctl.create);
router.patch("/offers/:id", ctl.update);
router.delete("/offers/:id", ctl.remove);

module.exports = router;
