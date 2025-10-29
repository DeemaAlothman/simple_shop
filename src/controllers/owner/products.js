const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

/**
 * POST /owner/products
 * body:
 *  required: name, sku, (categoryId OR categoryName)
 *  optional: priceCents, stockQty, isActive, brandId OR brandName, features (Json)
 */
async function create(req, res) {
  try {
    const {
      name,
      sku,
      priceCents = 0,
      stockQty = 0,
      isActive = true,

      categoryId,
      categoryName,

      brandId = null,
      brandName = null,

      features = null,
    } = req.body || {};

    if (!name || !sku) {
      return res.status(400).json({ message: "name, sku are required" });
    }
    if (!categoryId && !categoryName) {
      return res
        .status(400)
        .json({ message: "Either categoryId or categoryName is required" });
    }

    // ===== Category relation =====
    let categoryRel;
    if (categoryName) {
      // لأن @@unique([name,parentId]) لا تقبل null في connectOrCreate
      // نحلّها يدويًا: findFirst ثم create إن لم توجد
      const existingCat = await prisma.category.findFirst({
        where: { name: categoryName, parentId: null },
        select: { id: true },
      });
      if (existingCat) {
        categoryRel = { connect: { id: existingCat.id } };
      } else {
        const createdCat = await prisma.category.create({
          data: { name: categoryName, isActive: true, parentId: null },
          select: { id: true },
        });
        categoryRel = { connect: { id: createdCat.id } };
      }
    } else {
      const catId = BigInt(categoryId);
      const cat = await prisma.category.findUnique({
        where: { id: catId },
        select: { id: true },
      });
      if (!cat) {
        return res
          .status(400)
          .json({ message: "Category not found", field: "categoryId" });
      }
      categoryRel = { connect: { id: catId } };
    }

    // ===== Brand relation =====
    let brandRel;
    if (brandName) {
      // brand.name عندك @unique، فيك تستخدم connectOrCreate بأمان
      brandRel = {
        connectOrCreate: {
          where: { name: brandName },
          create: { name: brandName, isActive: true },
        },
      };
    } else if (brandId) {
      const brId = BigInt(brandId);
      const br = await prisma.brand.findUnique({
        where: { id: brId },
        select: { id: true },
      });
      if (!br) {
        return res
          .status(400)
          .json({ message: "Brand not found", field: "brandId" });
      }
      brandRel = { connect: { id: brId } };
    }

    const data = {
      name,
      sku,
      priceCents: Number(priceCents) || 0,
      stockQty: Number(stockQty) || 0,
      isActive: Boolean(isActive),
      category: categoryRel,
      ...(brandRel ? { brand: brandRel } : {}),
      ...(features && typeof features === "object" ? { features } : {}),
    };

    const product = await prisma.product.create({ data });
    return res.status(201).json({ product: toJSON(product) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return res
          .status(409)
          .json({ message: "SKU already exists", field: "sku" });
      }
      if (err.code === "P2025") {
        return res.status(400).json({ message: "Related record not found" });
      }
    }
    console.error("products.create error:", err);
    return res
      .status(400)
      .json({ message: "Cannot create product", error: err.message });
  }
}

/**
 * PATCH /owner/products/:id
 * يقبل:
 *  name, sku, priceCents, stockQty, isActive
 *  categoryId OR categoryName
 *  brandId OR brandName (أو null لفصل البراند)
 *  features (Json)
 */
async function update(req, res) {
  try {
    const id = BigInt(req.params.id);
    const {
      name,
      sku,
      priceCents,
      stockQty,
      isActive,

      categoryId,
      categoryName,

      brandId,
      brandName,
      features,
    } = req.body || {};

    const data = {};
    if (typeof name === "string") data.name = name;
    if (typeof sku === "string") data.sku = sku;
    if (priceCents !== undefined) data.priceCents = Number(priceCents) || 0;
    if (stockQty !== undefined) data.stockQty = Number(stockQty) || 0;
    if (typeof isActive === "boolean") data.isActive = isActive;

    // Category update (بالاسم أو بالـ id) — لنفس سبب null في المركّب، نحلّها يدويًا عند الاسم
    if (categoryName) {
      const existingCat = await prisma.category.findFirst({
        where: { name: categoryName, parentId: null },
        select: { id: true },
      });
      if (existingCat) {
        data.category = { connect: { id: existingCat.id } };
      } else {
        const createdCat = await prisma.category.create({
          data: { name: categoryName, isActive: true, parentId: null },
          select: { id: true },
        });
        data.category = { connect: { id: createdCat.id } };
      }
    } else if (categoryId !== undefined) {
      data.category = { connect: { id: BigInt(categoryId) } };
    }

    // Brand update (اسم/ID/فصل)
    if (brandName) {
      data.brand = {
        connectOrCreate: {
          where: { name: brandName },
          create: { name: brandName, isActive: true },
        },
      };
    } else if (brandId === null) {
      data.brand = { disconnect: true };
    } else if (brandId !== undefined) {
      data.brand = { connect: { id: BigInt(brandId) } };
    }

    if (features !== undefined) {
      if (features && typeof features === "object") data.features = features;
      else if (features === null) data.features = null;
    }

    const product = await prisma.product.update({ where: { id }, data });
    return res.json({ product: toJSON(product) });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "SKU already exists", field: "sku" });
    }
    console.error("products.update error:", err);
    return res
      .status(400)
      .json({ message: "Cannot update product", error: err.message });
  }
}

// DELETE /owner/products/:id
async function remove(req, res) {
  try {
    const id = BigInt(req.params.id);
    await prisma.product.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("products.remove error:", err);
    return res
      .status(400)
      .json({ message: "Cannot delete product", error: err.message });
  }
}

// PATCH /owner/products/:id/toggle
async function toggleActive(req, res) {
  try {
    const id = BigInt(req.params.id);
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive boolean is required" });
    }
    const product = await prisma.product.update({
      where: { id },
      data: { isActive },
    });
    return res.json({ product: toJSON(product) });
  } catch (err) {
    console.error("products.toggleActive error:", err);
    return res
      .status(400)
      .json({ message: "Cannot toggle product", error: err.message });
  }
}

// PATCH /owner/products/:id/stock
async function patchStock(req, res) {
  try {
    const id = BigInt(req.params.id);
    const { op, qty } = req.body || {};
    const amount = Number(qty) || 0;

    if (!op || !["inc", "dec", "set"].includes(op)) {
      return res.status(400).json({ message: "op must be inc|dec|set" });
    }

    if (op === "set") {
      const product = await prisma.product.update({
        where: { id },
        data: { stockQty: Math.max(0, amount) },
      });
      return res.json({ product: toJSON(product) });
    }

    const current = await prisma.product.findUnique({
      where: { id },
      select: { stockQty: true },
    });
    if (!current) return res.status(404).json({ message: "Product not found" });

    const next =
      op === "inc" ? current.stockQty + amount : current.stockQty - amount;
    const product = await prisma.product.update({
      where: { id },
      data: { stockQty: Math.max(0, next) },
    });
    return res.json({ product: toJSON(product) });
  } catch (err) {
    console.error("products.patchStock error:", err);
    return res
      .status(400)
      .json({ message: "Cannot update stock", error: err.message });
  }
}

// GET /owner/products?search=&categoryId=&brandId=&active=&page=&limit=&sort=
async function list(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const search = (req.query.search || "").trim();
    const categoryId = req.query.categoryId ? BigInt(req.query.categoryId) : null;
    const brandId = req.query.brandId ? BigInt(req.query.brandId) : null;
    const active = req.query.active;
    const sort = (req.query.sort || "-id").trim(); // <-- الافتراضي صار -id

    const where = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;

    // اسمح فقط بالحقول الموجودة فعلًا
    const allowedSortFields = new Set([
      "id", "name", "sku", "priceCents", "stockQty", "isActive", "categoryId", "brandId"
      // لو أضفت لاحقًا createdAt إلى Product، فيك تضيفه هون
    ]);

    let orderBy = { id: "desc" }; // fallback
    if (sort) {
      const dir = sort.startsWith("-") ? "desc" : "asc";
      const field = sort.replace(/^-/, "");
      if (allowedSortFields.has(field)) {
        orderBy = { [field]: dir };
      }
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
    console.error("products.list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


// GET /owner/products/:id
async function getById(req, res) {
  try {
    const id = BigInt(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ product: toJSON(product) });
  } catch (err) {
    console.error("products.getById error:", err);
    return res
      .status(400)
      .json({ message: "Cannot get product", error: err.message });
  }
}

module.exports = {
  create,
  update,
  remove,
  toggleActive,
  patchStock,
  list,
  getById,
};
