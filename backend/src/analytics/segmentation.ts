export type CustomerSegment = 'VIP' | 'At Risk' | 'Loyal' | 'New' | 'Regular';

export interface CustomerOrderStats {
  totalSpend: number;
  orderCount: number;
  lastOrderDate: Date | null;
}

export function computeSegment(stats: CustomerOrderStats): CustomerSegment {
  const { totalSpend, orderCount, lastOrderDate } = stats;

  // 1. VIP if lifetime spend >= 50,000 (check first)
  if (totalSpend >= 50000) {
    return 'VIP';
  }

  // Days since last order
  const now = Date.now();
  const daysIdle = lastOrderDate
    ? Math.max(0, Math.floor((now - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 999;

  // 2. At Risk if days since last order >= 90
  if (daysIdle >= 90) {
    return 'At Risk';
  }

  // 3. Loyal if orders >= 5
  if (orderCount >= 5) {
    return 'Loyal';
  }

  // 4. New if orders <= 1
  if (orderCount <= 1) {
    return 'New';
  }

  // 5. else "Regular"
  return 'Regular';
}
