import React from 'react';

interface SegmentStampProps {
  segment: 'VIP' | 'At Risk' | 'Loyal' | 'New' | 'Regular' | string;
}

export function SegmentStamp({ segment }: SegmentStampProps) {
  let dotClass = 'bg-muted-ink';
  let label = segment;

  switch (segment) {
    case 'VIP':
      dotClass = 'bg-terracotta';
      break;
    case 'Loyal':
      dotClass = 'bg-deepgreen';
      break;
    case 'New':
      dotClass = 'bg-ink';
      break;
    case 'At Risk':
      dotClass = 'bg-mustard';
      break;
    case 'Regular':
    default:
      dotClass = 'bg-muted-ink';
      break;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-ink uppercase font-sans">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />
      <span>{label}</span>
    </span>
  );
}
