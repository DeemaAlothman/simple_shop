const router = require("express").Router();
const {
  verifyAccessToken,
  checkRole,
} = require("../../controllers/middleware/auth");

// حماية جميع مسارات /owner
router.use(verifyAccessToken, checkRole("OWNER"));

// /owner/me
router.get("/me", require("../../controllers/owner/me"));

// /owner/categories
router.use("/categories", require("./categories"));


router.use("/brands", require("./brands"));
router.use("/products", require("./products"));

// router.use("/offers", require("./offers"));
// router.use("/orders", require("./orders"));
// router.use("/customers", require("./customers"));
// router.use("/dashboard", require("./dashboard"));

module.exports = router;
