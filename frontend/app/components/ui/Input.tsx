// components/ui/Input.tsx
'use client';

import { INPUT_STYLES } from '@/app/styles/theme';

interface InputProps {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error?: boolean;
  variant?: 'login' | 'register';
  required?: boolean;
}

export default function Input({ 
  type, 
  value, 
  onChange, 
  placeholder, 
  error = false,
  variant = 'login',
  required = true
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className={`${INPUT_STYLES.base} ${INPUT_STYLES[variant]} ${error ? 'border-red-500 ring-2 ring-red-500' : ''}`}
      placeholder={placeholder}
      required={required}
    />
  );
}