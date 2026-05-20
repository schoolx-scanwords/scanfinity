// components/ui/Button.tsx
'use client';

import { BUTTON_STYLES } from '@/app/styles/theme';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function Button({ 
  onClick, 
  children, 
  variant = 'primary', 
  disabled = false,
  loading = false,
  className = ''
}: ButtonProps) {
  const baseStyle = variant === 'primary' ? BUTTON_STYLES.primary : BUTTON_STYLES.secondary;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Загрузка...' : children}
    </button>
  );
}