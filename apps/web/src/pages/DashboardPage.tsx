import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Link } from 'react-router-dom';
import {
  Mail,
  Users,
  Send,
  Eye,
  MousePointerClick,
  UserX,
  Plus,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

export function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get<any>('/dashboard/overview'),
  });

  const { data: connectionData } = useQuery({
    queryKey: ['google-connection-status'],
    queryFn: () => api.get<{ connection: any }>('/integrations/google/status'),
  });

  const isConnected = connectionData?.connection?.connectionStatus === 'connected';

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Campaigns',
      value: overview?.totalCampaigns ?? 0,
      icon: Mail,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Recipients Processed',
      value: overview?.totalRecipientsProcessed ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Accepted by Gmail',
      value: overview?.totalAcceptedByProvider ?? 0,
      icon: Send,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Detected Opens',
      value: overview?.totalDetectedOpens ?? 0,
      subValue: `${overview?.totalUniqueDetectedOpens ?? 0} unique`,
      icon: Eye,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      note: 'Approximate image load count',
    },
    {
      title: 'Tracked Link Clicks',
      value: overview?.totalTrackedClicks ?? 0,
      icon: MousePointerClick,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Unsubscribes',
      value: overview?.totalUnsubscribes ?? 0,
      icon: UserX,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaign Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time delivery progress and engagement metrics.
          </p>
        </div>
        <Link to="/campaigns/new">
          <Button icon={<Plus className="w-4 h-4" />}>Create Campaign</Button>
        </Link>
      </div>

      {/* Gmail Connection Banner if not configured */}
      {!isConnected && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Gmail Account Not Connected</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Connect your Google account with sending permissions (`gmail.send`) to dispatch campaigns.
              </p>
            </div>
          </div>
          <Link to="/settings/integrations">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 bg-white hover:bg-amber-50">
              Connect Gmail
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{kpi.value.toLocaleString()}</span>
              {kpi.subValue && (
                <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                  {kpi.subValue}
                </span>
              )}
            </div>
            {kpi.note && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400">
                <Info className="w-3 h-3" />
                <span>{kpi.note}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Main Grid: Recent Campaigns & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Recent Campaigns</h3>
            <Link to="/campaigns" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <Card className="p-0 overflow-hidden">
            {overview?.recentCampaigns && overview.recentCampaigns.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.recentCampaigns.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/campaigns/${c.id}`}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors block"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 text-sm">{c.name}</span>
                        <Badge status={c.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{c.subject}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-xs font-semibold text-slate-700">
                        {c.recipientCount} recipients
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No campaigns launched yet</p>
                <p className="text-xs text-slate-500 mt-1">Create your first campaign with merge tags.</p>
                <Link to="/campaigns/new" className="mt-4 inline-block">
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    New Campaign
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Events Feed (1 col) */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Recent Tracking Events</h3>
          <Card className="p-0 overflow-hidden">
            {overview?.recentEvents && overview.recentEvents.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {overview.recentEvents.map((e: any) => (
                  <div key={e.id} className="p-3 text-xs flex items-start gap-2.5">
                    <div className="p-1 rounded bg-slate-100 shrink-0 mt-0.5">
                      {e.eventType === 'open' && <Eye className="w-3.5 h-3.5 text-amber-600" />}
                      {e.eventType === 'click' && <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />}
                      {e.eventType === 'unsubscribe' && <UserX className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 truncate">{e.recipientEmail}</p>
                      <p className="text-slate-500 text-[11px] truncate">{e.campaignName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(e.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No tracking events detected yet. Events will appear here once an email is opened or a link is clicked.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
