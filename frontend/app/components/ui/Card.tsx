// components/ui/Card.tsx
'use client';

import { LAYOUT_STYLES } from '@/app/styles/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`${LAYOUT_STYLES.card} ${className}`}>
      {children}
    </div>
  );
}