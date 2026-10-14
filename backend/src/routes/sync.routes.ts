import { Router, Request, Response } from 'express';
import { runSync, syncSingleOrder } from '../integration/sync.service.js';
import { prisma } from '../prisma.js';
import { WooOrder } from '../integration/woocommerce.provider.js';

export const syncRouter = Router();

// GET /api/sync/status
syncRouter.get('/status', (req: Request, res: Response) => {
  const isLive = process.env.WOO_MODE === 'live' || Boolean(process.env.WOO_CONSUMER_KEY && process.env.WOO_STORE_URL);
  res.json({
    mode: isLive ? 'live' : 'mock',
    storeUrl: process.env.WOO_STORE_URL || null,
    hasCredentials: Boolean(process.env.WOO_CONSUMER_KEY && process.env.WOO_CONSUMER_SECRET)
  });
});

// POST /api/sync
syncRouter.post('/', async (req: Request, res: Response) => {
  try {
    const summary = await runSync();
    res.json({ success: true, ...summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/webhooks/woocommerce (accepts order.created payload)
syncRouter.post('/webhooks/woocommerce', async (req: Request, res: Response) => {
  try {
    const rawOrder: WooOrder = req.body;
    if (!rawOrder || !rawOrder.id) {
      res.status(400).json({ error: 'Valid WooCommerce order payload required' });
      return;
    }

    const result = await syncSingleOrder(rawOrder);
    res.json({ success: true, orderId: result.order.id, customerId: result.customerId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mock/new-order (fabricates a new order for a random existing customer)
syncRouter.post('/mock/new-order', async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany();
    if (customers.length === 0) {
      res.status(400).json({ error: 'No customers available. Sync store first.' });
      return;
    }

    // Pick a random customer
    const customer = customers[Math.floor(Math.random() * customers.length)];

    const CATALOG = [
      { name: 'Kunbi Handwoven Saree', price: 9200 },
      { name: 'Cashew Brittle Box (400g)', price: 650 },
      { name: 'Terracotta Diya Set (6-pack)', price: 1200 },
      { name: 'Feni Glazed Ceramic Jar', price: 2400 },
      { name: 'Goan Kokum Butter Balm', price: 480 },
      { name: 'Mario Miranda Illustrated Mug', price: 850 },
      { name: 'Bebinca Traditional Cake Tin', price: 750 },
      { name: 'Handwoven Cotton Lungi', price: 1800 },
      { name: 'Brass Coconut Grater', price: 3100 },
      { name: 'Portuguese Azulejo Tile Trivet', price: 1450 }
    ];

    // Pick 1 to 2 random items
    const numItems = Math.random() > 0.5 ? 2 : 1;
    const selectedItems = [];
    let orderTotal = 0;

    for (let i = 0; i < numItems; i++) {
      const item = CATALOG[Math.floor(Math.random() * CATALOG.length)];
      const qty = Math.random() > 0.7 ? 2 : 1;
      const lineTotal = item.price * qty;
      orderTotal += lineTotal;
      selectedItems.push({
        id: Math.floor(Math.random() * 90000) + 10000,
        product_id: 850 + i,
        name: item.name,
        quantity: qty,
        price: item.price,
        total: lineTotal.toString()
      });
    }

    const generatedWooId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
    const names = customer.name.split(' ');
    const firstName = names[0] || 'Patron';
    const lastName = names.slice(1).join(' ') || '';

    const fabricatedWooOrder: WooOrder = {
      id: generatedWooId,
      number: `PULSE-${generatedWooId}`,
      customer_id: customer.wooCustomerId,
      status: 'processing',
      total: orderTotal.toString(),
      date_created: new Date().toISOString(),
      billing: {
        first_name: firstName,
        last_name: lastName,
        email: customer.email,
        phone: customer.phone || '+91 98221 00000',
        city: customer.city || 'Panjim',
        state: 'Goa',
        country: 'India'
      },
      line_items: selectedItems
    };

    // Run it through the webhook pipeline
    const result = await syncSingleOrder(fabricatedWooOrder);

    res.json({
      success: true,
      fabricatedOrder: fabricatedWooOrder,
      order: result.order,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
