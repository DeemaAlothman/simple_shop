const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

function computeDiscount(basePriceCents, offers) {
  let discount = 0;
  for (const o of offers) {
    if (o.type === "PERCENT") {
      const pct = Number(o.value); // "10.00" -> 10
      if (!isNaN(pct) && pct > 0) {
        discount += Math.floor((basePriceCents * pct) / 100);
      }
    } else if (o.type === "AMOUNT") {
      const amt = Math.round(Number(o.value) * 100); // قيمة بالـ Decimal -> سنتات
      if (!isNaN(amt) && amt > 0) discount += amt;
    }
  }
  // سقف: الخصم لا يتجاوز السعر الأساسي ولا يصبح سالب
  discount = Math.max(0, Math.min(discount, basePriceCents));
  return discount;
}

async function listPublic(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit ||  "20", 10), 1),
      100
    );
    const onlyNow = String(req.query.now || "true").toLowerCase() === "true";
    const now = new Date();

    const where = { isActive: true };
    if (onlyNow) {
      where.startsAt = { lte: now };
      where.endsAt = { gte: now };
    }

    const [items, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          // رجّع تفاصيل المنتجات المستهدفة
          productTargets: {
            select: {
              productId: true, // اختياري: خليها لو حابب تحتفظ بالـ id
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  priceCents: true,
                  stockQty: true,
                  isActive: true,
                  description: true, // ✅ إضافة الوصف
                  imageUrl: true, // ✅ إضافة رابط الصورة
                  features: true, // JSON
                  brand: {
                    select: { id: true, name: true },
                  },
                  category: {
                    select: { id: true, name: true, parentId: true },
                  },
                },
              },
            },
          },
          // (اختياري) رجّع تفاصيل التصنيفات المستهدفة
          categoryTargets: {
            select: {
              categoryId: true, // اختياري
              category: {
                select: {
                  id: true,
                  name: true,
                  parentId: true,
                  isActive: true,
                },
              },
            },
          },
        },
      }),
      prisma.offer.count({ where }),
    ]);

    return res.json({ items: toJSON(items), total, page, limit });
  } catch (err) {
    console.error("catalog.offers.listPublic error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /catalog/price?id=PRODUCT_ID
async function getPriceWithOffers(req, res) {
  try {
    const idStr = req.query.id;
    if (!idStr) return res.status(400).json({ message: "id is required" });
    const id = BigInt(idStr);

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        priceCents: true,
        categoryId: true,
        name: true,
        sku: true,
      },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const now = new Date();
    // عروض فعّالة الآن وتستهدف المنتج أو تصنيفه المباشر
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { productTargets: { some: { productId: product.id } } },
          { categoryTargets: { some: { categoryId: product.categoryId } } },
        ],
      },
      select: { id: true, name: true, type: true, value: true },
    });

    const basePriceCents = product.priceCents;
    const discountCents = computeDiscount(basePriceCents, offers);
    const finalPriceCents = basePriceCents - discountCents;

    return res.json({
      productId: product.id.toString(),
      basePriceCents,
      discountCents,
      finalPriceCents,
      appliedOffers: toJSON(offers),
    });
  } catch (err) {
    console.error("catalog.offers.getPriceWithOffers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { listPublic, getPriceWithOffers };
