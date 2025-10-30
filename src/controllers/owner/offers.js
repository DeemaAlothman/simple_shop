const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

function parseIds(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => BigInt(x));
}

function asBool(x, fallback) {
  if (typeof x === "boolean") return x;
  if (typeof x === "string") return x.toLowerCase() === "true";
  return fallback;
}

// POST /owner/offers
// body: { name, type: "PERCENT"|"AMOUNT", value, startsAt, endsAt, isActive?, productIds?, categoryIds? }
async function create(req, res) {
  try {
    const {
      name,
      type,
      value,
      startsAt,
      endsAt,
      isActive = true,
      productIds = [],
      categoryIds = [],
    } = req.body || {};

    if (!name || !type || !value || !startsAt || !endsAt) {
      return res
        .status(400)
        .json({ message: "name, type, value, startsAt, endsAt are required" });
    }
    if (!["PERCENT", "AMOUNT"].includes(type)) {
      return res
        .status(400)
        .json({ message: "type must be PERCENT or AMOUNT" });
    }

    const data = {
      name,
      type,
      value: String(value), // Decimal
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      isActive: asBool(isActive, true),
      productTargets: {
        create: parseIds(productIds).map((id) => ({ productId: id })),
      },
      categoryTargets: {
        create: parseIds(categoryIds).map((id) => ({ categoryId: id })),
      },
    };

    const offer = await prisma.offer.create({
      data,
      include: {
        productTargets: { select: { productId: true } },
        categoryTargets: { select: { categoryId: true } },
      },
    });

    return res.status(201).json({ offer: toJSON(offer) });
  } catch (err) {
    console.error("owner.offers.create error:", err);
    return res
      .status(400)
      .json({ message: "Cannot create offer", error: err.message });
  }
}

// PATCH /owner/offers/:id
// body: أي من الحقول + productIds/categoryIds لاستبدال الأهداف بالكامل (اختياري)
async function update(req, res) {
  const id = BigInt(req.params.id);
  try {
    const {
      name,
      type,
      value,
      startsAt,
      endsAt,
      isActive,
      productIds,
      categoryIds,
    } = req.body || {};

    const data = {};
    if (typeof name === "string") data.name = name;
    if (type && ["PERCENT", "AMOUNT"].includes(type)) data.type = type;
    if (value !== undefined) data.value = String(value);
    if (startsAt) data.startsAt = new Date(startsAt);
    if (endsAt) data.endsAt = new Date(endsAt);
    if (typeof isActive === "boolean") data.isActive = isActive;

    const result = await prisma.$transaction(async (tx) => {
      // تعديل بيانات أساسية
      const base = await tx.offer.update({ where: { id }, data });

      // استبدال الأهداف لو مررت arrays
      if (productIds !== undefined) {
        await tx.offerTargetProduct.deleteMany({ where: { offerId: id } });
        const pids = parseIds(productIds);
        if (pids.length) {
          await Promise.all(
            pids.map((pid) =>
              tx.offerTargetProduct.create({
                data: { offerId: id, productId: pid },
              })
            )
          );
        }
      }
      if (categoryIds !== undefined) {
        await tx.offerTargetCategory.deleteMany({ where: { offerId: id } });
        const cids = parseIds(categoryIds);
        if (cids.length) {
          await Promise.all(
            cids.map((cid) =>
              tx.offerTargetCategory.create({
                data: { offerId: id, categoryId: cid },
              })
            )
          );
        }
      }

      return tx.offer.findUnique({
        where: { id },
        include: {
          productTargets: { select: { productId: true } },
          categoryTargets: { select: { categoryId: true } },
        },
      });
    });

    return res.json({ offer: toJSON(result) });
  } catch (err) {
    console.error("owner.offers.update error:", err);
    return res
      .status(400)
      .json({ message: "Cannot update offer", error: err.message });
  }
}

// DELETE /owner/offers/:id
async function remove(req, res) {
  const id = BigInt(req.params.id);
  try {
    await prisma.offer.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("owner.offers.remove error:", err);
    return res
      .status(400)
      .json({ message: "Cannot delete offer", error: err.message });
  }
}

// GET /owner/offers?active?&page?&limit?
async function list(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const active = req.query.active;
    const now = new Date();

    const where = {};
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;

    const [items, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          productTargets: { select: { productId: true } },
          categoryTargets: { select: { categoryId: true } },
        },
      }),
      prisma.offer.count({ where }),
    ]);

    return res.json({
      items: toJSON(items),
      total,
      page,
      limit,
      now: now.toISOString(),
    });
  } catch (err) {
    console.error("owner.offers.list error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /owner/offers/:id
async function getById(req, res) {
  const id = BigInt(req.params.id);
  try {
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        productTargets: { select: { productId: true } },
        categoryTargets: { select: { categoryId: true } },
      },
    });
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    return res.json({ offer: toJSON(offer) });
  } catch (err) {
    console.error("owner.offers.getById error:", err);
    return res
      .status(400)
      .json({ message: "Cannot get offer", error: err.message });
  }
}

module.exports = { create, update, remove, list, getById };
