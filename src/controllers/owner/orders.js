const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

const ALLOWED_STATUS = new Set([
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

// GET /owner/orders?status=&page=&limit=&sort=
async function list(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const status = (req.query.status || "").trim().toUpperCase();
    const sort = (req.query.sort || "-id").trim();

    const where = {};
    if (status && ALLOWED_STATUS.has(status)) where.status = status;

    const allowedSortFields = new Set([
      "id",
      "totalCents",
      "status",
      "createdAt",
    ]);
    let orderBy = { id: "desc" };
    if (sort) {
      const dir = sort.startsWith("-") ? "desc" : "asc";
      const field = sort.replace(/^-/, "");
      if (allowedSortFields.has(field)) orderBy = { [field]: dir };
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          customerId: true,
          totalCents: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({ items: toJSON(items), total, page, limit });
  } catch (err) {
    console.error("owner.orders.list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /owner/orders/:id
async function getById(req, res) {
  try {
    const id = BigInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ order: toJSON(order) });
  } catch (err) {
    console.error("owner.orders.getById error:", err);
    return res
      .status(400)
      .json({ message: "Cannot get order", error: err.message });
  }
}

// PATCH /owner/orders/:id/status  { status: "CONFIRMED" }
async function updateStatus(req, res) {
  try {
    const id = BigInt(req.params.id);
    const { status } = req.body || {};
    const next = String(status || "").toUpperCase();

    if (!ALLOWED_STATUS.has(next)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: next },
      select: { id: true, status: true },
    });

    return res.json({ order: toJSON(order) });
  } catch (err) {
    console.error("owner.orders.updateStatus error:", err);
    return res
      .status(400)
      .json({ message: "Cannot update status", error: err.message });
  }
}

module.exports = { list, getById, updateStatus };
