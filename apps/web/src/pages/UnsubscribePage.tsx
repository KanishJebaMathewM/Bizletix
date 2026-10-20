import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { CheckCircle2, AlertCircle, MailX } from 'lucide-react';

export function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<{ email: string; campaignName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid unsubscribe link');
      setLoading(false);
      return;
    }

    api
      .get<{ email: string; campaignName: string }>(`/unsubscribe/${token}`)
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired unsubscribe link');
        setLoading(false);
      });
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      await api.post(`/unsubscribe/${token}`, { reason: reason || undefined });
      setUnsubscribed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process unsubscribe request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="text-center p-8 space-y-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
            <MailX className="w-6 h-6" />
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Verifying unsubscribe link...</p>
          ) : error ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-semibold text-base">Link Expired or Invalid</h3>
              </div>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          ) : unsubscribed ? (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Unsubscribe Confirmed</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                <strong>{details?.email}</strong> has been added to our suppression list. You will not receive any further emails from this sender.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div className="text-center">
                <h3 className="font-bold text-lg text-slate-900">Confirm Unsubscribe</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are opting out of communications from <strong>{details?.campaignName}</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500">Recipient Email:</span>{' '}
                <strong className="text-slate-900">{details?.email}</strong>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for unsubscribing (Optional):
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  placeholder="Too frequent, no longer interested, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <Button className="w-full" variant="danger" isLoading={submitting} onClick={handleConfirm}>
                Unsubscribe {details?.email}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
