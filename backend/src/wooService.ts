import axios from 'axios';
import { prisma } from './prisma.js';

export function determineSegment(totalOrders: number, totalSpend: number, lastOrderAt: Date | null): 'VIP' | 'Loyal' | 'New' | 'At Risk' {
  if (!lastOrderAt) return 'New';

  const daysSinceLastOrder = Math.floor((Date.now() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24));

  if (totalOrders >= 4 || totalSpend >= 15000) {
    if (daysSinceLastOrder > 75) return 'At Risk';
    return 'VIP';
  }

  if (daysSinceLastOrder > 60 && totalOrders >= 2) {
    return 'At Risk';
  }

  if (totalOrders >= 2) {
    return 'Loyal';
  }

  return 'New';
}

export async function syncWooCommerceStore() {
  const setting = await prisma.storeSetting.findFirst();
  const hasRealCreds = Boolean(
    setting &&
    setting.storeUrl &&
    setting.consumerKey &&
    setting.consumerSecret &&
    !setting.storeUrl.includes('demo.pulse.local')
  );

  if (hasRealCreds && setting) {
    try {
      const auth = {
        username: setting.consumerKey,
        password: setting.consumerSecret
      };

      const customersRes = await axios.get(`${setting.storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/customers?per_page=50`, {
        auth,
        timeout: 8000
      });

      const ordersRes = await axios.get(`${setting.storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/orders?per_page=50`, {
        auth,
        timeout: 8000
      });

      const customersData = customersRes.data || [];
      const ordersData = ordersRes.data || [];

      for (const wcCust of customersData) {
        const email = wcCust.email || `customer_${wcCust.id}@pulse.local`;
        const name = `${wcCust.first_name || ''} ${wcCust.last_name || ''}`.trim() || wcCust.username || 'Customer';
        const city = wcCust.billing?.city || 'Jaipur';
        const state = wcCust.billing?.state || 'Rajasthan';
        const phone = wcCust.billing?.phone || '+91 98200 11223';

        await prisma.customer.upsert({
          where: { email },
          update: {
            name,
            phone,
            city,
            state,
            wooCustomerId: wcCust.id
          },
          create: {
            wooCustomerId: wcCust.id,
            name,
            email,
            phone,
            city,
            state,
            segment: 'New'
          }
        });
      }

      for (const wcOrder of ordersData) {
        const orderEmail = wcOrder.billing?.email;
        let customer = await prisma.customer.findFirst({
          where: orderEmail ? { email: orderEmail } : { wooCustomerId: wcOrder.customer_id }
        });

        if (!customer) {
          const custName = `${wcOrder.billing?.first_name || ''} ${wcOrder.billing?.last_name || ''}`.trim() || 'Store Patron';
          customer = await prisma.customer.create({
            data: {
              name: custName,
              email: orderEmail || `order_${wcOrder.id}@pulse.local`,
              phone: wcOrder.billing?.phone || '+91 98200 44556',
              city: wcOrder.billing?.city || 'Mumbai',
              state: wcOrder.billing?.state || 'Maharashtra',
              segment: 'New'
            }
          });
        }

        const totalAmount = parseFloat(wcOrder.total) || 0;
        const status = wcOrder.status === 'completed' ? 'completed'
          : wcOrder.status === 'processing' ? 'processing'
          : wcOrder.status === 'refunded' ? 'refunded' : 'pending';

        const existingOrder = await prisma.order.findUnique({
          where: { wooOrderId: wcOrder.id }
        });

        if (!existingOrder) {
          await prisma.order.create({
            data: {
              wooOrderId: wcOrder.id,
              orderNumber: String(wcOrder.number || wcOrder.id),
              customerId: customer.id,
              status,
              totalAmount,
              currency: 'INR',
              paymentMethod: wcOrder.payment_method_title || 'UPI / Razorpay',
              shippingCity: wcOrder.shipping?.city || wcOrder.billing?.city || 'Mumbai',
              orderedAt: new Date(wcOrder.date_created || Date.now()),
              items: {
                create: (wcOrder.line_items || []).map((item: any) => ({
                  productName: item.name || 'Artisan Goods',
                  sku: item.sku || 'SKU-PULSE',
                  quantity: item.quantity || 1,
                  price: parseFloat(item.price) || (totalAmount / (wcOrder.line_items?.length || 1)),
                  total: parseFloat(item.total) || totalAmount
                }))
              }
            }
          });
        }
      }

      await recalculateCustomerMetrics();

      await prisma.storeSetting.update({
        where: { id: setting.id },
        data: { lastSyncedAt: new Date() }
      });

      return {
        mode: 'live_woocommerce',
        customersCount: customersData.length,
        ordersCount: ordersData.length,
        syncedAt: new Date()
      };
    } catch (err: any) {
      console.warn('Real WooCommerce sync failed, falling back to ledger update:', err.message);
    }
  }

  // Fallback demo sync if no WooCommerce credentials or if offline
  await recalculateCustomerMetrics();
  if (setting) {
    await prisma.storeSetting.update({
      where: { id: setting.id },
      data: { lastSyncedAt: new Date() }
    });
  }

  const [cCount, oCount] = await Promise.all([
    prisma.customer.count(),
    prisma.order.count()
  ]);

  return {
    mode: 'ledger_sync',
    customersCount: cCount,
    ordersCount: oCount,
    syncedAt: new Date()
  };
}

export async function recalculateCustomerMetrics() {
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        orderBy: { orderedAt: 'asc' }
      }
    }
  });

  for (const c of customers) {
    const validOrders = c.orders.filter(o => o.status !== 'refunded' && o.status !== 'cancelled');
    const totalOrders = validOrders.length;
    const totalSpend = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 0;
    const firstOrderAt = validOrders[0]?.orderedAt || null;
    const lastOrderAt = validOrders[validOrders.length - 1]?.orderedAt || null;
    const segment = determineSegment(totalOrders, totalSpend, lastOrderAt);

    await prisma.customer.update({
      where: { id: c.id },
      data: {
        totalOrders,
        totalSpend,
        avgOrderValue,
        firstOrderAt,
        lastOrderAt,
        segment
      }
    });
  }
}
