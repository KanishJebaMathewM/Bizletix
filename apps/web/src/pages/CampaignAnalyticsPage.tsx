import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import {
  Download,
  Eye,
  MousePointerClick,
  Send,
  UserX,
  Info,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export function CampaignAnalyticsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: () => api.get<{ analytics: any }>(`/campaigns/${campaignId}/analytics`),
  });

  const a = analyticsData?.analytics;

  const handleExportCsv = () => {
    window.location.href = `/api/campaigns/${campaignId}/export`;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading campaign analytics...</div>;
  }

  if (!a) {
    return <div className="p-8 text-center text-rose-500">Analytics data could not be loaded.</div>;
  }

  // Delivery status breakdown data for Recharts
  const statusPieData = [
    { name: 'Accepted by Gmail', value: a.acceptedByProviderCount, color: '#10b981' },
    { name: 'Failed Sends', value: a.sendFailedCount, color: '#ef4444' },
    { name: 'Queued / In Flight', value: a.queuedCount + a.sendingCount, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  // Engagement comparison data
  const engagementBarData = [
    { name: 'Unique Opens', count: a.uniqueDetectedOpens, rate: `${a.detectedOpenRatePct}%` },
    { name: 'Unique Clicks', count: a.uniqueTrackedClicks, rate: `${a.trackedClickRatePct}%` },
    { name: 'Opt-Outs', count: a.unsubscribeCount, rate: '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to={`/campaigns/${campaignId}`}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaign
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {a.campaignName} — Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Persisted delivery metrics and recipient engagement signals.
          </p>
        </div>

        <Button size="sm" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCsv}>
          Export Full Report CSV
        </Button>
      </div>

      {/* Honest Tracking Disclosure Banner */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 font-semibold block">About Open & Click Metrics</strong>
          <span>
            Open rates are based on detected requests for a 1×1 pixel image. Privacy proxies (such as Apple Mail Privacy Protection or Google Image Proxy) automatically cache and preload images, which can cause opens to be detected without human interaction. Conversely, image-blocking clients will not trigger an open event.
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Accepted by Gmail</span>
            <Send className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {a.acceptedByProviderCount}
            <span className="text-xs text-slate-400 font-normal ml-1">/ {a.totalRecipients} total</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {a.sendFailedCount > 0 ? `${a.sendFailedCount} failed sends` : 'No sending failures'}
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Detected Open Rate*</span>
            <Eye className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {a.detectedOpenRatePct}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {a.uniqueDetectedOpens} unique ({a.detectedOpenEvents} total pixel loads)
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tracked Click Rate</span>
            <MousePointerClick className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {a.trackedClickRatePct}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {a.uniqueTrackedClicks} unique ({a.trackedClickEvents} total redirects)
          </span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Unsubscribes</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {a.unsubscribeCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Suppressed from future mailings
          </span>
        </Card>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Comparison Bar Chart */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Engagement Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementBarData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} recipients`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Delivery Status Pie Chart */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Delivery Status Breakdown</h3>
          <div className="h-64 flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} recipients`, 'Count']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400">No delivery data yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
