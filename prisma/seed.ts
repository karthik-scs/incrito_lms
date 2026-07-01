import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERMISSION_KEYS = [
  "user:read",
  "user:write",
  "user:delete",
  "role:read",
  "role:write",
  "course:read",
  "course:write",
  "course:publish",
  "cohort:read",
  "cohort:write",
  "enrollment:read",
  "enrollment:write",
  "category:write",
  "tag:write",
  "certificate:read",
  "certificate:write",
  "support:read",
  "support:write",
  "settings:read",
  "settings:write",
  "whatsapp:read",
  "whatsapp:write",
  "community:read",
  "community:write",
  "community:manage",
  "announcement:write",
  "plan:manage",
];

async function upsertPermissions() {
  const permissions = await Promise.all(
    PERMISSION_KEYS.map((key) => prisma.permission.upsert({ where: { key }, update: {}, create: { key } }))
  );
  return permissions;
}

async function upsertRole(
  name: string,
  isSystem: boolean,
  permissionKeys: string[],
  allPermissions: { id: string; key: string }[],
  description?: string
) {
  const permissionIds = allPermissions.filter((p) => permissionKeys.includes(p.key)).map((p) => p.id);

  const role = await prisma.role.upsert({
    where: { name },
    update: { isSystem, description },
    create: { name, isSystem, description },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    skipDuplicates: true,
  });

  return role;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.log("Refusing to seed in production without ALLOW_PROD_SEED=true");
    return;
  }

  const permissions = await upsertPermissions();
  const allKeys = permissions.map((p) => p.key);

  await upsertRole(
    "Student",
    true,
    ["course:read", "cohort:read", "enrollment:read", "community:read", "community:write"],
    permissions,
    "Learner role"
  );
  await upsertRole(
    "Mentor",
    true,
    ["course:read", "course:write", "cohort:read", "enrollment:read", "community:read", "community:write"],
    permissions,
    "Teaches and manages owned courses"
  );
  await upsertRole(
    "Cohort Manager",
    true,
    [
      "cohort:read",
      "cohort:write",
      "enrollment:read",
      "enrollment:write",
      "course:read",
      "course:write",
      "community:read",
      "community:write",
    ],
    permissions,
    "Manages cohort operations and scheduling"
  );
  await upsertRole("Admin", true, allKeys, permissions, "Full platform access");

  // Example admin-defined custom role, proving the dynamic RBAC model end to end.
  await upsertRole(
    "Support",
    false,
    ["support:read", "support:write", "user:read"],
    permissions,
    "Custom role created by an admin for support staff"
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Admin" } });
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, status: "ACTIVE", emailVerifiedAt: new Date() },
      create: {
        email: adminEmail,
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        roleId: adminRole.id,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Bootstrap admin ready: ${adminEmail}`);
  } else {
    console.log("SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set - skipping bootstrap admin user");
  }

  console.log("Seed complete: permissions, 4 system roles, 1 custom Support role.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
