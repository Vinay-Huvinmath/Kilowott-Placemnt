import { WooCustomer, WooOrder, WooOrderItem } from './woocommerce.provider.js';

export interface MappedCustomer {
  wooCustomerId: number;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  createdAt: Date;
}

export interface MappedOrderItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface MappedOrder {
  wooOrderId: number;
  wooCustomerId: number;
  customerFallback: {
    name: string;
    email: string;
    phone: string | null;
    city: string;
  };
  totalAmount: number;
  status: string;
  orderDate: Date;
  items: MappedOrderItem[];
}

export function mapWooCustomer(raw: WooCustomer): MappedCustomer {
  const billing = raw.billing || {};
  const name = [billing.first_name || raw.first_name, billing.last_name || raw.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Store Patron';

  const email = (billing.email || raw.email || `customer_${raw.id}@pulse.local`).toLowerCase().trim();
  const phone = billing.phone || null;
  const city = billing.city || 'Panjim';
  const createdAt = raw.date_created ? new Date(raw.date_created) : new Date();

  return {
    wooCustomerId: raw.id,
    name,
    email,
    phone,
    city,
    createdAt
  };
}

export function mapWooOrder(raw: WooOrder): MappedOrder {
  const billing = raw.billing || {};
  const name = [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() || 'Store Patron';
  const email = (billing.email || `order_${raw.id}@pulse.local`).toLowerCase().trim();
  const phone = billing.phone || null;
  const city = billing.city || 'Panjim';

  const items: MappedOrderItem[] = (raw.line_items || []).map(li => ({
    productName: li.name || 'Artisanal Goods',
    quantity: li.quantity || 1,
    price: typeof li.price === 'number' ? li.price : parseFloat(li.total) / (li.quantity || 1) || 0
  }));

  const wooCustomerId = raw.customer_id && raw.customer_id > 0 ? raw.customer_id : (100000 + raw.id);

  return {
    wooOrderId: raw.id,
    wooCustomerId,
    customerFallback: {
      name,
      email,
      phone,
      city
    },
    totalAmount: parseFloat(raw.total) || items.reduce((s, it) => s + (it.price * it.quantity), 0),
    status: raw.status || 'completed',
    orderDate: raw.date_created ? new Date(raw.date_created) : new Date(),
    items
  };
}
