'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Ошибка регистрации');
      }

      setSuccess('Регистрация прошла успешно! Теперь вы можете войти.');
      // Небольшая задержка и переход на логин
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить регистрацию');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
          Регистрация
        </h1>
        <p className="text-white/80 mb-8">
          Создайте аккаунт, чтобы играть в Crossword Challenge.
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
              placeholder="Придумайте логин"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f6d5f7]"
              placeholder="Ваш email"
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
              placeholder="Придумайте пароль"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-200 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 rounded-xl px-4 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full group relative px-6 py-3 bg-white rounded-full text-lg font-semibold text-[#667eea] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#f6d5f7] to-[#fbe9d7] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
              {!loading && (
                <span className="text-lg group-hover:translate-x-1 transition-transform">
                  →
                </span>
              )}
            </span>
          </button>
        </form>

        <p className="mt-6 text-xs text-white/60">
          Уже есть аккаунт?{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="underline text-white/80 hover:text-white"
          >
            Войти
          </button>
        </p>
      </div>
    </div>
  );
}
