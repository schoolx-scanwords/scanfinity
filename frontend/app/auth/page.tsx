// app/game/auth/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../contexts/auth_context';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, BUTTON_STYLES, TEXT_STYLES, LAYOUT_STYLES } from '../styles/theme';
import Input from '../components/ui/Input';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { createGuestToken } from '../lib/guest';

// Generate a unique guest ID
const generateUniqueGuestId = (): string => {
  const adjectives = [
    'Happy', 'Sad', 'Sleepy', 'Angry', 'Excited', 'Calm', 'Brave', 'Clever', 
    'Witty', 'Kind', 'Lucky', 'Mighty', 'Swift', 'Bold', 'Bright', 'Dark', 
    'Fierce', 'Gentle', 'Jolly', 'Mystic', 'Noble', 'Quick', 'Royal', 'Smart',
    'Wild', 'Zealous', 'Awesome', 'Cool', 'Epic', 'Funny', 'Great', 'Heroic'
  ];
  
  const nouns = [
    'Fox', 'Wolf', 'Eagle', 'Hawk', 'Lion', 'Tiger', 'Bear', 'Dragon', 
    'Phoenix', 'Raven', 'Falcon', 'Owl', 'Shark', 'Dolphin', 'Panther', 
    'Leopard', 'Cheetah', 'Horse', 'Deer', 'Rabbit', 'Squirrel', 'Otter',
    'Panda', 'Koala', 'Kangaroo', 'Penguin', 'Duck', 'Swan', 'Crow', 'Hawk'
  ];
  
  const numbers = Math.floor(Math.random() * 1000);
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${randomAdjective}${randomNoun}${numbers}`;
};

// Store used guest IDs in localStorage to ensure uniqueness across sessions
const getUsedGuestIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem('used_guest_ids');
  if (stored) {
    try {
      return new Set(JSON.parse(stored));
    } catch {
      return new Set();
    }
  }
  return new Set();
};

const saveUsedGuestId = (id: string) => {
  if (typeof window === 'undefined') return;
  const usedIds = getUsedGuestIds();
  usedIds.add(id);
  localStorage.setItem('used_guest_ids', JSON.stringify(Array.from(usedIds)));
};

export default function GameAuthPage() {
  const router = useRouter();
  const { user: authUser, login, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginUsernameError, setLoginUsernameError] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState(false);

  // Get return URL (where to redirect after auth)
  const getReturnUrl = () => {
    if (typeof window === 'undefined') return '/lobby';
    const params = new URLSearchParams(window.location.search);
    return params.get('return') || '/lobby';
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && authUser) {
      router.push(getReturnUrl());
    }
  }, [authUser, authLoading, router]);

  const highlightInput = (setErrorState: (value: boolean) => void) => {
    setErrorState(true);
    setTimeout(() => {
      setErrorState(false);
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Ошибка авторизации');
      }

      const data = await res.json();
      
      login({
        username: data.user.username || loginUsername,
        email: data.user.email || '',
      }, data.access_token);
      
      // Redirect after successful login
      router.push(getReturnUrl());
      
    } catch (err: any) {
      setLoginError(err.message || 'Не удалось выполнить вход');
      highlightInput(setLoginUsernameError);
      highlightInput(setLoginPasswordError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuestPlay = () => {
    // Generate a unique guest ID
    let uniqueId = generateUniqueGuestId();
    const usedIds = getUsedGuestIds();
    
    // Ensure uniqueness by checking against used IDs
    let attempts = 0;
    while (usedIds.has(uniqueId) && attempts < 10) {
      uniqueId = generateUniqueGuestId();
      attempts++;
    }
    
    // If still not unique after 10 attempts, add timestamp
    if (usedIds.has(uniqueId)) {
      uniqueId = `${uniqueId}_${Date.now()}`;
    }
    
    // Save to used IDs
    saveUsedGuestId(uniqueId);
    
    // Store guest info
    localStorage.setItem('auth_token', createGuestToken(uniqueId));
    localStorage.setItem('auth_user', JSON.stringify({ 
      username: uniqueId,
      isAnonymous: true,
      guestId: uniqueId
    }));
    
    // Also store in session for current session tracking
    sessionStorage.setItem('guest_id', uniqueId);
    
    // Redirect to game/lobby
    router.push(getReturnUrl());
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className={`${LAYOUT_STYLES.container} flex items-center justify-center`}>
        <div className={`${TEXT_STYLES.heading} text-xl`}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={LAYOUT_STYLES.container}>
      <LanguageSwitcher />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen gap-8">

          {/* Right side - Auth Form */}
          <div className="lg:w-1/2 flex flex-col items-center">
            
            {/* Logo */}
            <div className="relative h-32 w-64 mb-8">
              <Image
                src="/logo_left.svg"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>

            {/* Auth Card */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md">
              <h2 className={`${TEXT_STYLES.heading} text-2xl font-bold text-center mb-6`}>
                {t('gameAccess')}
              </h2>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder={t('username')}
                  error={loginUsernameError}
                  variant="login"
                />
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t('password')}
                  error={loginPasswordError}
                  variant="login"
                />
                
                {loginError && (
                  <p className={`text-sm ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-3 py-2 text-center`}>
                    {loginError}
                  </p>
                )}
                
                <button
                  type="submit"
                  disabled={loginLoading}
                  className={`w-full py-3 rounded-xl ${COLORS.buttonBg} ${COLORS.buttonBgHover} ${COLORS.buttonText} font-semibold transition-all text-base ${loginLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loginLoading ? t('loggingIn') : t('loginBtn')}
                </button>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className={`${COLORS.backgroundInput} px-2 ${COLORS.textSecondary}`}>
                    {t('or')}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleGuestPlay}
                className={`w-full py-3 rounded-xl ${BUTTON_STYLES.secondary} border border-white/20 hover:bg-white/10 transition-all text-base`}
              >
                🎮 {t('continueAsGuest')}
              </button>
              
              <p className={`${COLORS.textTertiary} text-xs text-center mt-6`}>
                {t('guestNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}