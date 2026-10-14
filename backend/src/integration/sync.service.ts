import { prisma } from '../prisma.js';
import { WooCommerceProvider, WooOrder } from './woocommerce.provider.js';
import { MockWooCommerceProvider } from './mock-woocommerce.provider.js';
import { LiveWooCommerceProvider } from './live-woocommerce.provider.js';
import { mapWooCustomer, mapWooOrder } from './data-mapper.js';
import { computeSegment } from '../analytics/segmentation.js';
import { computeHealthScore } from '../analytics/health-score.js';
import { triggerWorkflows } from '../workflows/workflow.service.js';

export function getProvider(): WooCommerceProvider {
  const isLive = process.env.WOO_MODE === 'live' || Boolean(process.env.WOO_CONSUMER_KEY && process.env.WOO_STORE_URL);
  return isLive
    ? new LiveWooCommerceProvider()
    : new MockWooCommerceProvider();
}


export async function recalculateCustomer(customerId: string, previousSegment?: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        where: { status: { notIn: ['refunded', 'cancelled'] } },
        orderBy: { orderDate: 'desc' }
      },
      communications: {
        where: {
          sentAt: { gte: new Date(Date.now() - 30 * 86400000) }
        }
      }
    }
  });

  if (!customer) return;

  const validOrders = customer.orders;
  const orderCount = validOrders.length;
  const totalSpend = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const lastOrderDate = validOrders[0]?.orderDate || null;

  const daysSinceLastOrder = lastOrderDate
    ? Math.max(0, Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000))
    : null;

  const ordersInLast90Days = validOrders.filter(
    o => (Date.now() - new Date(o.orderDate).getTime()) <= 90 * 86400000
  ).length;

  const hasRecentCommunication = customer.communications.length > 0;

  const newSegment = computeSegment({
    totalSpend,
    orderCount,
    lastOrderDate
  });

  const healthResult = computeHealthScore({
    daysSinceLastOrder,
    ordersInLast90Days,
    lifetimeSpend: totalSpend,
    hasRecentCommunication
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      segment: newSegment,
      healthScore: healthResult.score
    }
  });

  // Check if newly became At Risk
  const prev = previousSegment || customer.segment;
  if (prev !== 'At Risk' && newSegment === 'At Risk') {
    await triggerWorkflows({
      trigger: 'became_at_risk',
      customerId: customer.id
    });
  }

  return { segment: newSegment, healthScore: healthResult.score };
}

export async function syncSingleOrder(rawOrder: WooOrder) {
  const mapped = mapWooOrder(rawOrder);

  // 1. Find or create customer
  let customer = await prisma.customer.findUnique({
    where: { wooCustomerId: mapped.wooCustomerId }
  });

  if (!customer) {
    const existingByEmail = await prisma.customer.findUnique({
      where: { email: mapped.customerFallback.email }
    });
    if (existingByEmail) {
      customer = existingByEmail;
    } else {
      customer = await prisma.customer.create({
        data: {
          wooCustomerId: mapped.wooCustomerId,
          name: mapped.customerFallback.name,
          email: mapped.customerFallback.email,
          phone: mapped.customerFallback.phone,
          city: mapped.customerFallback.city,
          segment: 'New',
          healthScore: 70
        }
      });
    }
  }


  const prevSegment = customer.segment;

  // 2. Check if order already exists
  const existingOrder = await prisma.order.findUnique({
    where: { wooOrderId: mapped.wooOrderId }
  });

  let createdOrder;
  if (!existingOrder) {
    createdOrder = await prisma.order.create({
      data: {
        wooOrderId: mapped.wooOrderId,
        customerId: customer.id,
        totalAmount: mapped.totalAmount,
        status: mapped.status,
        orderDate: mapped.orderDate,
        items: {
          create: mapped.items.map(it => ({
            productName: it.productName,
            quantity: it.quantity,
            price: it.price
          }))
        }
      },
      include: { items: true }
    });

    // 3. Recalculate customer metrics
    await recalculateCustomer(customer.id, prevSegment);

    // 4. Fire triggers
    await triggerWorkflows({
      trigger: 'order_created',
      customerId: customer.id,
      orderId: createdOrder.id,
      productName: mapped.items[0]?.productName
    });

    if (mapped.status === 'completed') {
      await triggerWorkflows({
        trigger: 'order_delivered',
        customerId: customer.id,
        orderId: createdOrder.id,
        productName: mapped.items[0]?.productName
      });
    }
  } else {
    // Update existing order status
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: mapped.status,
        totalAmount: mapped.totalAmount
      }
    });
    await recalculateCustomer(customer.id, prevSegment);
  }

  return { order: createdOrder || existingOrder, customerId: customer.id };
}

export async function runSync() {
  const provider = getProvider();
  const [rawCustomers, rawOrders] = await Promise.all([
    provider.getCustomers(),
    provider.getOrders()
  ]);

  // 1. Upsert customers
  for (const rawC of rawCustomers) {
    const mapped = mapWooCustomer(rawC);
    await prisma.customer.upsert({
      where: { wooCustomerId: mapped.wooCustomerId },
      update: {
        name: mapped.name,
        phone: mapped.phone,
        city: mapped.city
      },
      create: {
        wooCustomerId: mapped.wooCustomerId,
        name: mapped.name,
        email: mapped.email,
        phone: mapped.phone,
        city: mapped.city,
        createdAt: mapped.createdAt
      }
    });
  }

  // 2. Upsert orders
  const touchedCustomerIds = new Set<string>();

  for (const rawO of rawOrders) {
    const mapped = mapWooOrder(rawO);
    let customer = await prisma.customer.findUnique({
      where: { wooCustomerId: mapped.wooCustomerId }
    });

    if (!customer) {
      const existingByEmail = await prisma.customer.findUnique({
        where: { email: mapped.customerFallback.email }
      });
      if (existingByEmail) {
        customer = existingByEmail;
      } else {
        customer = await prisma.customer.create({
          data: {
            wooCustomerId: mapped.wooCustomerId,
            name: mapped.customerFallback.name,
            email: mapped.customerFallback.email,
            phone: mapped.customerFallback.phone,
            city: mapped.customerFallback.city,
            segment: 'New'
          }
        });
      }
    }


    touchedCustomerIds.add(customer.id);

    const existingOrder = await prisma.order.findUnique({
      where: { wooOrderId: mapped.wooOrderId }
    });

    if (!existingOrder) {
      await prisma.order.create({
        data: {
          wooOrderId: mapped.wooOrderId,
          customerId: customer.id,
          totalAmount: mapped.totalAmount,
          status: mapped.status,
          orderDate: mapped.orderDate,
          items: {
            create: mapped.items.map(it => ({
              productName: it.productName,
              quantity: it.quantity,
              price: it.price
            }))
          }
        }
      });
    }
  }

  // 3. Recalculate all touched customers
  for (const cid of touchedCustomerIds) {
    await recalculateCustomer(cid);
  }

  return {
    syncedCustomers: rawCustomers.length,
    syncedOrders: rawOrders.length,
    touchedCustomers: touchedCustomerIds.size
  };
}
