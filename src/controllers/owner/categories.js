const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

// POST /owner/categories
async function create(req, res) {
  try {
    const { name, parentId = null, isActive = true } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "name is required" });
    }

    const parent = parentId ? { connect: { id: BigInt(parentId) } } : undefined;

    const cat = await prisma.category.create({
      data: { name, isActive: Boolean(isActive), parent: parent },
    });

    return res.status(201).json({ category: toJSON(cat) });
  } catch (err) {
    console.error("categories.create error:", err);
    // احتمال unique([name,parentId])
    return res
      .status(400)
      .json({ message: "Cannot create category", error: err.message });
  }
}

// PATCH /owner/categories/:id
async function update(req, res) {
  try {
    const id = BigInt(req.params.id);
    const { name, isActive, parentId } = req.body || {};

    const data = {};
    if (typeof name === "string") data.name = name;
    if (typeof isActive === "boolean") data.isActive = isActive;

    if (parentId === null) data.parentId = null;
    else if (parentId !== undefined) data.parentId = BigInt(parentId);

    const cat = await prisma.category.update({
      where: { id },
      data,
    });

    return res.json({ category: toJSON(cat) });
  } catch (err) {
    console.error("categories.update error:", err);
    return res
      .status(400)
      .json({ message: "Cannot update category", error: err.message });
  }
}

// DELETE /owner/categories/:id
async function remove(req, res) {
  try {
    const id = BigInt(req.params.id);

    // مبدئيًا: لو فيها أبناء/منتجات قد يفشل الحذف (FK). ممكن لاحقًا check & soft-delete.
    await prisma.category.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("categories.remove error:", err);
    return res
      .status(400)
      .json({ message: "Cannot delete category", error: err.message });
  }
}

// GET /owner/categories?search=&page=1&limit=50
async function list(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50", 10), 1),
      100
    );
    const search = (req.query.search || "").trim();

    const where = search
      ? { name: { contains: search, mode: "insensitive" } }
      : {};

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return res.json({
      items: toJSON(items),
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("categories.list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { create, update, remove, list };
