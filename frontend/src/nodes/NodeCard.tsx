import type { ReactNode } from 'react';
import { hexAlpha } from '@/utils/ui';

export function cardWidth(title: string) { return Math.min(360, Math.max(228, title.length * 7 + 90)); }

/** Shared visual shell for configuration operators and their data-flow instances. */
export function NodeCard({ title, category, color, icon, status, children, footer, className = '' }: {
  title: string; category: string; color: string; icon: ReactNode; status?: ReactNode;
  children?: ReactNode; footer?: ReactNode; className?: string;
}) {
  return <div className={`lego-node ${className}`} style={{ width: cardWidth(title) }}>
    <div className="flex items-start gap-2 rounded-t-xl px-3 py-2.5 border-b" style={{ background: hexAlpha(color, .09), borderColor: hexAlpha(color, .18) }}>
      <div className="icon-tile shrink-0" style={{ background: color }}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="node-card-title font-semibold text-[12.5px] leading-snug">{title}</div>
        <div className="text-[9.5px] uppercase tracking-wide mt-0.5 break-words" style={{ color }}>{category.replace(/_/g, ' ')}</div>
      </div>
      {status && <div className="flex shrink-0 items-center gap-1 pt-0.5">{status}</div>}
    </div>
    <div className="px-3 py-2 text-[10px] leading-snug text-muted node-card-body">{children}</div>
    {footer}
  </div>;
}
