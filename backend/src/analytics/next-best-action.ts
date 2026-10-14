export interface CustomerActionInput {
  name: string;
  totalSpend: number;
  orderCount: number;
  daysIdle: number;
  segment: string;
  lastProductName?: string;
}

export interface NextBestActionResult {
  headline: string;
  reason: string;
  suggestedAction: string;
  channel: 'whatsapp' | 'email' | 'note';
  discountPercent: number | null;
}

export function nextBestAction(customer: CustomerActionInput): NextBestActionResult {
  const { totalSpend, orderCount, daysIdle, segment } = customer;
  const inrSpend = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalSpend);

  // Case 1: High-spend VIP slipping away (60+ days silence)
  if (totalSpend >= 50000 && daysIdle >= 60) {
    return {
      headline: 'Personal shopkeeper outreach',
      reason: `Spent ₹${inrSpend} across ${orderCount} orders, but silent for ${daysIdle} days.`,
      suggestedAction: 'Send WhatsApp preview of fresh artisan weaves with 10% private voucher',
      channel: 'whatsapp',
      discountPercent: 10
    };
  }

  // Case 2: Active VIP (under 60 days)
  if (totalSpend >= 50000) {
    return {
      headline: 'VIP concierge appreciation',
      reason: `Top patron with ₹${inrSpend} lifetime spend; last ordered ${daysIdle} days ago.`,
      suggestedAction: 'Share advance private catalog before public seasonal launch',
      channel: 'whatsapp',
      discountPercent: null
    };
  }

  // Case 3: At Risk customer (90+ days idle)
  if (daysIdle >= 90) {
    return {
      headline: 'Win-back revival note',
      reason: `No orders for ${daysIdle} days after placing ${orderCount} orders totalling ₹${inrSpend}.`,
      suggestedAction: 'Send revival note with complimentary Goan spice pouch and 15% code',
      channel: 'whatsapp',
      discountPercent: 15
    };
  }

  // Case 4: Loyal regular buyer (5+ orders, recently active)
  if (orderCount >= 5) {
    return {
      headline: 'Loyalty milestone thank-you',
      reason: `Consistent patron with ${orderCount} orders and ₹${inrSpend} total purchases.`,
      suggestedAction: 'Send note of thanks with early access to limited lot goods',
      channel: 'whatsapp',
      discountPercent: 5
    };
  }

  // Case 5: Regular buyer drifting (2 to 4 orders, idle 40+ days)
  if (orderCount >= 2 && daysIdle >= 40) {
    return {
      headline: 'Replenishment check-in',
      reason: `Ordered ${orderCount} times (₹${inrSpend}), but inactive for ${daysIdle} days.`,
      suggestedAction: 'Send restock note for home essentials with a 10% courtesy code',
      channel: 'email',
      discountPercent: 10
    };
  }

  // Case 6: New customer with single order
  return {
    headline: 'First-purchase care follow-up',
    reason: `Single order of ₹${inrSpend} placed ${daysIdle} days ago.`,
    suggestedAction: 'Send artisanal care instructions and second-order courtesy offer',
    channel: 'email',
    discountPercent: 10
  };
}
