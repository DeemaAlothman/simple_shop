const express = require("express");
const router = express.Router();

const controller = require("../controllers/orders/customer");
const {
  verifyAccessToken,
  checkRole,
} = require("../controllers/middleware/auth");

router.post(
  "/",
  verifyAccessToken,
  checkRole("CUSTOMER"),
  controller.createOrder
);
router.get(
  "/me",
  verifyAccessToken,
  checkRole("CUSTOMER"),
  controller.listMyOrders
);
router.get(
  "/me/:id",
  verifyAccessToken,
  checkRole("CUSTOMER"),
  controller.getMyOrderById
);

module.exports = router;
