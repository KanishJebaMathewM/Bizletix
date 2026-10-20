import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import {
  Link2,
  CheckCircle2,
  Unlink,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export function IntegrationsSettingsPage() {
  const queryClient = useQueryClient();

  const { data: connectionData, isLoading } = useQuery({
    queryKey: ['google-connection-status'],
    queryFn: () => api.get<{ connection: any }>('/integrations/google/status'),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.post('/integrations/google/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection-status'] });
    },
  });

  const connection = connectionData?.connection;
  const isConnected = connection?.connectionStatus === 'connected';

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect your Google Workspace or Gmail account for secure, authorized message dispatch.
        </p>
      </div>

      {/* Gmail Connection Card */}
      <Card className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Gmail API Connection</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorizes Bizletix to send messages directly from your Gmail or Google Workspace inbox.
              </p>
            </div>
          </div>
          {connection && <Badge status={connection.connectionStatus} />}
        </div>

        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-xs">Checking connection status...</div>
        ) : isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected as {connection.email}</span>
              </div>
              <p className="text-xs text-emerald-800">
                Authorized for sending via <code className="bg-white/80 px-1 py-0.5 rounded text-[11px]">gmail.send</code>. OAuth tokens are encrypted at rest with AES-256-GCM.
              </p>
              {connection.expiresAt && (
                <p className="text-[11px] text-emerald-700">
                  Token expires: {new Date(connection.expiresAt).toLocaleString()} (auto-refreshed using refresh token)
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Disconnecting will revoke Google credentials and delete all stored tokens.
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={<Unlink className="w-3.5 h-3.5" />}
                isLoading={disconnectMutation.isPending}
                onClick={() => {
                  if (confirm('Disconnect your Gmail account? You will need to reauthorize before sending future campaigns.')) {
                    disconnectMutation.mutate();
                  }
                }}
              >
                Disconnect Account
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-sm font-semibold text-slate-800">No Active Gmail Connection</p>
              <p className="text-xs text-slate-500 mt-1">
                To launch campaigns, connect an authorized Gmail account. Bizletix requests the minimal permission needed to send emails (<code className="text-emerald-700">gmail.send</code>) and never requests access to read your personal inbox.
              </p>
            </div>
            <Button icon={<ExternalLink className="w-4 h-4" />} onClick={handleConnectGmail}>
              Connect with Google
            </Button>
          </div>
        )}
      </Card>

      {/* Google Cloud Console Setup Guidance */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-500" /> Google Cloud OAuth Setup Guide
        </h3>
        <p className="text-xs text-slate-600">
          When self-hosting Bizletix, configure an OAuth Client ID in your Google Cloud Console:
        </p>
        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans">
          <li>
            Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">Google Cloud Console</a> and create or select a project.
          </li>
          <li>
            Enable the <strong>Gmail API</strong> under <em>APIs & Services &gt; Library</em>.
          </li>
          <li>
            Configure your <strong>OAuth Consent Screen</strong> (set user type to <em>Internal</em> for Google Workspace or <em>External</em> with Test Users added).
          </li>
          <li>
            Create <strong>OAuth 2.0 Client IDs</strong> (Web Application).
          </li>
          <li>
            Add the Authorized Redirect URI:{' '}
            <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-slate-300">
              http://localhost:4000/api/auth/google/callback
            </code>
          </li>
          <li>
            Copy your <code className="bg-white px-1 py-0.5 rounded font-mono">GOOGLE_CLIENT_ID</code> and <code className="bg-white px-1 py-0.5 rounded font-mono">GOOGLE_CLIENT_SECRET</code> to your <code className="bg-white px-1 py-0.5 rounded font-mono">.env</code> file.
          </li>
        </ol>
      </Card>
    </div>
  );
}
