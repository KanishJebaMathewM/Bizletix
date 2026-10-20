import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Menu, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button.js';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { data: connectionData } = useQuery({
    queryKey: ['google-connection-status'],
    queryFn: () => api.get<{ connection: any }>('/integrations/google/status'),
    staleTime: 30000,
  });

  const isConnected = connectionData?.connection?.connectionStatus === 'connected';

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-slate-500 font-medium">Send thoughtfully. Measure responsibly.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection status badge */}
        <Link
          to="/settings/integrations"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:bg-slate-50"
        >
          {isConnected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-700">Gmail Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-700">Connect Gmail</span>
            </>
          )}
        </Link>

        {/* New Campaign Action */}
        <Link to="/campaigns/new">
          <Button size="sm" icon={<Plus className="w-4 h-4" />}>
            New Campaign
          </Button>
        </Link>
      </div>
    </header>
  );
}
