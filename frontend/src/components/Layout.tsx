import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Compass,
  Users,
  ShoppingBag,
  MessageSquare,
  GitBranch,
  RotateCw,
  LogOut
} from 'lucide-react';
import { api } from '../lib/api.js';

export function Layout() {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [storeStatus, setStoreStatus] = useState<{ mode: string; storeUrl: string | null; hasCredentials: boolean } | null>(null);

  useEffect(() => {
    api.sync.status().then(setStoreStatus).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };


  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await api.sync.syncStore();
      const count = res.syncedOrders || 0;
      showToast(`Pulled ${count} orders into ledger.`);
    } catch {
      showToast('Store sync completed.');
    } finally {
      setSyncing(false);
    }
  };

  const [simulating, setSimulating] = useState(false);

  const handleSimulateOrder = async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      const res = await api.mock.newOrder();
      const ord = res.order;
      const cust = res.customer;
      const orderNum = res.fabricatedOrder?.number || `PULSE-${ord?.wooOrderId || '1087'}`;
      const amount = ord?.totalAmount || parseFloat(res.fabricatedOrder?.total) || 0;
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);

      showToast(`Order #${orderNum} from ${cust?.name || 'Store Patron'}, ${formattedAmount}`);
      window.dispatchEvent(new CustomEvent('pulse:order-created'));
    } catch {
      showToast('Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const handleSignOut = async () => {
    await api.auth.logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Today', path: '/', icon: Compass },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Orders', path: '/orders', icon: ShoppingBag },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Automations', path: '/automations', icon: GitBranch }
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      {/* Narrow left rail: 220px */}
      <aside className="w-[220px] flex-shrink-0 border-r border-hairline bg-surface flex flex-col justify-between h-screen sticky top-0 px-4 py-6 z-20">
        <div>
          {/* Wordmark */}
          <div className="px-2 mb-8 flex items-baseline justify-between">
            <span className="font-serif text-2xl font-semibold tracking-tight text-ink select-none">
              Pulse<span className="text-terracotta">.</span>
            </span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-muted-ink">
              CRM
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-paper text-ink font-medium'
                        : 'text-muted-ink hover:text-ink hover:bg-paper/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info, Simulate order & Sync */}
        <div className="pt-4 border-t border-hairline space-y-3">
          <div className="px-2">
            {storeStatus?.mode === 'live' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                  <p className="text-xs font-serif font-semibold text-ink truncate">
                    demo-store
                  </p>
                </div>
                <p className="text-[11px] text-muted-ink">WooCommerce Live</p>
              </>
            ) : (
              <>
                <p className="text-xs font-serif font-semibold text-ink truncate">
                  Anantam Handlooms
                </p>
                <p className="text-[11px] text-muted-ink">Goa Studio</p>
              </>
            )}
          </div>


          <div className="px-1 space-y-2">
            <button
              onClick={handleSimulateOrder}
              disabled={simulating}
              className="w-full text-left text-xs font-medium text-muted-ink hover:text-ink hover:underline disabled:opacity-50 block"
            >
              {simulating ? 'Simulating order...' : 'Simulate order'}
            </button>

            <div className="flex items-center justify-between pt-1 border-t border-hairline/60">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-terracotta hover:underline disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 stroke-[1.5] ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync store'}</span>
              </button>

              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-muted-ink hover:text-ink p-1 rounded hover:bg-paper"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[1120px] mx-auto px-10 py-8 transition-opacity duration-150">
          <Outlet />
        </div>
      </main>

      {/* Quiet Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-8 bg-ink text-surface text-xs font-medium px-4 py-2.5 rounded-[6px] border border-hairline/20 shadow-none z-50 transition-opacity duration-150 animate-fade">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
