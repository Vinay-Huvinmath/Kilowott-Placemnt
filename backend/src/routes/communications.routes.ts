import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const communicationsRouter = Router();

// GET /api/communications
communicationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { limit, type, source } = req.query;
    const where: any = {};
    if (type) where.type = String(type);
    if (source) where.source = String(source);

    const take = limit ? parseInt(String(limit), 10) : 100;

    const comms = await prisma.communication.findMany({
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
        }
      },
      orderBy: { sentAt: 'desc' },
      take
    });

    res.json(comms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
