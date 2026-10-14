export interface HealthScoreInput {
  daysSinceLastOrder: number | null;
  ordersInLast90Days: number;
  lifetimeSpend: number;
  hasRecentCommunication: boolean; // communication in last 30 days
}

export interface HealthScoreResult {
  score: number;
  band: 'Healthy' | 'Moderate' | 'Needs attention' | 'At risk';
  breakdown: {
    recencyScore: number;
    frequencyScore: number;
    spendScore: number;
    engagementScore: number;
  };
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const { daysSinceLastOrder, ordersInLast90Days, lifetimeSpend, hasRecentCommunication } = input;

  // 1. Recency 40% (full marks under 15 days, zero at 120+)
  let recencyScore = 0;
  if (daysSinceLastOrder !== null) {
    if (daysSinceLastOrder <= 15) {
      recencyScore = 40;
    } else if (daysSinceLastOrder >= 120) {
      recencyScore = 0;
    } else {
      // Linear scaling between 15 and 120
      const fraction = 1 - (daysSinceLastOrder - 15) / (120 - 15);
      recencyScore = Math.round(fraction * 40);
    }
  }

  // 2. Frequency 25% (orders in last 90 days, capped at 5 orders = 25 pts, 5 pts per order)
  const frequencyScore = Math.min(25, Math.round(ordersInLast90Days * 5));

  // 3. Spend 25% (capped at 60,000 = 25 pts)
  const spendFraction = Math.min(1, Math.max(0, lifetimeSpend / 60000));
  const spendScore = Math.round(spendFraction * 25);

  // 4. Engagement 10% (any communication in last 30 days = 10 pts)
  const engagementScore = hasRecentCommunication ? 10 : 0;

  const totalScore = Math.max(0, Math.min(100, recencyScore + frequencyScore + spendScore + engagementScore));

  let band: 'Healthy' | 'Moderate' | 'Needs attention' | 'At risk';
  if (totalScore >= 80) {
    band = 'Healthy';
  } else if (totalScore >= 60) {
    band = 'Moderate';
  } else if (totalScore >= 40) {
    band = 'Needs attention';
  } else {
    band = 'At risk';
  }

  return {
    score: totalScore,
    band,
    breakdown: {
      recencyScore,
      frequencyScore,
      spendScore,
      engagementScore
    }
  };
}
