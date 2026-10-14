export interface WooCustomerBilling {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state?: string;
  country?: string;
}

export interface WooCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  billing: WooCustomerBilling;
  date_created: string;
}

export interface WooOrderItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  total: string;
}

export interface WooOrder {
  id: number;
  number: string;
  customer_id: number;
  status: string; // 'pending' | 'processing' | 'completed' | 'refunded'
  total: string;
  date_created: string;
  billing: WooCustomerBilling;
  line_items: WooOrderItem[];
}

export interface WooCommerceProvider {
  getCustomers(): Promise<WooCustomer[]>;
  getOrders(): Promise<WooOrder[]>;
}
