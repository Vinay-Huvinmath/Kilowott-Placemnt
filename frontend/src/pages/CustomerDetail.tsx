import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Send, Check } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { SegmentStamp } from '../components/SegmentStamp.js';
import { Skeleton } from '../components/Skeleton.js';
import { formatINR, formatRelativeTime, formatDate } from '../lib/format.js';
import { Communication, Order } from '../types.js';

interface MergedEvent {
  id: string;
  type: 'order' | 'communication';
  date: Date;
  monthKey: string;
  order?: Order;
  communication?: Communication;
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useApi(
    () => api.customers.get(id || '1'),
    [id]
  );

  React.useEffect(() => {
    if (data?.profile?.name) {
      document.title = `${data.profile.name} | Pulse`;
    } else {
      document.title = 'Customer ledger | Pulse';
    }
  }, [data]);

  // Expanded order IDs in timeline
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Drafting state: 'idle' | 'generating' | 'draft_ready'
  const [draftingState, setDraftingState] = useState<'idle' | 'generating' | 'draft_ready'>('idle');
  const [draftMessage, setDraftMessage] = useState('');
  const [draftChannel, setDraftChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [draftDiscount, setDraftDiscount] = useState<number | null>(null);
  const [sendingDraft, setSendingDraft] = useState(false);

  // Inline note state
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Optimistic local communications
  const [optimisticComms, setOptimisticComms] = useState<Communication[]>([]);
  const [optimisticHealthBoost, setOptimisticHealthBoost] = useState<number>(0);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Combine remote communications with local optimistic ones
  const allCommunications = useMemo(() => {
    if (!data) return [];
    const base = [...data.communications];
    for (const opt of optimisticComms) {
      if (!base.some(c => c.id === opt.id)) {
        base.unshift(opt);
      }
    }
    return base;
  }, [data, optimisticComms]);

  // Build merged timeline grouped by month
  const timelineMonthGroups = useMemo(() => {
    if (!data) return [];

    const events: MergedEvent[] = [];

    // Add orders
    for (const ord of data.orders) {
      const d = new Date(ord.orderDate);
      const monthKey = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      events.push({
        id: `ord-${ord.id}`,
        type: 'order',
        date: d,
        monthKey,
        order: ord
      });
    }

    // Add communications
    for (const comm of allCommunications) {
      const d = new Date(comm.sentAt);
      const monthKey = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      events.push({
        id: `comm-${comm.id}`,
        type: 'communication',
        date: d,
        monthKey,
        communication: comm
      });
    }

    // Sort newest first
    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group by month
    const groupsMap = new Map<string, MergedEvent[]>();
    for (const ev of events) {
      if (!groupsMap.has(ev.monthKey)) {
        groupsMap.set(ev.monthKey, []);
      }
      groupsMap.get(ev.monthKey)!.push(ev);
    }

    return Array.from(groupsMap.entries()).map(([month, items]) => ({
      month,
      items
    }));
  }, [data, allCommunications]);

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="h-96 lg:col-span-8" />
          <Skeleton className="h-96 lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center text-xs text-muted-ink">
        <p>Customer record not found.</p>
        <Link to="/customers" className="text-terracotta hover:underline mt-2 inline-block">
          Return to all customers
        </Link>
      </div>
    );
  }

  const { profile, orders, scoreBreakdown, nextBestAction } = data;

  // Header metric computations
  const avgOrder = profile.orderCount > 0 ? Math.round(profile.totalSpend / profile.orderCount) : 0;
  const firstOrderTimestamp = orders.length > 0
    ? new Date(orders[orders.length - 1].orderDate).getTime()
    : new Date(profile.createdAt).getTime();
  const monthsActive = Math.max(1, (Date.now() - firstOrderTimestamp) / (1000 * 60 * 60 * 24 * 30.4));
  const ordersPerMonth = (profile.orderCount / monthsActive).toFixed(1);
  const sinceFormatted = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric'
  });

  // Health display with optimistic boost
  const baseHealth = scoreBreakdown.score;
  const currentHealth = Math.min(100, baseHealth + optimisticHealthBoost);
  const currentEngagementScore = Math.min(10, scoreBreakdown.breakdown.engagementScore + optimisticHealthBoost);

  // Health label color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-deepgreen';
    if (score >= 60) return 'text-deepgreen';
    if (score >= 40) return 'text-mustard';
    return 'text-terracotta';
  };

  // Handlers for "What to do next"
  const handleWriteMessageClick = async () => {
    if (!id) return;
    setDraftingState('generating');
    try {
      const res = await api.customers.generateMessage(id);
      setDraftMessage(res.message);
      setDraftChannel(res.channel === 'email' ? 'email' : 'whatsapp');
      setDraftDiscount(res.discountPercent || null);
      setDraftingState('draft_ready');
    } catch {
      // Graceful fallback draft
      setDraftMessage(
        `Namaste ${profile.name.split(' ')[0]}. Reaching out from our Panjim studio regarding your recent interest in our handloom goods. Let us know if we can assist with custom sizing.`
      );
      setDraftChannel(nextBestAction.channel === 'email' ? 'email' : 'whatsapp');
      setDraftDiscount(nextBestAction.discountPercent || null);
      setDraftingState('draft_ready');
    }
  };

  const handleSendDraft = async () => {
    if (!id || !draftMessage.trim()) return;
    setSendingDraft(true);

    const tempId = `temp-draft-${Date.now()}`;
    const newComm: Communication = {
      id: tempId,
      customerId: profile.id,
      type: draftChannel,
      subject: nextBestAction.headline,
      message: draftMessage.trim(),
      status: 'sent',
      source: 'manual',
      sentAt: new Date().toISOString()
    };

    // Optimistic update
    setOptimisticComms(prev => [newComm, ...prev]);
    if (scoreBreakdown.breakdown.engagementScore === 0) {
      setOptimisticHealthBoost(10);
    }
    setDraftingState('idle');
    setDraftMessage('');

    try {
      await api.customers.logCommunication(id, {
        type: draftChannel,
        channel: draftChannel,
        subject: nextBestAction.headline,
        message: draftMessage.trim(),
        source: 'manual'
      });
      await refetch();
    } catch {
      // rollback if failed
    } finally {
      setSendingDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    setDraftingState('idle');
    setDraftMessage('');
  };

  // Handler for inline "Add a note"
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteText.trim()) return;
    setSavingNote(true);

    const tempId = `temp-note-${Date.now()}`;
    const newNote: Communication = {
      id: tempId,
      customerId: profile.id,
      type: 'note',
      subject: 'Shopkeeper note',
      message: noteText.trim(),
      status: 'sent',
      source: 'manual',
      sentAt: new Date().toISOString()
    };

    // Optimistic update
    setOptimisticComms(prev => [newNote, ...prev]);
    if (scoreBreakdown.breakdown.engagementScore === 0) {
      setOptimisticHealthBoost(10);
    }
    const textToSave = noteText.trim();
    setNoteText('');

    try {
      await api.customers.logCommunication(id, {
        type: 'note',
        channel: 'note',
        subject: 'Shopkeeper note',
        message: textToSave,
        source: 'manual'
      });
      await refetch();
    } catch {
      // rollback if failed
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-ink hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>All customers</span>
        </Link>
      </div>

      {/* Two Column Layout (65/35) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN (65% ~ col-span-8) */}
        <div className="lg:col-span-8 space-y-10">
          {/* Header */}
          <div className="space-y-5 border-b border-hairline pb-8">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-ink tracking-tight">
                {profile.name}
              </h1>
              <SegmentStamp segment={profile.segment} />
            </div>

            {/* Sub-header meta */}
            <p className="text-xs text-muted-ink font-sans">
              {profile.city || 'Panjim'} · {profile.email} · {profile.phone || '+91 98221 00000'} · Customer since {sinceFormatted}
            </p>

            {/* One-line plain-English summary built from real data */}
            <p className="text-sm text-ink font-medium leading-relaxed font-sans">
              Bought {profile.orderCount} {profile.orderCount === 1 ? 'time' : 'times'}, {formatINR(profile.totalSpend)} in total, last seen {profile.daysIdle !== null ? `${profile.daysIdle} days ago` : 'never'}.
            </p>

            {/* Three small figures: Lifetime value, Average order, Orders per month */}
            <div className="grid grid-cols-3 gap-6 pt-3 border-t border-hairline">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-ink font-medium">
                  Lifetime value
                </p>
                <p className="font-serif text-2xl font-semibold text-ink tabular-nums mt-0.5">
                  {formatINR(profile.totalSpend)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-ink font-medium">
                  Average order
                </p>
                <p className="font-serif text-2xl font-semibold text-ink tabular-nums mt-0.5">
                  {formatINR(avgOrder)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-ink font-medium">
                  Orders per month
                </p>
                <p className="font-serif text-2xl font-semibold text-ink tabular-nums mt-0.5">
                  {ordersPerMonth} <span className="text-xs font-sans text-muted-ink font-normal">/ mo</span>
                </p>
              </div>
            </div>
          </div>

          {/* Merged Timeline Section */}
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink tracking-tight">
                Timeline
              </h2>
              <p className="text-xs text-muted-ink mt-0.5">
                Orders and shop communications in chronological order
              </p>
            </div>

            {timelineMonthGroups.length === 0 && (
              <p className="text-xs text-muted-ink py-8 text-center">
                No orders or messages recorded yet.
              </p>
            )}

            {timelineMonthGroups.map(group => (
              <div key={group.month} className="space-y-4">
                {/* Muted month label */}
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-ink">
                  {group.month}
                </div>

                {/* Vertical timeline items */}
                <div className="relative border-l border-hairline ml-2 pl-6 space-y-6">
                  {group.items.map(ev => {
                    if (ev.type === 'order' && ev.order) {
                      const o = ev.order;
                      const isExpanded = expandedOrders.has(o.id);
                      return (
                        <div key={ev.id} className="relative group">
                          {/* Terracotta dot for orders */}
                          <span className="absolute -left-[30px] top-1.5 w-2.5 h-2.5 rounded-full bg-terracotta border-2 border-paper" />

                          <div className="bg-surface border border-hairline rounded-[6px] p-4 text-xs space-y-2">
                            <div
                              onClick={() => toggleOrderExpand(o.id)}
                              className="flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-ink">
                                  Order #{o.wooOrderId}
                                </span>
                                <span className="text-muted-ink font-sans">
                                  · {formatDate(o.orderDate)} ({formatRelativeTime(o.orderDate)})
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-serif font-semibold text-ink tabular-nums text-sm">
                                  {formatINR(o.totalAmount)}
                                </span>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-paper border border-hairline text-ink">
                                  {o.status}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-muted-ink stroke-[1.5]" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-ink stroke-[1.5]" />
                                )}
                              </div>
                            </div>

                            {/* Inline expandable items */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-hairline space-y-1.5">
                                <p className="text-[10px] uppercase font-mono text-muted-ink tracking-wider">
                                  Purchased items
                                </p>
                                {o.items.map(it => (
                                  <div
                                    key={it.id}
                                    className="flex items-center justify-between text-muted-ink text-[11px]"
                                  >
                                    <span>
                                      {it.quantity}x {it.productName}
                                    </span>
                                    <span className="font-mono tabular-nums text-ink">
                                      {formatINR(it.price * it.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (ev.type === 'communication' && ev.communication) {
                      const comm = ev.communication;
                      return (
                        <div key={ev.id} className="relative">
                          {/* Green dot for messages */}
                          <span className="absolute -left-[30px] top-1.5 w-2.5 h-2.5 rounded-full bg-deepgreen border-2 border-paper" />

                          <div className="bg-surface border border-hairline rounded-[6px] p-4 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-ink uppercase tracking-wider text-[10px]">
                                  {comm.type}
                                </span>
                                <span className="text-muted-ink">
                                  · via {comm.source}
                                </span>
                              </div>
                              <span className="text-muted-ink font-mono text-[10px] tabular-nums">
                                {formatRelativeTime(comm.sentAt)}
                              </span>
                            </div>

                            {comm.subject && (
                              <p className="font-medium text-ink text-xs">
                                {comm.subject}
                              </p>
                            )}

                            <p className="text-muted-ink text-[11px] leading-relaxed font-sans">
                              {comm.message}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN (35% ~ col-span-4, sticky) */}
        <div className="lg:col-span-4 sticky top-6 space-y-6">
          {/* Health Block */}
          <div className="bg-surface border border-hairline rounded-[6px] p-6 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-ink font-medium">
                Relationship health
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`font-serif text-4xl font-semibold tabular-nums ${getHealthColor(currentHealth)}`}>
                  {currentHealth}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-ink">
                  {profile.healthBand}
                </span>
              </div>
            </div>

            {/* Four-row breakdown */}
            <div className="space-y-3 pt-3 border-t border-hairline text-xs">
              {/* Recency */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-muted-ink text-[11px]">
                  <span>Recency (40%)</span>
                  <span className="font-mono tabular-nums text-ink">
                    {scoreBreakdown.breakdown.recencyScore} / 40
                  </span>
                </div>
                <div className="w-full h-1.5 bg-hairline rounded-[2px] overflow-hidden">
                  <div
                    style={{ width: `${(scoreBreakdown.breakdown.recencyScore / 40) * 100}%` }}
                    className="h-full bg-ink"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-muted-ink text-[11px]">
                  <span>Frequency (25%)</span>
                  <span className="font-mono tabular-nums text-ink">
                    {scoreBreakdown.breakdown.frequencyScore} / 25
                  </span>
                </div>
                <div className="w-full h-1.5 bg-hairline rounded-[2px] overflow-hidden">
                  <div
                    style={{ width: `${(scoreBreakdown.breakdown.frequencyScore / 25) * 100}%` }}
                    className="h-full bg-ink"
                  />
                </div>
              </div>

              {/* Spend */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-muted-ink text-[11px]">
                  <span>Spend (25%)</span>
                  <span className="font-mono tabular-nums text-ink">
                    {scoreBreakdown.breakdown.spendScore} / 25
                  </span>
                </div>
                <div className="w-full h-1.5 bg-hairline rounded-[2px] overflow-hidden">
                  <div
                    style={{ width: `${(scoreBreakdown.breakdown.spendScore / 25) * 100}%` }}
                    className="h-full bg-ink"
                  />
                </div>
              </div>

              {/* Engagement */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-muted-ink text-[11px]">
                  <span>Engagement (10%)</span>
                  <span className="font-mono tabular-nums text-ink">
                    {currentEngagementScore} / 10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-hairline rounded-[2px] overflow-hidden">
                  <div
                    style={{ width: `${(currentEngagementScore / 10) * 100}%` }}
                    className="h-full bg-deepgreen"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* "What to do next" panel */}
          <div className="bg-[#EFEAE0] border border-hairline border-l-[3px] border-l-terracotta rounded-[6px] p-5 space-y-3.5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-terracotta font-medium">
                What to do next
              </p>
              <h3 className="font-serif text-base font-semibold text-ink mt-0.5">
                {nextBestAction.headline}
              </h3>
            </div>

            <p className="text-xs text-muted-ink leading-relaxed">
              {nextBestAction.reason}
            </p>

            {/* If idle */}
            {draftingState === 'idle' && (
              <div className="pt-1">
                <button
                  onClick={handleWriteMessageClick}
                  className="py-2 px-4 bg-ink text-surface text-xs font-medium rounded-[4px] hover:bg-ink/90 transition-colors"
                >
                  Write message
                </button>
              </div>
            )}

            {/* While generating: show text "Drafting" with three dots animating, not a spinner */}
            {draftingState === 'generating' && (
              <div className="py-2 text-xs font-medium text-terracotta select-none">
                Drafting
                <span className="inline-block animate-pulse ml-0.5 tracking-widest font-mono font-bold">
                  ...
                </span>
              </div>
            )}

            {/* When draft is ready */}
            {draftingState === 'draft_ready' && (
              <div className="space-y-3 pt-1">
                {/* Channel selector and discount chip */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs">
                    {(['whatsapp', 'email'] as const).map(ch => (
                      <button
                        key={ch}
                        onClick={() => setDraftChannel(ch)}
                        className={`capitalize pb-0.5 transition-colors ${
                          draftChannel === ch
                            ? 'text-ink font-semibold border-b border-ink'
                            : 'text-muted-ink hover:text-ink'
                        }`}
                      >
                        {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </button>
                    ))}
                  </div>

                  {draftDiscount && (
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-hairline rounded text-ink">
                      {draftDiscount}% off · PULSE{draftDiscount}
                    </span>
                  )}
                </div>

                <textarea
                  rows={4}
                  value={draftMessage}
                  onChange={e => setDraftMessage(e.target.value)}
                  className="w-full text-xs bg-surface border border-hairline rounded-[4px] p-2.5 text-ink placeholder:text-muted-ink focus:outline-none focus:border-ink font-sans resize-none leading-relaxed"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendDraft}
                    disabled={sendingDraft || !draftMessage.trim()}
                    className="py-1.5 px-3 bg-ink text-surface text-xs font-medium rounded-[4px] hover:bg-ink/90 transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                  <button
                    onClick={handleDiscardDraft}
                    className="text-xs text-muted-ink hover:text-ink"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Small "Add a note" inline field */}
          <form onSubmit={handleSaveNote} className="bg-surface border border-hairline rounded-[6px] p-5 space-y-3">
            <h4 className="font-serif text-sm font-semibold text-ink">
              Add a note
            </h4>

            <textarea
              rows={2}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Log customer preference, size note, or phone memo..."
              className="w-full text-xs bg-paper/50 border border-hairline rounded-[4px] p-2.5 text-ink placeholder:text-muted-ink focus:outline-none focus:border-ink font-sans resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingNote || !noteText.trim()}
                className="py-1.5 px-3 bg-surface border border-hairline text-ink hover:bg-paper text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : 'Save note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
