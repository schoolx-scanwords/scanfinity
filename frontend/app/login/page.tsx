'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login:', login, password);
    alert('Форма готова!');
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Вход</h1>
          <p className="text-gray-500 text-center mb-8">Введите данные для входа</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1">
                Логин
              </label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
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
              type="submit"
              className="w-full py-3 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-700 font-medium rounded-lg transition-colors"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}