'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { LAYOUT_STYLES, TEXT_STYLES, COLORS } from '@/app/styles/theme';

type Status = 'loading' | 'success' | 'error';

function getTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string>('');

  const token = useMemo(() => getTokenFromLocation(), []);

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus('error');
        setMessage('Токен подтверждения не найден в ссылке.');
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus('error');
          setMessage(data?.detail || 'Не удалось подтвердить почту.');
          return;
        }

        setStatus('success');
        setMessage('Почта подтверждена. Теперь можно войти.');
      } catch {
        setStatus('error');
        setMessage('Ошибка сети. Попробуйте ещё раз.');
      }
    }

    run();
  }, [token]);

  return (
    <div className={`${LAYOUT_STYLES.container} ${LAYOUT_STYLES.centerFlex}`}>
      <Card className="p-6 w-full max-w-md">
        <h1 className={`${TEXT_STYLES.heading} text-xl mb-2`}>Подтверждение почты</h1>

        {status === 'loading' && (
          <p className={TEXT_STYLES.subheading}>Проверяем ссылку…</p>
        )}

        {status !== 'loading' && (
          <div className={`mt-3 p-3 rounded-2xl ${status === 'success' ? COLORS.successBg : COLORS.errorBg}`}>
            <p className={status === 'success' ? COLORS.successText : COLORS.errorText}>{message}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {status === 'success' ? (
            <Button onClick={() => router.push('/')}>Ко входу</Button>
          ) : (
            <Button onClick={() => router.push('/')}>На главную</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
