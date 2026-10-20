import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (
      confirm(
        'Are you sure you want to permanently delete your account and all associated contacts, campaigns, and logs? This action cannot be undone.'
      )
    ) {
      await api.delete('/settings/account/delete');
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage profile information and account lifecycle.</p>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" /> Account Profile
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500">Name:</span>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">{user?.name || 'Authorized User'}</p>
          </div>
          <div>
            <span className="text-slate-500">Email Address:</span>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">{user?.email}</p>
          </div>
        </div>
      </Card>

      <Card className="border-rose-200 bg-rose-50/20 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-900">Danger Zone: Delete Account</h4>
            <p className="text-xs text-rose-700 mt-1 max-w-lg">
              Permanently delete your user profile, contacts, email templates, campaigns, suppression records, and audit events.
            </p>
          </div>
          <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
