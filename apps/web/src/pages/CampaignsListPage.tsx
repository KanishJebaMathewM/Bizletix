import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Link } from 'react-router-dom';
import {
  Mail,
  Plus,
  ArrowRight,
  BarChart2,
} from 'lucide-react';

export function CampaignsListPage() {
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<{ campaigns: any[] }>('/campaigns'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track active sending queues, monitor detected opens, and review results.
          </p>
        </div>
        <Link to="/campaigns/new">
          <Button icon={<Plus className="w-4 h-4" />}>New Campaign</Button>
        </Link>
      </div>

      {/* Campaigns Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading campaigns...</div>
        ) : campaignsData?.campaigns && campaignsData.campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Campaign Name</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Recipients</th>
                  <th className="px-6 py-3 font-semibold">Accepted by Gmail</th>
                  <th className="px-6 py-3 font-semibold">Detected Opens*</th>
                  <th className="px-6 py-3 font-semibold">Tracked Clicks</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaignsData.campaigns.map((c) => {
                  const openRate =
                    c.sentCount > 0 ? Math.round((c.uniqueOpenCount / c.sentCount) * 100) : 0;
                  const clickRate =
                    c.sentCount > 0 ? Math.round((c.uniqueClickCount / c.sentCount) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/campaigns/${c.id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-700"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.subject}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={c.status} />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{c.totalRecipients}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{c.sentCount}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{c.uniqueOpenCount}</span>
                        <span className="text-xs text-slate-400 ml-1">({openRate}%)</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{c.uniqueClickCount}</span>
                        <span className="text-xs text-slate-400 ml-1">({clickRate}%)</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/campaigns/${c.id}/analytics`}>
                            <Button size="sm" variant="ghost" icon={<BarChart2 className="w-3.5 h-3.5" />}>
                              Analytics
                            </Button>
                          </Link>
                          <Link to={`/campaigns/${c.id}`}>
                            <Button size="sm" variant="outline" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                              Details
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No campaigns launched</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ready to send personalized outreach? Start your first campaign wizard.
            </p>
            <Link to="/campaigns/new" className="mt-4 inline-block">
              <Button size="sm" icon={<Plus className="w-4 h-4" />}>
                Create Campaign
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
