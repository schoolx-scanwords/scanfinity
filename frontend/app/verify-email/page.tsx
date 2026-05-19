'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { LAYOUT_STYLES, TEXT_STYLES, COLORS } from '@/app/styles/theme';

type Status = 'loading' | 'success' | 'error' | 'pending';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const verifyUrlParam = searchParams.get('verifyUrl');

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string>('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResult, setResendResult] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setResendResult(null);
      setResendError(null);

      if (!token) {
        if (email) {
          setStatus('pending');
          setMessage(`Мы отправили письмо для подтверждения на ${email}. Откройте письмо и перейдите по ссылке.`);
        } else {
          setStatus('error');
          setMessage('Токен подтверждения или email не найден в ссылке.');
        }
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
  }, [token, email]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendResult(null);
    setResendError(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось отправить письмо.');

      setResendResult('Если аккаунт существует, письмо отправлено повторно.');
    } catch (err: any) {
      setResendError(err?.message || 'Не удалось отправить письмо.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Card className="p-6 w-full max-w-md">
      <h1 className={`${TEXT_STYLES.heading} text-xl mb-2`}>Подтверждение почты</h1>

      {status === 'loading' && (
        <p className={TEXT_STYLES.subheading}>Проверяем ссылку…</p>
      )}

      {status !== 'loading' ? (
        <div
          className={`mt-3 p-3 rounded-2xl ${
            status === 'success' || status === 'pending' ? COLORS.successBg : COLORS.errorBg
          }`}
        >
          <p
            className={
              status === 'success' || status === 'pending' ? COLORS.successText : COLORS.errorText
            }
          >
            {message}
          </p>
        </div>
      ) : null}

      {status === 'pending' ? (
        <div className="mt-4 space-y-3">
          {verifyUrlParam ? (
            <div className={`p-3 rounded-2xl ${COLORS.successBg}`}>
              <p className={COLORS.successText}>
                Заглушка без почты: можно подтвердить по ссылке ниже.
              </p>
              <a
                href={verifyUrlParam}
                className={`mt-2 inline-block underline ${COLORS.successText}`}
                target="_blank"
                rel="noreferrer"
              >
                Открыть ссылку подтверждения
              </a>
            </div>
          ) : null}

          {resendResult ? (
            <div className={`p-3 rounded-2xl ${COLORS.successBg}`}>
              <p className={COLORS.successText}>{resendResult}</p>
            </div>
          ) : null}

          {resendError ? (
            <div className={`p-3 rounded-2xl ${COLORS.errorBg}`}>
              <p className={COLORS.errorText}>{resendError}</p>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleResend} disabled={resendLoading || !email}>
              {resendLoading ? 'Отправляем…' : 'Отправить ещё раз'}
            </Button>
            <Button onClick={() => router.push('/')}>На главную</Button>
          </div>
        </div>
      ) : null}

      {status !== 'pending' ? (
        <div className="mt-6 flex gap-3">
          {status === 'success' ? (
            <Button onClick={() => router.push('/')}>Ко входу</Button>
          ) : (
            <Button onClick={() => router.push('/')}>На главную</Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className={`${LAYOUT_STYLES.container} ${LAYOUT_STYLES.centerFlex}`}>
      <Suspense fallback={
        <Card className="p-6 w-full max-w-md">
           <h1 className={`${TEXT_STYLES.heading} text-xl mb-2`}>Подтверждение почты</h1>
           <p className={TEXT_STYLES.subheading}>Загрузка...</p>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
