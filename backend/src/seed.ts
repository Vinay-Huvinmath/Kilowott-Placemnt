import { prisma } from './prisma.js';
import { runSync } from './integration/sync.service.js';
import { ensureDefaultWorkflows } from './workflows/workflow.service.js';

export async function runInitialSeed(force = false) {
  if (force) {
    await prisma.workflowJob.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.communication.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
  }

  const customerCount = await prisma.customer.count();
  if (customerCount === 0 || force) {
    await ensureDefaultWorkflows();
    await runSync();

    // Seed a few initial shopkeeper communications for realism
    const savio = await prisma.customer.findFirst({ where: { email: 'savio.fernandes@goa.mail' } });
    if (savio) {
      await prisma.communication.create({
        data: {
          customerId: savio.id,
          type: 'note',
          subject: 'Special preference noted',
          message: 'Prefers parcel delivery to his Panjim studio before noon. Regular buyer of Kunbi weaves.',
          status: 'sent',
          source: 'manual',
          sentAt: new Date(Date.now() - 65 * 86400000)
        }
      });
    }

    const pooja = await prisma.customer.findFirst({ where: { email: 'pooja.hegde@margaomail.in' } });
    if (pooja) {
      await prisma.communication.create({
        data: {
          customerId: pooja.id,
          type: 'whatsapp',
          subject: 'Dispatch confirmation',
          message: 'Namaste Pooja, your parcel of Kunbi sarees has been dispatched via BlueDart. Tracking active.',
          status: 'sent',
          source: 'workflow',
          sentAt: new Date(Date.now() - 11 * 86400000)
        }
      });
    }
  }
}

// If executed directly from CLI: `tsx src/seed.ts`
if (process.argv[1]?.endsWith('seed.ts')) {
  runInitialSeed(true)
    .then(() => {
      console.log('Pulse database seeded successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
