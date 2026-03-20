'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    console.log('Register:', { nickname, email, password }); 
    //переход на login
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Регистрация</h1>
          <p className="text-gray-500 text-center mb-8">Создайте аккаунт</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            {/*чтобы рега работала, у меня чот не проходило*/}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-700 font-medium rounded-lg transition-colors"
            >
              Зарегистрироваться
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Уже есть аккаунт?{' '}
              <a href="/login" className="hover:text-green-600 underline">
                Войти
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}