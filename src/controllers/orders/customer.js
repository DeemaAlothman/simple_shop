// src/controllers/orders/customer.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

// POST /orders
// body: { items: [{ productId, qty }, ...] }
async function createOrder(req, res) {
  try {
    const uid = BigInt(req.user.id);
    const { items } = req.body || {};

    // تحقق أساسي على عناصر الطلب
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "items must be a non-empty array" });
    }

    // تطبيع الإدخال
    const normalized = items.map((it) => ({
      productId: BigInt(it.productId),
      qty: Math.max(1, Number(it.qty) || 0),
    }));

    // جلب المنتجات والتحقق من كونها فعّالة
    const productIds = normalized.map((x) => x.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        priceCents: true,
        stockQty: true,
      },
    });
    if (products.length !== normalized.length) {
      return res
        .status(400)
        .json({ message: "Some products not found or inactive" });
    }

    // تحقق مخزون
    const byId = new Map(products.map((p) => [p.id.toString(), p]));
    for (const it of normalized) {
      const p = byId.get(it.productId.toString());
      if (!p || p.stockQty < it.qty) {
        return res.status(400).json({
          message: "Insufficient stock",
          productId: it.productId.toString(),
          requested: it.qty,
          available: p ? p.stockQty : 0,
        });
      }
    }

    // حساب المجاميع
    let subtotal = 0;
    const orderItemsData = normalized.map((it) => {
      const p = byId.get(it.productId.toString());
      const line = p.priceCents * it.qty;
      subtotal += line;
      return {
        productId: p.id,
        nameSnapshot: p.name,
        skuSnapshot: p.sku,
        unitPriceCents: p.priceCents,
        qty: it.qty,
        lineTotalCents: line,
      };
    });

    const discountCents = 0; // لا خصم حالياً
    const totalCents = subtotal - discountCents;

    // معاملة: خصم مخزون + إنشاء الطلب وبنوده
    const created = await prisma.$transaction(async (tx) => {
      // خصم المخزون (اختياري—أبقيناه مفعلاً هنا)
      for (const it of normalized) {
        const p = byId.get(it.productId.toString());
        const next = Math.max(0, p.stockQty - it.qty);
        await tx.product.update({
          where: { id: p.id },
          data: { stockQty: next },
        });
      }

      // إنشاء الطلب (بدون أي Snapshot للتواصل)
      const order = await tx.order.create({
        data: {
          customerId: uid,
          subtotalCents: subtotal,
          discountCents,
          totalCents,
          paymentMethod: "COD",
          status: "PLACED",
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      return order;
    });

    return res.status(201).json({ order: toJSON(created) });
  } catch (err) {
    console.error("orders.createOrder error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /orders/me
async function listMyOrders(req, res) {
  try {
    const uid = BigInt(req.user.id);
    const items = await prisma.order.findMany({
      where: { customerId: uid },
      orderBy: { id: "desc" },
      select: { id: true, status: true, totalCents: true, createdAt: true },
    });
    return res.json({ items: toJSON(items) });
  } catch (err) {
    console.error("orders.listMyOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /orders/me/:id
async function getMyOrderById(req, res) {
  try {
    const uid = BigInt(req.user.id);
    const id = BigInt(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, customerId: uid },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ order: toJSON(order) });
  } catch (err) {
    console.error("orders.getMyOrderById error:", err);
    return res
      .status(400)
      .json({ message: "Cannot get order", error: err.message });
  }
}

module.exports = { createOrder, listMyOrders, getMyOrderById };
