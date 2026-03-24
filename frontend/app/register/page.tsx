'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      console.log('Sending register request', { nickname, email });
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: nickname,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        let message: string = 'Не удалось зарегистрироваться. Попробуйте ещё раз.';

        const detail = data?.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          // Ошибка валидации FastAPI/Pydantic: detail = [{ msg, loc, type, ... }, ...]
          const first = detail[0];
          if (first && typeof first === 'object' && 'msg' in first) {
            message = String(first.msg);
          }
        }

        setError(message);
        return;
      }

      // успешная регистрация -> на страницу логина
      router.push('/login');
    } catch (err) {
      setError('Произошла ошибка сети. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Регистрация</h1>
          <p className="text-gray-500 text-center mb-8">Создайте аккаунт</p>

          <div className="space-y-5">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                Имя пользователя
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ваше имя"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-green-500/20 hover:bg-green-500/30 disabled:hover:bg-green-500/20 border border-green-500/50 text-green-700 font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Уже есть аккаунт?{' '}
              <Link href="/login" className="hover:text-green-600 underline">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}