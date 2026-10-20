import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import {
  ShieldCheck,
  Download,
  Trash2,
  Plus,
  UserX,
} from 'lucide-react';

export function PrivacySettingsPage() {
  const queryClient = useQueryClient();
  const [isAddSuppressionOpen, setIsAddSuppressionOpen] = useState(false);
  const [suppressEmail, setSuppressEmail] = useState('');
  const [suppressReason, setSuppressReason] = useState<'manual' | 'unsubscribed' | 'bounced'>('manual');
  const [page] = useState(1);

  // Fetch suppressions
  const { data: suppressionsData, isLoading } = useQuery({
    queryKey: ['suppressions', page],
    queryFn: () => api.get<any>(`/suppressions?page=${page}&limit=20`),
  });

  // Add suppression mutation
  const addMutation = useMutation({
    mutationFn: () =>
      api.post('/suppressions', {
        email: suppressEmail,
        reason: suppressReason,
      }),
    onSuccess: () => {
      setIsAddSuppressionOpen(false);
      setSuppressEmail('');
      queryClient.invalidateQueries({ queryKey: ['suppressions'] });
    },
  });

  // Remove suppression mutation
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppressions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppressions'] });
    },
  });

  const handleExportData = () => {
    window.location.href = '/api/settings/privacy/export';
  };

  const handleExportSuppressions = () => {
    window.location.href = '/api/suppressions/export';
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Privacy & Retention</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure audience consent controls, global suppression rules, and audit exports.
        </p>
      </div>

      {/* Privacy Principles Card */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Responsible Tracking Policy
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Bizletix adheres to strict privacy-first engineering standards:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block">No Fingerprinting</strong>
            <span className="text-slate-500 mt-0.5 block">
              We do not collect full IP addresses, hardware UUIDs, or audio/canvas fingerprints from recipients.
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block">Approximate Open Signals</strong>
            <span className="text-slate-500 mt-0.5 block">
              Open events indicate image loads. We never label a pixel request as guaranteed human reading.
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block">High-Entropy Tokens</strong>
            <span className="text-slate-500 mt-0.5 block">
              Tracking and unsubscribe URLs use cryptographically random 256-bit tokens, hashed at rest.
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block">Universal Suppression Enforcement</strong>
            <span className="text-slate-500 mt-0.5 block">
              Opted-out addresses are strictly barred from campaign dispatches across all lists.
            </span>
          </div>
        </div>
      </Card>

      {/* Suppression List Management */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-600" /> Global Suppression List
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recipients on this list are permanently excluded from all future campaign dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportSuppressions}>
              Export Suppressions CSV
            </Button>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsAddSuppressionOpen(true)}>
              Add Suppression
            </Button>
          </div>
        </div>

        {/* Suppressions Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading suppressions...</div>
          ) : suppressionsData?.items && suppressionsData.items.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Reason</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold">Added Date</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppressionsData.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{item.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge status={item.reason} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 capitalize">{item.source.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Remove suppression for ${item.email}?`)) {
                            removeMutation.mutate(item.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove suppression"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No suppressed emails recorded yet.
            </div>
          )}
        </div>
      </Card>

      {/* Data Export Card */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Export All Account Data</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Download a complete JSON export of your contacts, campaigns, suppression records, and audit logs.
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportData}>
          Export JSON
        </Button>
      </Card>

      {/* Add Suppression Modal */}
      <Modal
        isOpen={isAddSuppressionOpen}
        onClose={() => setIsAddSuppressionOpen(false)}
        title="Add to Global Suppression List"
        description="Prevent future messages from being sent to this recipient."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="space-y-3"
        >
          <Input
            label="Email Address *"
            type="email"
            required
            placeholder="recipient@example.com"
            value={suppressEmail}
            onChange={(e) => setSuppressEmail(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
            <select
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              value={suppressReason}
              onChange={(e) => setSuppressReason(e.target.value as any)}
            >
              <option value="manual">Manual administrative exclusion</option>
              <option value="unsubscribed">Recipient opted out</option>
              <option value="bounced">Undeliverable / Bounced address</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddSuppressionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={addMutation.isPending}>
              Add Suppression
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
