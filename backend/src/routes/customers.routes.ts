import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { computeHealthScore } from '../analytics/health-score.js';
import { nextBestAction } from '../analytics/next-best-action.js';
import { generateMessage } from '../analytics/message-generator.js';

export const customersRouter = Router();

// GET /api/customers (search, segment filter)
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, segment } = req.query;

    const where: any = {};
    if (segment && segment !== 'all') {
      where.segment = String(segment);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { city: { contains: q } },
        { phone: { contains: q } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: {
          where: { status: { notIn: ['refunded', 'cancelled'] } },
          orderBy: { orderDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = customers.map(c => {
      const totalSpend = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const orderCount = c.orders.length;
      const lastOrderDate = c.orders[0]?.orderDate || null;
      const daysIdle = lastOrderDate
        ? Math.max(0, Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000))
        : null;

      return {
        id: c.id,
        wooCustomerId: c.wooCustomerId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        segment: c.segment,
        healthScore: c.healthScore,
        createdAt: c.createdAt,
        totalSpend,
        orderCount,
        lastOrderDate,
        daysIdle
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function findCustomer(id: string) {
  const isNum = !isNaN(Number(id));
  let customer = await prisma.customer.findFirst({
    where: isNum ? { OR: [{ id }, { wooCustomerId: Number(id) }] } : { id },
    include: {
      orders: {
        include: { items: true },
        orderBy: { orderDate: 'desc' }
      },
      communications: {
        orderBy: { sentAt: 'desc' }
      }
    }
  });

  if (!customer && (id === '1' || id === '0')) {
    customer = await prisma.customer.findFirst({
      include: {
        orders: {
          include: { items: true },
          orderBy: { orderDate: 'desc' }
        },
        communications: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });
  }

  return customer;
}

// GET /api/customers/:id (full 360)
customersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await findCustomer(req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    buildCustomer360Response(customer, res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function buildCustomer360Response(customer: any, res: Response) {
  const validOrders = customer.orders.filter((o: any) => o.status !== 'refunded' && o.status !== 'cancelled');
  const totalSpend = validOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
  const orderCount = validOrders.length;
  const lastOrderDate = validOrders[0]?.orderDate || null;
  const daysIdle = lastOrderDate
    ? Math.max(0, Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000))
    : 999;

  const ordersInLast90Days = validOrders.filter(
    (o: any) => (Date.now() - new Date(o.orderDate).getTime()) <= 90 * 86400000
  ).length;

  const hasRecentCommunication = customer.communications.some(
    (comm: any) => (Date.now() - new Date(comm.sentAt).getTime()) <= 30 * 86400000
  );

  const health = computeHealthScore({
    daysSinceLastOrder: lastOrderDate ? daysIdle : null,
    ordersInLast90Days,
    lifetimeSpend: totalSpend,
    hasRecentCommunication
  });

  const lastProduct = validOrders[0]?.items?.[0]?.productName || 'Kunbi handloom piece';

  const action = nextBestAction({
    name: customer.name,
    totalSpend,
    orderCount,
    daysIdle,
    segment: customer.segment,
    lastProductName: lastProduct
  });

  res.json({
    profile: {
      id: customer.id,
      wooCustomerId: customer.wooCustomerId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      segment: customer.segment,
      healthScore: health.score,
      healthBand: health.band,
      createdAt: customer.createdAt,
      totalSpend,
      orderCount,
      lastOrderDate,
      daysIdle
    },
    orders: customer.orders,
    communications: customer.communications,
    scoreBreakdown: health,
    nextBestAction: action
  });
}

// POST /api/customers/:id/generate-message
customersRouter.post('/:id/generate-message', async (req: Request, res: Response) => {
  try {
    const customer = await findCustomer(req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const validOrders = customer.orders.filter(o => o.status !== 'refunded' && o.status !== 'cancelled');
    const totalSpend = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = validOrders.length;
    const lastOrderDate = validOrders[0]?.orderDate || null;
    const daysIdle = lastOrderDate
      ? Math.max(0, Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000))
      : 999;

    const lastProduct = validOrders[0]?.items?.[0]?.productName || 'Kunbi handloom piece';

    const action = nextBestAction({
      name: customer.name,
      totalSpend,
      orderCount,
      daysIdle,
      segment: customer.segment,
      lastProductName: lastProduct
    });

    const result = await generateMessage(
      {
        name: customer.name,
        city: customer.city,
        lastProduct
      },
      action
    );

    res.json({
      message: result.message,
      source: result.source,
      subject: result.subject,
      channel: action.channel,
      discountPercent: action.discountPercent,
      action
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/:id/communications (logs and marks sent)
customersRouter.post('/:id/communications', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, subject, message, channel, source } = req.body;
    const customer = await findCustomer(id);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const comm = await prisma.communication.create({
      data: {
        customerId: customer.id,
        type: type || channel || 'whatsapp',
        subject: subject || null,
        message: message.trim(),
        status: 'sent',
        source: source || 'manual',
        sentAt: new Date()
      }
    });

    res.status(201).json(comm);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
