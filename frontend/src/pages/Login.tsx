import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in | Pulse';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.auth.login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col md:flex-row">
      {/* Left side: Plain paper background with headline and form */}
      <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-20 flex flex-col justify-between border-b md:border-b-0 md:border-r border-hairline">
        <div>
          <div className="mb-12">
            <span className="font-serif text-3xl font-semibold tracking-tight text-ink">
              Pulse<span className="text-terracotta">.</span>
            </span>
          </div>

          <h1 className="font-serif text-4xl lg:text-5xl font-semibold text-ink leading-[1.15] tracking-tight max-w-md mb-8">
            Know who's about to leave before they do.
          </h1>

          <p className="text-sm text-muted-ink mb-10 max-w-sm">
            A small store CRM built for WooCommerce. Plain facts, timely reminders, zero corporate clutter.
          </p>

          <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
            {error && (
              <div className="p-3 bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs rounded-[6px]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-ink mb-1.5">
                Username or email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-hairline rounded-[6px] text-ink focus:outline-none focus:border-ink font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-ink mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-surface border border-hairline rounded-[6px] text-ink focus:outline-none focus:border-ink font-sans"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-ink text-surface text-sm font-medium rounded-[6px] hover:bg-ink/90 transition-colors duration-150 disabled:opacity-50"
              >
                {submitting ? 'Opening...' : 'Open the ledger'}
              </button>
            </div>

            <p className="text-[11px] text-muted-ink text-center pt-2">
              Demo credentials prefilled for evaluation.
            </p>
          </form>
        </div>

        <div className="pt-12 text-xs text-muted-ink">
          Crafted for independent shopkeepers.
        </div>
      </div>

      {/* Right side: Quiet editorial ledger notes */}
      <div className="w-full md:w-1/2 bg-surface p-8 md:p-16 lg:p-20 flex flex-col justify-center">
        <div className="max-w-md space-y-8">
          <div className="border-l-2 border-hairline pl-4 space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted-ink font-mono">01 / Recency</span>
            <p className="text-sm text-ink">
              Track the exact days since each patron's last order. Never let a loyal customer slip away unnoticed.
            </p>
          </div>

          <div className="border-l-2 border-hairline pl-4 space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted-ink font-mono">02 / Health score</span>
            <p className="text-sm text-ink">
              Calculated from four real factors: recency, order frequency, lifetime spend, and engagement.
            </p>
          </div>

          <div className="border-l-2 border-hairline pl-4 space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted-ink font-mono">03 / Direct dispatch</span>
            <p className="text-sm text-ink">
              Send thoughtful WhatsApp or email notes directly from the ledger. Written like a person, not a bot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
