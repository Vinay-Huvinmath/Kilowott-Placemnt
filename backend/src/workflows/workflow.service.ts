import { prisma } from '../prisma.js';

export interface TriggerContext {
  trigger: 'order_created' | 'order_delivered' | 'became_at_risk';
  customerId: string;
  orderId?: string;
  productName?: string;
}

export async function ensureDefaultWorkflows() {
  const count = await prisma.workflow.count();
  if (count === 0) {
    await prisma.workflow.createMany({
      data: [
        {
          name: 'Order confirmation',
          trigger: 'order_created',
          delayDays: 0,
          subject: 'Your order is confirmed',
          message: 'Namaste {{name}}, your order for {{product}} is received and packed at our Panjim studio.',
          active: true
        },
        {
          name: 'Review request 2 days after delivery',
          trigger: 'order_delivered',
          delayDays: 2,
          subject: 'How is your handloom piece?',
          message: 'Namaste {{name}}, we hope your {{product}} reached safely. Let us know how it feels in your home.',
          active: true
        },
        {
          name: 'Win-back for At Risk',
          trigger: 'became_at_risk',
          delayDays: 0,
          subject: 'A quiet hello from our Goa studio',
          message: 'Namaste {{name}}, it has been a while since your last visit. We put aside 10% off your next parcel with code PULSE10.',
          active: true
        }
      ]
    });
  }
}

export async function triggerWorkflows(ctx: TriggerContext) {
  const matchingWorkflows = await prisma.workflow.findMany({
    where: {
      trigger: ctx.trigger,
      active: true
    }
  });

  const isFastMode = process.env.DEMO_FAST !== 'false'; // default true
  const msPerDay = isFastMode ? 10000 : 86400000; // 10s per day in fast mode

  for (const wf of matchingWorkflows) {
    if (wf.delayDays === 0) {
      await executeWorkflowAction(wf.id, ctx.customerId, ctx.orderId, ctx.productName);
    } else {
      const scheduledFor = new Date(Date.now() + wf.delayDays * msPerDay);
      await prisma.workflowJob.create({
        data: {
          workflowId: wf.id,
          customerId: ctx.customerId,
          orderId: ctx.orderId,
          scheduledFor
        }
      });
    }
  }
}

export async function executeWorkflowAction(
  workflowId: string,
  customerId: string,
  orderId?: string,
  productName?: string
) {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || !workflow.active) return;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        include: { items: true },
        orderBy: { orderDate: 'desc' },
        take: 1
      }
    }
  });

  if (!customer) return;

  const resolvedProduct =
    productName ||
    customer.orders[0]?.items[0]?.productName ||
    'handcrafted piece';

  const firstName = customer.name.split(' ')[0] || customer.name;

  const finalSubject = workflow.subject
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{product\}\}/g, resolvedProduct);

  const finalMessage = workflow.message
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{product\}\}/g, resolvedProduct);

  await prisma.communication.create({
    data: {
      customerId: customer.id,
      type: 'whatsapp',
      subject: finalSubject,
      message: finalMessage,
      status: 'sent',
      source: 'workflow'
    }
  });

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { lastRunAt: new Date() }
  });
}

export function startWorkflowEngine() {
  const interval = setInterval(async () => {
    try {
      const dueJobs = await prisma.workflowJob.findMany({
        where: {
          executed: false,
          scheduledFor: { lte: new Date() }
        },
        take: 10
      });

      for (const job of dueJobs) {
        await executeWorkflowAction(job.workflowId, job.customerId, job.orderId || undefined);
        await prisma.workflowJob.update({
          where: { id: job.id },
          data: { executed: true }
        });
      }
    } catch (err: any) {
      console.error('Workflow tick error:', err.message);
    }
  }, 10000); // Check every 10 seconds

  return () => clearInterval(interval);
}
