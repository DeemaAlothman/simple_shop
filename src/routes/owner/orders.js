const express = require("express");
const router = express.Router();

const controller = require("../../controllers/owner/orders");
const {
  verifyAccessToken,
  checkRole,
} = require("../../controllers/middleware/auth");

router.get("/", verifyAccessToken, checkRole("OWNER"), controller.list);
router.get("/:id", verifyAccessToken, checkRole("OWNER"), controller.getById);
router.patch(
  "/:id/status",
  verifyAccessToken,
  checkRole("OWNER"),
  controller.updateStatus
);

module.exports = router;
