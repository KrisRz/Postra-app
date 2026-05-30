import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@postra.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const hashedPassword = hashSync(adminPassword, 10);

  const existing = await prisma.user.findFirst({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`User ${adminEmail} already exists (${existing.id}), skipping.`);
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: 'Postra Admin',
      description: 'Local dev organization',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      providerName: 'LOCAL',
      name: 'Admin',
      lastName: 'Postra',
      isSuperAdmin: true,
      timezone: 1,
      activated: true,
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'SUPERADMIN',
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      subscriptionTier: 'ULTIMATE',
      period: 'YEARLY',
      totalChannels: 100,
      isLifetime: true,
    },
  });

  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Org ID:  ${org.id}`);
  console.log(`  Role:    SUPERADMIN + isSuperAdmin`);
  console.log(`  Tier:    ULTIMATE (lifetime)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
