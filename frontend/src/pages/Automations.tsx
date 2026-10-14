import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatRelativeTime } from '../lib/format.js';
import { SkeletonRow } from '../components/Skeleton.js';
import { Workflow } from '../types.js';

const TRIGGER_LABELS: Record<string, string> = {
  order_created: 'order is created',
  order_delivered: 'order is delivered',
  became_at_risk: 'customer becomes at risk'
};

export function Automations() {
  const { data: workflows, loading, refetch } = useApi(() => api.workflows.list(), []);

  React.useEffect(() => {
    document.title = 'Automations | Pulse';
  }, []);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Form fields inside drawer
  const [formName, setFormName] = useState('');
  const [formTrigger, setFormTrigger] = useState('order_created');
  const [formDelayDays, setFormDelayDays] = useState(0);
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openNewDrawer = () => {
    setEditingWorkflow(null);
    setFormName('New store recipe');
    setFormTrigger('order_created');
    setFormDelayDays(0);
    setFormSubject('Notice from Panjim studio');
    setFormMessage('Namaste {{name}}, thank you for your order of {{product}}.');
    setFormActive(true);
    setDrawerOpen(true);
  };

  const openEditDrawer = (wf: Workflow) => {
    setEditingWorkflow(wf);
    setFormName(wf.name);
    setFormTrigger(wf.trigger);
    setFormDelayDays(wf.delayDays);
    setFormSubject(wf.subject);
    setFormMessage(wf.message);
    setFormActive(wf.active);
    setDrawerOpen(true);
  };

  const handleToggle = async (wf: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !wf.active;
    try {
      await api.workflows.update(wf.id, { active: nextState });
      await refetch();
    } catch {
      // quiet handling
    }
  };

  const handleInlineTriggerChange = async (wf: Workflow, newTrigger: string) => {
    try {
      await api.workflows.update(wf.id, { trigger: newTrigger });
      await refetch();
    } catch {
      // quiet handling
    }
  };

  const handleInlineDelayChange = async (wf: Workflow, newDelay: number) => {
    const val = Math.max(0, newDelay);
    try {
      await api.workflows.update(wf.id, { delayDays: val });
      await refetch();
    } catch {
      // quiet handling
    }
  };

  const handleSaveDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formMessage.trim()) return;
    setSaving(true);
    try {
      if (editingWorkflow) {
        await api.workflows.update(editingWorkflow.id, {
          name: formName.trim() || 'Store recipe',
          trigger: formTrigger,
          delayDays: Number(formDelayDays) || 0,
          subject: formSubject.trim(),
          message: formMessage.trim(),
          active: formActive
        });
      } else {
        await api.workflows.create({
          name: formName.trim() || 'Store recipe',
          trigger: formTrigger,
          delayDays: Number(formDelayDays) || 0,
          subject: formSubject.trim(),
          message: formMessage.trim(),
          active: formActive
        });
      }
      setDrawerOpen(false);
      await refetch();
    } catch {
      // quiet handling
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!editingWorkflow) return;
    try {
      await api.workflows.delete(editingWorkflow.id);
      setDrawerOpen(false);
      await refetch();
    } catch {
      // quiet handling
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & New Automation verb button */}
      <div className="border-b border-hairline pb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink tracking-tight">
            Automations
          </h1>
          <p className="text-xs text-muted-ink mt-0.5">
            Store recipes executed on order events and patron inactivity
          </p>
        </div>

        <button
          onClick={openNewDrawer}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-ink text-surface text-xs font-medium rounded-[4px] hover:bg-ink/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>New automation</span>
        </button>
      </div>

      {/* Horizontal Recipe Rows */}
      <div className="space-y-3">
        {loading && (
          <div className="bg-surface border border-hairline rounded-[6px] p-6 space-y-4">
            <SkeletonRow cols={4} />
            <SkeletonRow cols={4} />
            <SkeletonRow cols={4} />
          </div>
        )}

        {!loading && (!workflows || workflows.length === 0) && (
          <div className="bg-surface border border-hairline rounded-[6px] py-12 text-center text-xs text-muted-ink">
            No automations configured yet. Create one with the button above.
          </div>
        )}

        {!loading &&
          workflows &&
          workflows.map(wf => (
            <div
              key={wf.id}
              className="bg-surface border border-hairline rounded-[6px] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-ink/40 transition-colors duration-150"
            >
              {/* Recipe sentence */}
              <div className="flex flex-wrap items-center gap-1.5 font-sans text-ink leading-relaxed">
                <span className="text-muted-ink font-medium">When</span>

                {/* Inline trigger selector */}
                <select
                  value={wf.trigger}
                  onChange={e => handleInlineTriggerChange(wf, e.target.value)}
                  className="bg-paper border border-hairline rounded px-2 py-0.5 text-xs font-medium text-ink focus:outline-none focus:border-ink font-sans cursor-pointer"
                >
                  <option value="order_created">order is created</option>
                  <option value="order_delivered">order is delivered</option>
                  <option value="became_at_risk">customer becomes at risk</option>
                </select>

                <span className="text-muted-ink font-medium">, wait</span>

                {/* Inline delay input */}
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={wf.delayDays}
                  onChange={e => handleInlineDelayChange(wf, parseInt(e.target.value, 10) || 0)}
                  className="w-12 bg-paper border border-hairline rounded px-1.5 py-0.5 text-xs font-mono tabular-nums text-center text-ink focus:outline-none focus:border-ink"
                />

                <span className="text-muted-ink font-medium">
                  {wf.delayDays === 1 ? 'day' : 'days'}, then send
                </span>

                {/* Subject preview that opens drawer */}
                <button
                  onClick={() => openEditDrawer(wf)}
                  className="font-medium text-terracotta underline decoration-terracotta/40 hover:decoration-terracotta cursor-pointer text-left"
                  title="Click to edit message template"
                >
                  "{wf.subject}"
                </button>
                <span className="text-muted-ink font-medium">.</span>
              </div>

              {/* Right side: metadata & toggle */}
              <div className="flex items-center gap-5 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-hairline">
                <div className="text-right text-[11px] text-muted-ink font-mono tabular-nums">
                  <p>
                    {wf.lastRunAt ? `Last ran ${formatRelativeTime(wf.lastRunAt)}` : 'Never ran'}
                  </p>
                  <p className="text-[10px] text-muted-ink">
                    {wf.messagesSent || 0} {(wf.messagesSent || 0) === 1 ? 'message' : 'messages'} sent
                  </p>
                </div>

                {/* Plain switch: green when on */}
                <div
                  onClick={e => handleToggle(wf, e)}
                  title={wf.active ? 'Turn off automation' : 'Turn on automation'}
                  className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-150 select-none flex-shrink-0 ${
                    wf.active ? 'bg-deepgreen' : 'bg-hairline'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-surface transition-transform duration-150 ${
                      wf.active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/20 transition-opacity duration-150">
          <div
            className="w-full max-w-md bg-paper border-l border-hairline h-full flex flex-col justify-between p-6 overflow-y-auto animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-hairline pb-4">
                <h2 className="font-serif text-xl font-semibold text-ink">
                  {editingWorkflow ? 'Edit automation' : 'New automation'}
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-muted-ink hover:text-ink p-1"
                >
                  <X className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>

              <form id="drawerForm" onSubmit={handleSaveDrawer} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-ink font-medium mb-1">
                    Recipe name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface border border-hairline rounded-[4px] text-ink text-xs focus:outline-none focus:border-ink font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-muted-ink font-medium mb-1">
                      Trigger event
                    </label>
                    <select
                      value={formTrigger}
                      onChange={e => setFormTrigger(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-hairline rounded-[4px] text-ink text-xs focus:outline-none focus:border-ink font-sans"
                    >
                      <option value="order_created">order is created</option>
                      <option value="order_delivered">order is delivered</option>
                      <option value="became_at_risk">customer becomes at risk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-muted-ink font-medium mb-1">
                      Delay in days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formDelayDays}
                      onChange={e => setFormDelayDays(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-surface border border-hairline rounded-[4px] text-ink text-xs font-mono tabular-nums focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-ink font-medium mb-1">
                    Message subject
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface border border-hairline rounded-[4px] text-ink text-xs focus:outline-none focus:border-ink font-sans"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[11px] uppercase tracking-wider text-muted-ink font-medium">
                      Message body
                    </label>
                    <span className="text-[10px] text-muted-ink font-mono">
                      Use {'{{name}}'}, {'{{product}}'}
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={formMessage}
                    onChange={e => setFormMessage(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface border border-hairline rounded-[4px] text-ink text-xs focus:outline-none focus:border-ink font-sans resize-none leading-relaxed"
                  />
                </div>

                {/* State toggle inside drawer */}
                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <span className="text-muted-ink">Active automation</span>
                  <div
                    onClick={() => setFormActive(!formActive)}
                    className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-150 ${
                      formActive ? 'bg-deepgreen' : 'bg-hairline'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-surface transition-transform duration-150 ${
                        formActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-6 border-t border-hairline flex items-center justify-between">
              {editingWorkflow ? (
                <button
                  type="button"
                  onClick={handleDeleteWorkflow}
                  className="inline-flex items-center gap-1 text-xs text-terracotta hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                  <span>Delete automation</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-ink hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="drawerForm"
                  disabled={saving}
                  className="px-4 py-1.5 bg-ink text-surface text-xs font-medium rounded-[4px] hover:bg-ink/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save automation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
