'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/auth_context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail || 'Ошибка авторизации';
        if (typeof detail === 'string' && detail.toLowerCase().includes('not verified')) {
          setNeedsVerification(true);
        }
        throw new Error(detail);
      }

      const data = await res.json();
      login(
        {
          id: data.user?.id,
          username: data.user?.username || username,
          email: data.user?.email || '',
          avatar: data.user?.avatar,
        },
        data.access_token
      );

      router.push('/lobby');
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMessage(null);
    setError(null);
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Не удалось отправить письмо');
      }

      setResendMessage('Если аккаунт существует, письмо отправлено.');
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить письмо');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
          Вход в игру
        </h1>
        <p className="text-white/80 mb-8">
          Введите логин и пароль, чтобы начать играть в кроссворд.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f6d5f7]"
              placeholder="Введите логин"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fbe9d7]"
              placeholder="Введите пароль"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-200 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          {needsVerification && (
            <div className="space-y-3">
              <p className="text-xs text-white/70">
                Похоже, почта не подтверждена. Введите email, чтобы отправить письмо ещё раз.
              </p>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f6d5f7]"
                  placeholder="Введите email"
                  required
                />
              </div>

              {resendMessage && (
                <p className="text-xs text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 rounded-xl px-4 py-2">
                  {resendMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || !email}
                className="w-full px-6 py-3 bg-white/20 rounded-full text-sm font-semibold text-white transition-all duration-300 hover:bg-white/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {resendLoading ? 'Отправляем...' : 'Отправить письмо ещё раз'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full group relative px-6 py-3 bg-white rounded-full text-lg font-semibold text-[#667eea] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? 'Входим...' : 'Войти и играть'}
              {!loading && (
                <span className="text-lg group-hover:translate-x-1 transition-transform">
                  →
                </span>
              )}
            </span>
          </button>
        </form>

        <p className="mt-6 text-xs text-white/60">
          Нет аккаунта?{' '}
          <button
            type="button"
            onClick={() => router.push('/register')}
            className="underline text-white/80 hover:text-white"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  );
}
