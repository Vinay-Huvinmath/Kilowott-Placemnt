export interface CustomerSummary {
  id: string;
  wooCustomerId: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  segment: 'VIP' | 'At Risk' | 'Loyal' | 'New' | 'Regular';
  healthScore: number;
  createdAt: string;
  totalSpend: number;
  orderCount: number;
  lastOrderDate: string | null;
  daysIdle: number | null;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  wooOrderId: number;
  totalAmount: number;
  status: string;
  orderDate: string;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    city: string | null;
    segment: string;
  };
  items: OrderItem[];
}

export interface Communication {
  id: string;
  customerId: string;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  source: string;
  sentAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    city: string | null;
    segment: string;
  };
}

export interface NextBestAction {
  headline: string;
  reason: string;
  suggestedAction: string;
  channel: 'whatsapp' | 'email' | 'note';
  discountPercent: number | null;
}

export interface CustomerDetail {
  profile: CustomerSummary & { healthBand: string };
  orders: Order[];
  communications: Communication[];
  scoreBreakdown: {
    score: number;
    band: string;
    breakdown: {
      recencyScore: number;
      frequencyScore: number;
      spendScore: number;
      engagementScore: number;
    };
  };
  nextBestAction: NextBestAction;
}

export interface DashboardData {
  revenue: number;
  customers: number;
  orders: number;
  avgOrderValue: number;
  segmentCounts: {
    VIP: number;
    'At Risk': number;
    Loyal: number;
    New: number;
    Regular: number;
  };
  revenueSeries: Array<{
    label: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    productName: string;
    revenue: number;
    quantity: number;
  }>;
  atRiskList: Array<{
    id: string;
    wooCustomerId: number;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    totalSpend: number;
    orderCount: number;
    daysIdle: number;
    lastOrderDate: string | null;
    healthScore: number;
  }>;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  delayDays: number;
  subject: string;
  message: string;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string;
  messagesSent?: number;
  _count?: { jobs: number };
}
