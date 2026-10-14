import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { recalculateCustomer } from '../integration/sync.service.js';
import { triggerWorkflows } from '../workflows/workflow.service.js';

export const ordersRouter = Router();

// GET /api/orders
ordersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit } = req.query;
    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }

    const take = limit ? parseInt(String(limit), 10) : 100;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            segment: true
          }
        },
        items: true
      },
      orderBy: { orderDate: 'desc' },
      take
    });

    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status
ordersRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { customer: true, items: true }
    });

    await recalculateCustomer(order.customerId);

    if (status === 'completed') {
      await triggerWorkflows({
        trigger: 'order_delivered',
        customerId: order.customerId,
        orderId: order.id,
        productName: order.items[0]?.productName
      });
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
