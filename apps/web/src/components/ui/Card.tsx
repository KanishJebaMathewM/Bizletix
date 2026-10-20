import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
