import React from 'react';

export interface BadgeProps {
  status: string;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ status, className = '', children }: BadgeProps) {
  const normalized = status.toLowerCase();

  const styles: Record<string, string> = {
    // Campaign statuses
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
    queued: 'bg-amber-50 text-amber-700 border-amber-200',
    sending: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
    paused: 'bg-orange-50 text-orange-700 border-orange-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',

    // Recipient statuses
    accepted_by_provider: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    send_failed: 'bg-rose-50 text-rose-700 border-rose-200',
    delivery_confirmed: 'bg-teal-50 text-teal-700 border-teal-200',
    delivery_unknown: 'bg-slate-100 text-slate-600 border-slate-200',
    bounced: 'bg-red-50 text-red-700 border-red-200',

    // Generic
    connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-amber-50 text-amber-700 border-amber-200',
    revoked: 'bg-rose-50 text-rose-700 border-rose-200',
    unsubscribed: 'bg-slate-100 text-slate-600 border-slate-200',
    manual: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const style = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = children || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${style} ${className}`}
    >
      {label}
    </span>
  );
}
