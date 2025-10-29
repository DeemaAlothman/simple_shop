// prisma/seed.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  // 1) مالك المتجر (يُنشأ مرة واحدة)
  const OWNER_PHONE = process.env.OWNER_PHONE || "+491111111111";
  const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "Owner#12345";
  const OWNER_NAME = process.env.OWNER_NAME || "Shop Owner";

  const ownerExisting = await prisma.user.findUnique({
    where: { phone: OWNER_PHONE },
  });

  if (!ownerExisting) {
    const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);
    await prisma.user.create({
      data: {
        name: OWNER_NAME,
        phone: OWNER_PHONE,
        passwordHash,
        role: "OWNER",
        isActive: true,
      },
    });
    console.log("✓ Owner created:", OWNER_PHONE);
  } else {
    console.log("• Owner already exists:", OWNER_PHONE);
  }

  // 2) تصنيفات أساسية
  const mobiles = await prisma.category.upsert({
    where: { id: 1n }, // حيلة آمنة: جرّبي باسم فريد بدل id إن أحببت
    update: {},
    create: { name: "Mobiles", isActive: true },
  });
  const laptops = await prisma.category.upsert({
    where: { id: 2n },
    update: {},
    create: { name: "Laptops", isActive: true },
  });

  // 3) ماركات أساسية
  const brandAcme = await prisma.brand.upsert({
    where: { name: "Acme" },
    update: {},
    create: { name: "Acme", isActive: true },
  });
  const brandZeta = await prisma.brand.upsert({
    where: { name: "Zeta" },
    update: {},
    create: { name: "Zeta", isActive: true },
  });

  // 4) منتجات مع features (JSON) لاستخدام المقارنة
  const p1 = await prisma.product.upsert({
    where: { sku: "PHX-128-BLK" },
    update: {},
    create: {
      name: "Phone X",
      sku: "PHX-128-BLK",
      priceCents: 199900,
      stockQty: 12,
      isActive: true,
      category: { connect: { id: mobiles.id } },
      brand: { connect: { id: brandAcme.id } },
      features: {
        RAM: "8 GB",
        Storage: "128 GB",
        Color: "Black",
        Display: '6.1" OLED',
        Battery: "4200 mAh",
      },
    },
  });

  const p2 = await prisma.product.upsert({
    where: { sku: "PHY-256-SLV" },
    update: {},
    create: {
      name: "Phone Y",
      sku: "PHY-256-SLV",
      priceCents: 229900,
      stockQty: 5,
      isActive: true,
      category: { connect: { id: mobiles.id } },
      brand: { connect: { id: brandZeta.id } },
      features: {
        RAM: "12 GB",
        Storage: "256 GB",
        Color: "Silver",
        Display: '6.4" AMOLED',
        Battery: "4500 mAh",
      },
    },
  });

  const l1 = await prisma.product.upsert({
    where: { sku: "LTX-16-512" },
    update: {},
    create: {
      name: "Laptop X",
      sku: "LTX-16-512",
      priceCents: 359900,
      stockQty: 7,
      isActive: true,
      category: { connect: { id: laptops.id } },
      brand: { connect: { id: brandAcme.id } },
      features: {
        CPU: "Core i7",
        RAM: "16 GB",
        Storage: "512 GB SSD",
        GPU: "RTX 4060",
        Weight: "1.7 kg",
      },
    },
  });

  // 5) عرض ترويجي بسيط (اختياري)
  const now = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const offer = await prisma.offer.upsert({
    where: { id: 1n },
    update: {},
    create: {
      name: "Launch Promo",
      type: "PERCENT",
      value: "10.00",
      startsAt: now,
      endsAt: tomorrow,
      isActive: true,
      productTargets: {
        create: [{ productId: p1.id }, { productId: p2.id }],
      },
    },
  });

  console.log(
    "✓ Seed done. Products:",
    [p1.sku, p2.sku, l1.sku],
    "Offer:",
    offer.name
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
