const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getUid } = require("../auth"); // نستخدم نفس الدالة لاستخراج BigInt

module.exports = async function me(req, res) {
  try {
    const uid = getUid(req);
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: user.id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email ?? null,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("owner/me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
