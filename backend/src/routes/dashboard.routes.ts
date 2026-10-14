import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req: Request, res: Response) => {
  try {
    const [allCustomers, allOrders, orderItems] = await Promise.all([
      prisma.customer.findMany({
        include: {
          orders: {
            where: { status: { notIn: ['refunded', 'cancelled'] } },
            orderBy: { orderDate: 'desc' }
          }
        }
      }),
      prisma.order.findMany({
        where: { status: { notIn: ['refunded', 'cancelled'] } },
        orderBy: { orderDate: 'asc' }
      }),
      prisma.orderItem.findMany({
        include: {
          order: true
        }
      })
    ]);

    // 1. Core KPIs
    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCustomers = allCustomers.length;
    const totalOrders = allOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // 2. Segment counts
    const segmentCounts = {
      VIP: 0,
      'At Risk': 0,
      Loyal: 0,
      New: 0,
      Regular: 0
    };

    for (const c of allCustomers) {
      if (c.segment in segmentCounts) {
        segmentCounts[c.segment as keyof typeof segmentCounts]++;
      }
    }

    // 3. 6-Month Revenue Series
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthsMap = new Map<string, { label: string; revenue: number; orders: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
      monthsMap.set(key, { label, revenue: 0, orders: 0 });
    }

    for (const o of allOrders) {
      const d = new Date(o.orderDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthsMap.has(key)) {
        const item = monthsMap.get(key)!;
        item.revenue += Math.round(o.totalAmount);
        item.orders += 1;
      }
    }

    const revenueSeries = Array.from(monthsMap.values());

    // 4. Top 5 Products
    const productStatsMap = new Map<string, { productName: string; revenue: number; quantity: number }>();
    for (const item of orderItems) {
      if (item.order && (item.order.status === 'refunded' || item.order.status === 'cancelled')) continue;
      const existing = productStatsMap.get(item.productName) || {
        productName: item.productName,
        revenue: 0,
        quantity: 0
      };
      existing.quantity += item.quantity;
      existing.revenue += Math.round(item.price * item.quantity);
      productStatsMap.set(item.productName, existing);
    }

    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 5. At Risk Customer List
    const atRiskList = allCustomers
      .filter(c => c.segment === 'At Risk')
      .map(c => {
        const spend = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const lastOrder = c.orders[0]?.orderDate || null;
        const daysIdle = lastOrder
          ? Math.max(0, Math.floor((Date.now() - new Date(lastOrder).getTime()) / 86400000))
          : 999;

        return {
          id: c.id,
          wooCustomerId: c.wooCustomerId,
          name: c.name,
          email: c.email,
          phone: c.phone,
          city: c.city,
          totalSpend: spend,
          orderCount: c.orders.length,
          daysIdle,
          lastOrderDate: lastOrder,
          healthScore: c.healthScore
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    res.json({
      revenue: totalRevenue,
      customers: totalCustomers,
      orders: totalOrders,
      avgOrderValue,
      segmentCounts,
      revenueSeries,
      topProducts,
      atRiskList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
