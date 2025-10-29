// src/controllers/owner/brands.js
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

async function create(req, res) {
  try {
    const { name, isActive = true } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "name is required" });
    }

    const brand = await prisma.brand.create({
      data: { name, isActive: Boolean(isActive) },
    });

    return res.status(201).json({ brand: toJSON(brand) });
  } catch (err) {
    // 🟡 تعامل خاص مع تكرار الاسم
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Brand name already exists",
        field: "name",
      });
    }
    console.error("brands.create error:", err);
    return res
      .status(400)
      .json({ message: "Cannot create brand", error: err.message });
  }
}

async function update(req, res) {
  try {
    const id = BigInt(req.params.id);
    const { name, isActive } = req.body || {};
    const data = {};
    if (typeof name === "string") data.name = name;
    if (typeof isActive === "boolean") data.isActive = isActive;

    const brand = await prisma.brand.update({ where: { id }, data });
    return res.json({ brand: toJSON(brand) });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Brand name already exists",
        field: "name",
      });
    }
    console.error("brands.update error:", err);
    return res
      .status(400)
      .json({ message: "Cannot update brand", error: err.message });
  }
}

async function remove(req, res) {
  try {
    const id = BigInt(req.params.id);
    await prisma.brand.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("brands.remove error:", err);
    return res
      .status(400)
      .json({ message: "Cannot delete brand", error: err.message });
  }
}

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
      prisma.brand.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.brand.count({ where }),
    ]);

    return res.json({ items: toJSON(items), total, page, limit });
  } catch (err) {
    console.error("brands.list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { create, update, remove, list };
