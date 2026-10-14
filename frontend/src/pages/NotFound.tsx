import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  useEffect(() => {
    document.title = 'Page not found | Pulse';
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="font-serif text-3xl font-semibold tracking-tight text-ink">
          Pulse<span className="text-terracotta">.</span>
        </span>

        <h1 className="font-serif text-3xl font-semibold text-ink tracking-tight pt-4">
          That page isn't in the ledger.
        </h1>

        <p className="text-xs text-muted-ink">
          The link you followed does not exist in store records.
        </p>

        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex py-2 px-4 bg-ink text-surface text-xs font-medium rounded-[4px] hover:bg-ink/90 transition-colors"
          >
            Return to Today
          </Link>
        </div>
      </div>
    </div>
  );
}
