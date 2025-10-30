const express = require("express");
const router = express.Router();
const {
  listPublic,
  getPriceWithOffers,
} = require("../../controllers/catalog/offers");

// عروض فعّالة (Public)
router.get("/offers", listPublic);

// سعر المنتج مع العروض (Public)
router.get("/price", getPriceWithOffers);

module.exports = router;
