import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const workflowsRouter = Router();

// GET /api/workflows
workflowsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const [workflows, comms] = await Promise.all([
      prisma.workflow.findMany({
        orderBy: { createdAt: 'asc' }
      }),
      prisma.communication.findMany({
        where: { source: 'workflow' }
      })
    ]);

    const result = workflows.map(wf => {
      const count = comms.filter(c => c.subject === wf.subject || (wf.name && c.message.includes(wf.name))).length;
      return {
        ...wf,
        messagesSent: count
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows
workflowsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, trigger, delayDays, subject, message, active } = req.body;
    if (!name || !trigger || !subject || !message) {
      res.status(400).json({ error: 'Name, trigger, subject, and message are required' });
      return;
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        trigger,
        delayDays: delayDays ? parseInt(String(delayDays), 10) : 0,
        subject,
        message,
        active: active !== undefined ? Boolean(active) : true
      }
    });

    res.status(201).json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id
workflowsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, trigger, delayDays, subject, message, active } = req.body;

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(trigger && { trigger }),
        ...(delayDays !== undefined && { delayDays: parseInt(String(delayDays), 10) }),
        ...(subject && { subject }),
        ...(message && { message }),
        ...(active !== undefined && { active: Boolean(active) })
      }
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflows/:id
workflowsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.workflow.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
