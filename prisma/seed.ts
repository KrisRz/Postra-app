import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@postra.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  let user = await prisma.user.findFirst({ where: { email: adminEmail } });
  let orgId: string;

  if (!user) {
    const org = await prisma.organization.create({
      data: { name: 'Postra Admin', description: 'Local dev organization' },
    });
    orgId = org.id;
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashSync(adminPassword, 10),
        providerName: 'LOCAL',
        name: 'Admin',
        lastName: 'Postra',
        isSuperAdmin: true,
        timezone: 1,
        activated: true,
      },
    });
    await prisma.userOrganization.create({
      data: { userId: user.id, organizationId: orgId, role: 'SUPERADMIN' },
    });
  } else {
    const membership = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    orgId = membership!.organizationId;
  }

  // Active, NON-lifetime subscription: full app access (not billing-walled) AND
  // /billing still loads (lifetime users get redirected away). Re-run db:seed to reset.
  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    update: {
      subscriptionTier: 'ULTIMATE',
      period: 'YEARLY',
      totalChannels: 100,
      isLifetime: false,
    },
    create: {
      organizationId: orgId,
      subscriptionTier: 'ULTIMATE',
      period: 'YEARLY',
      totalChannels: 100,
      isLifetime: false,
    },
  });

  console.log(`Seeded/reset admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Org ${orgId} — ULTIMATE, non-lifetime (app accessible + billing loads)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
