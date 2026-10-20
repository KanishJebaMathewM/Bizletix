import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import {
  BarChart2,
  Download,
  Pause,
  Play,
  XCircle,
  Eye,
  MousePointerClick,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

export function CampaignDetailsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch campaign info
  const { data: campaignData, refetch: refetchCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.get<{ campaign: any }>(`/campaigns/${campaignId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.campaign?.status;
      return status === 'queued' || status === 'sending' ? 3000 : false;
    },
  });

  // Fetch recipients
  const { data: recipientsData, isLoading: isLoadingRecipients } = useQuery({
    queryKey: ['campaign-recipients', campaignId, page, search, statusFilter],
    queryFn: () =>
      api.get<any>(
        `/campaigns/${campaignId}/recipients?page=${page}&limit=25&search=${encodeURIComponent(
          search
        )}${statusFilter ? `&status=${statusFilter}` : ''}`
      ),
    refetchInterval: () => {
      const cStatus = campaignData?.campaign?.status;
      return cStatus === 'queued' || cStatus === 'sending' ? 3000 : false;
    },
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${campaignId}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${campaignId}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${campaignId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
  });

  const campaign = campaignData?.campaign;

  const handleExportCsv = () => {
    window.location.href = `/api/campaigns/${campaignId}/export`;
  };

  if (!campaign) {
    return <div className="p-8 text-center text-slate-400">Loading campaign details...</div>;
  }

  const isSending = campaign.status === 'sending' || campaign.status === 'queued';
  const total = recipientsData?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Title, Status & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
            <Badge status={campaign.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">{campaign.subject}</p>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === 'sending' && (
            <Button
              size="sm"
              variant="outline"
              icon={<Pause className="w-3.5 h-3.5" />}
              isLoading={pauseMutation.isPending}
              onClick={() => pauseMutation.mutate()}
            >
              Pause
            </Button>
          )}

          {campaign.status === 'paused' && (
            <Button
              size="sm"
              variant="outline"
              icon={<Play className="w-3.5 h-3.5" />}
              isLoading={resumeMutation.isPending}
              onClick={() => resumeMutation.mutate()}
            >
              Resume
            </Button>
          )}

          {isSending && (
            <Button
              size="sm"
              variant="danger"
              icon={<XCircle className="w-3.5 h-3.5" />}
              isLoading={cancelMutation.isPending}
              onClick={() => {
                if (confirm('Cancel this campaign? Remaining queued messages will not be sent.')) {
                  cancelMutation.mutate();
                }
              }}
            >
              Cancel
            </Button>
          )}

          <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCsv}>
            Export Report CSV
          </Button>

          <Link to={`/campaigns/${campaignId}/analytics`}>
            <Button size="sm" icon={<BarChart2 className="w-3.5 h-3.5" />}>
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Sending Progress Card if in progress */}
      {isSending && (
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-2">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              Campaign queue is active and processing...
            </span>
            <button onClick={() => refetchCampaign()} className="hover:underline">
              Refresh
            </button>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500 w-1/2 animate-pulse" />
          </div>
        </Card>
      )}

      {/* Filters Toolbar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search recipient email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="accepted_by_provider">Accepted by Gmail</option>
            <option value="send_failed">Failed</option>
          </select>
        </div>
      </Card>

      {/* Recipients Table */}
      <Card className="p-0 overflow-hidden">
        {isLoadingRecipients ? (
          <div className="p-8 text-center text-slate-400">Loading recipients...</div>
        ) : recipientsData?.recipients && recipientsData.recipients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Recipient</th>
                  <th className="px-6 py-3 font-semibold">Delivery Status</th>
                  <th className="px-6 py-3 font-semibold">Gmail Message ID</th>
                  <th className="px-6 py-3 font-semibold">Detected Opens</th>
                  <th className="px-6 py-3 font-semibold">Tracked Clicks</th>
                  <th className="px-6 py-3 font-semibold">Opt-Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipientsData.recipients.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{r.recipientEmail}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Badge status={r.status} />
                        {r.failureMessage && (
                          <span
                            className="text-rose-600 cursor-pointer"
                            title={`${r.failureCode}: ${r.failureMessage}`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                      {r.providerMessageId ? r.providerMessageId.slice(0, 16) + '...' : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      {r.openCount > 0 ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          {r.openCount} {r.openCount === 1 ? 'time' : 'times'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Unopened</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {r.clickCount > 0 ? (
                        <span className="text-indigo-700 font-medium flex items-center gap-1">
                          <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />
                          {r.clickCount} {r.clickCount === 1 ? 'click' : 'clicks'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {r.unsubscribedAt ? (
                        <span className="text-rose-600 font-medium">Unsubscribed</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {recipientsData.recipients.length} of {total} recipients
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="px-2">
                  Page {page} of {recipientsData.totalPages || 1}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= recipientsData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">No recipients found matching filters.</div>
        )}
      </Card>
    </div>
  );
}
