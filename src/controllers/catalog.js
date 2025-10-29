const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

// GET /catalog/categories
async function listCategories(_req, res) {
  try {
    const items = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    return res.json({ items: toJSON(items), total: items.length });
  } catch (err) {
    console.error("catalog.listCategories error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /catalog/brands
async function listBrands(_req, res) {
  try {
    const items = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return res.json({ items: toJSON(items), total: items.length });
  } catch (err) {
    console.error("catalog.listBrands error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /catalog/products?search=&categoryId=&brandId=&page=&limit=&sort=
async function listProducts(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const search = (req.query.search || "").trim();
    const categoryId = req.query.categoryId
      ? BigInt(req.query.categoryId)
      : null;
    const brandId = req.query.brandId ? BigInt(req.query.brandId) : null;
    const sort = (req.query.sort || "-id").trim(); // افتراضي: الأحدث (id desc)

    const where = { isActive: true };
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;

    const allowedSortFields = new Set([
      "id",
      "name",
      "sku",
      "priceCents",
      "stockQty",
    ]);
    let orderBy = { id: "desc" };
    if (sort) {
      const dir = sort.startsWith("-") ? "desc" : "asc";
      const field = sort.replace(/^-/, "");
      if (allowedSortFields.has(field)) orderBy = { [field]: dir };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({ items: toJSON(items), total, page, limit });
  } catch (err) {
    console.error("catalog.listProducts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /catalog/products/:id
async function getProductById(req, res) {
  try {
    const id = BigInt(req.params.id);
    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ product: toJSON(product) });
  } catch (err) {
    console.error("catalog.getProductById error:", err);
    return res
      .status(400)
      .json({ message: "Cannot get product", error: err.message });
  }
}

// POST /catalog/compare   { productIds: ["12","13"] }
async function compareProducts(req, res) {
  try {
    const { productIds } = req.body || {};
    if (!Array.isArray(productIds) || productIds.length < 2) {
      return res
        .status(400)
        .json({ message: "Provide at least two productIds" });
    }
    const ids = productIds.map((x) => BigInt(x));
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      orderBy: { id: "asc" },
    });
    if (products.length < 2) {
      return res
        .status(404)
        .json({ message: "Not enough products found for comparison" });
    }

    // توحيد مفاتيح features
    const keySet = new Set();
    for (const p of products) {
      const fx = p.features || {};
      Object.keys(fx).forEach((k) => keySet.add(k));
    }
    const keys = Array.from(keySet);

    const matrix = keys.map((key) => ({
      key,
      values: products.map((p) => (p.features ? p.features[key] ?? "-" : "-")),
    }));

    return res.json({
      products: toJSON(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          features: p.features || {},
        }))
      ),
      matrix,
    });
  } catch (err) {
    console.error("catalog.compareProducts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  listCategories,
  listBrands,
  listProducts,
  getProductById,
  compareProducts,
};
