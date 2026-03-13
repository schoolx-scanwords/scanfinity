"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login || !password) {
      toast.error("Введите логин и пароль");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("http://localhost:8000/api/auth/login", {
        username: login,
        password,
      });

      toast.success("Успешный вход");
      // при необходимости можно поменять маршрут
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ?? "Ошибка входа. Проверьте логин и пароль.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-center mb-2">Вход</h1>
            <p className="text-gray-500 text-center mb-8">Введите данные для входа</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="login"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Логин
                </label>
                <input
                  id="login"
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ваш логин"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                className="w-full py-3 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-700 font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Вход..." : "Войти"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </>
  );
}