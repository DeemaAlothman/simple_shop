const express = require("express");
const router = express.Router();

const { signup, login, refresh, logout } = require("../controllers/auth");
const { verifyRefreshToken } = require("../controllers/middleware/auth");

// افتحي signup بدون توكن
router.post("/signup", signup);

// باقي المسارات
router.post("/login", login);
router.post("/refresh", verifyRefreshToken, refresh);
router.post("/logout", verifyRefreshToken, logout);

module.exports = router;
