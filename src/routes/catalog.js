const express = require("express");
const router = express.Router();
const controller = require("../controllers/catalog");

router.get("/categories", controller.listCategories);
router.get("/brands", controller.listBrands);
router.get("/products", controller.listProducts);
router.get("/products/:id", controller.getProductById);
router.post("/compare", controller.compareProducts);

module.exports = router;
