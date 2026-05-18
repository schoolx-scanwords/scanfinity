'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from './contexts/auth_context';
import { useLanguage } from './contexts/LanguageContext';
import { COLORS, BUTTON_STYLES, TEXT_STYLES, LAYOUT_STYLES } from '@/app/styles/theme';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import Card from './components/ui/Card';
import LanguageSwitcher from './components/LanguageSwitcher';

type ActivePlack = 'authenticated' | 'anonymous';
type AuthState = 'login' | 'register' | 'profile';

const getButtonClass = (isActive: boolean, isAuthenticated: boolean) => {
  const baseClass = `absolute font-bold text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all z-50 hover:scale-105 whitespace-nowrap`;
  const activeClass = isActive ? COLORS.buttonActive : `${COLORS.buttonInactive} ${COLORS.textHover}`;
  return `${baseClass} ${activeClass}`;
};

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

interface GuestUser {
  username: string;
  isAnonymous: boolean;
  guestId: string;
  avatar?: string;
}

const createGuestUser = (): GuestUser => {
  let uniqueId = generateUniqueGuestId();
  const usedIds = getUsedGuestIds();
  
  let attempts = 0;
  while (usedIds.has(uniqueId) && attempts < 10) {
    uniqueId = generateUniqueGuestId();
    attempts++;
  }
  
  if (usedIds.has(uniqueId)) {
    uniqueId = `${uniqueId}_${Date.now()}`;
  }
  
  saveUsedGuestId(uniqueId);
  
  const guestUserData: GuestUser = {
    username: uniqueId,
    isAnonymous: true,
    guestId: uniqueId,
    avatar: undefined
  };
  
  localStorage.setItem('auth_token', 'anonymous');
  localStorage.setItem('auth_user', JSON.stringify(guestUserData));
  sessionStorage.setItem('guest_id', uniqueId);
  
  return guestUserData;
};

export default function UnifiedAuthScreen() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, login, logout } = useAuth();
  const { t } = useLanguage();
  const [activePlack, setActivePlack] = useState<ActivePlack>('anonymous');
  const [authState, setAuthState] = useState<AuthState>('login');
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);
  const [loginResendLoading, setLoginResendLoading] = useState(false);
  const [loginResendMessage, setLoginResendMessage] = useState<string | null>(null);
  
  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regPendingEmail, setRegPendingEmail] = useState<string | null>(null);
  const [regResendLoading, setRegResendLoading] = useState(false);

  const [loginUsernameError, setLoginUsernameError] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState(false);
  const [regUsernameError, setRegUsernameError] = useState(false);
  const [regEmailError, setRegEmailError] = useState(false);
  const [regPasswordError, setRegPasswordError] = useState(false);

  // Load guest user from localStorage
  const loadGuestUser = () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token === 'anonymous' && userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.isAnonymous) {
          setGuestUser({
            username: userData.username,
            isAnonymous: true,
            guestId: userData.guestId || userData.username,
            avatar: userData.avatar
          });
          return true;
        }
      } catch (e) { console.error(e); }
    }
    return false;
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (authUser) {
      setActivePlack('authenticated');
      setAuthState('profile');
      setGuestUser(null);
    } else {
      setActivePlack('anonymous');
      const hasGuest = loadGuestUser();
      if (!hasGuest) {
        const newGuest = createGuestUser();
        setGuestUser(newGuest);
      }
      setAuthState('profile');
    }
    setIsInitialized(true);
  }, [authUser, authLoading]);

  const highlightInput = (setErrorState: (value: boolean) => void) => {
    setErrorState(true);
    setTimeout(() => setErrorState(false), 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginNeedsVerification(false);
    setLoginResendMessage(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail || t('authError');
        if (typeof detail === 'string' && detail.toLowerCase().includes('not verified')) setLoginNeedsVerification(true);
        throw new Error(detail);
      }
      const data = await res.json();
      login(
        {
          id: data.user?.id,
          username: data.user?.username || loginUsername,
          email: data.user?.email || '',
          avatar: data.user?.avatar,
        },
        data.access_token
      );
      setAuthState('profile');
      setGuestUser(null);
    } catch (err: any) {
      setLoginError(err.message || t('invalidCredentials'));
      highlightInput(setLoginUsernameError);
      highlightInput(setLoginPasswordError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginResend = async () => {
    setLoginResendMessage(null);
    setLoginError(null);
    setLoginResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setLoginResendMessage('Если аккаунт существует, письмо отправлено.');
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginResendLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);
    setRegPendingEmail(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || t('registerError'));
      setRegPassword('');
      router.push(`/verify-email?email=${encodeURIComponent(regEmail)}`);
    } catch (err: any) {
      setRegError(err.message);
      highlightInput(setRegUsernameError);
      highlightInput(setRegEmailError);
      highlightInput(setRegPasswordError);
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegisterResend = async () => {
    if (!regPendingEmail) return;
    setRegResendLoading(true);
    setRegError(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regPendingEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setRegSuccess('Если аккаунт существует, письмо отправлено повторно.');
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegResendLoading(false);
    }
  };

  const handleGuestLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('guest_id');
    const newGuest = createGuestUser();
    setGuestUser(newGuest);
  };

  const handleProfile = () => {
    if (authUser) router.push('/profile');
  };

  const handlePlay = () => {
    // If real user is logged in, go to lobby as that user
    if (authUser) {
      router.push('/lobby');
    } 
    // If guest, also go to lobby as guest
    else if (guestUser) {
      router.push('/lobby');
    }
    // Fallback (should never happen)
    else {
      const newGuest = createGuestUser();
      setGuestUser(newGuest);
      router.push('/lobby');
    }
  };

  const handleLeaders = () => console.log('Leaders clicked');

  const handleLogout = () => {
    logout();
    setAuthState('login');
    setLoginUsername('');
    setLoginPassword('');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('guest_id');
    setGuestUser(null);
  };

  const displayUser = authUser;

  if (!isInitialized) {
    return (
      <div className={LAYOUT_STYLES.container}>
        <LanguageSwitcher />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className={TEXT_STYLES.heading}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${LAYOUT_STYLES.container} relative flex flex-col overflow-x-hidden`}>
      <LanguageSwitcher />
      <div className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-10 lg:py-0">
            {/* Left side - GIF */}
            <div className="w-full lg:w-1/3 flex justify-center">
              <div className="relative w-full max-w-[260px] sm:max-w-[340px] lg:max-w-[420px] aspect-square">
                <Image src="/question.gif" alt="question" fill className="object-contain" unoptimized />
              </div>
            </div>

            {/* Right side - Content */}
            <div className="w-full lg:w-2/4 flex flex-col items-center lg:items-start">
            <div className="relative h-24 sm:h-32 w-full max-w-md mb-6 self-center lg:self-start">
              <Image src="/logo_left.svg" alt="Icon" fill className="object-contain object-center lg:object-left" />
            </div>

            <div className="relative w-full max-w-[580px] mx-auto lg:mx-0">
              <div className="relative">
                <div className={`transition-opacity duration-500 ${activePlack === 'authenticated' ? COLORS.activeOpacity : COLORS.inactiveOpacity}`}>
                  <img src="/homepage_plack.svg" alt="Authenticated Plack" className="w-full h-auto" />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-500 ${activePlack === 'anonymous' ? COLORS.activeOpacity : COLORS.inactiveOpacity}`}>
                  <div className="transform scale-x-[-1] w-full h-full">
                    <img src="/homepage_plack.svg" alt="Anonymous Plack" className="w-full h-auto" />
                  </div>
                </div>

                <button
                  onClick={() => setActivePlack('authenticated')}
                  className={getButtonClass(activePlack === 'authenticated', true)}
                  style={{ left: '4%', top: '6%' }}
                >
                  {t('authenticated')}
                </button>
                <button
                  onClick={() => setActivePlack('anonymous')}
                  className={getButtonClass(activePlack === 'anonymous', false)}
                  style={{ right: '4%', top: '6%' }}
                >
                  {t('anonymous')}
                </button>
              </div>

              {/* Authenticated Content */}
              <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'authenticated' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="absolute inset-0 flex flex-col px-[12%] py-[15%]" style={{ paddingTop: '18%', paddingBottom: '15%' }}>
                  {authState === 'profile' && displayUser ? (
                    <Card className="w-full p-3 sm:p-4 md:p-5 -mt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                          {displayUser.avatar ? (
                            <img src={displayUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`${TEXT_STYLES.heading} text-base sm:text-lg md:text-2xl`}>{displayUser.username}</h3>
                          <p className={`${TEXT_STYLES.subheading} text-xs sm:text-base md:text-xl`}>{displayUser.email}</p>
                          <button onClick={handleLogout} className={BUTTON_STYLES.logout}>{t('logout')}</button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <>
                      <h3 className={`${TEXT_STYLES.heading} text-sm sm:text-base md:text-lg text-center -mt-8 mb-2`}>
                        {!showRegister ? t('login') : t('register')}
                      </h3>
                      <div className="w-full">
                        {!showRegister ? (
                          <form onSubmit={handleLogin} className="w-full space-y-2">
                            <button type="button" onClick={() => setShowRegister(true)} className={`w-full ${BUTTON_STYLES.secondary}`}>{t('noAccount')}</button>
                            <Input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder={t('username')} error={loginUsernameError} variant="login" />
                            <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={t('password')} error={loginPasswordError} variant="login" />
                            {loginError && <p className={`text-xs ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-2 py-1 text-center`}>{loginError}</p>}
                            <button type="submit" disabled={loginLoading} className={`w-full ${COLORS.textPrimary} hover:${COLORS.textHover} font-semibold transition-all text-sm py-2`}>{loginLoading ? t('loggingIn') : t('loginBtn')}</button>
                          </form>
                        ) : (
                          <form onSubmit={handleRegister} className="w-full space-y-2">
                            <button type="button" onClick={() => setShowRegister(false)} className={`${BUTTON_STYLES.secondary} text-left w-full`}>{t('backToLogin')}</button>
                            <Input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder={t('username')} error={regUsernameError} variant="register" />
                            <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder={t('email')} error={regEmailError} variant="register" />
                            <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder={t('password')} error={regPasswordError} variant="register" />
                            {regSuccess && <p className={`text-[10px] ${COLORS.successText} ${COLORS.successBg} rounded-lg px-2 py-1 text-center`}>{regSuccess}</p>}
                            {regError && <p className={`text-xs ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-2 py-1 text-center`}>{regError}</p>}
                            {regPendingEmail && (
                              <div className="space-y-2">
                                <button type="button" onClick={handleRegisterResend} disabled={regResendLoading} className={`w-full ${BUTTON_STYLES.secondary}`}>{regResendLoading ? t('sending') : t('resendVerification')}</button>
                                <button type="button" onClick={() => setShowRegister(false)} className={`w-full ${BUTTON_STYLES.secondary}`}>{t('goToLogin')}</button>
                              </div>
                            )}
                            <button type="submit" disabled={regLoading} className={`w-full ${COLORS.textPrimary} hover:${COLORS.textHover} font-semibold transition-all text-sm py-2`}>{regLoading ? t('registering') : t('registerBtn')}</button>
                          </form>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Anonymous Content */}
              <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'anonymous' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="absolute inset-0 flex flex-col px-[12%] py-[15%]" style={{ paddingTop: '18%', paddingBottom: '15%' }}>
                  {guestUser ? (
                    <Card className="w-full p-3 sm:p-4 md:p-5 -mt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                          {guestUser.avatar ? (
                            <img src={guestUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`${TEXT_STYLES.heading} text-base sm:text-lg md:text-2xl`}>
                            {guestUser.username}
                            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">Guest</span>
                          </h3>
                          <p className={`${TEXT_STYLES.subheading} text-xs sm:text-base md:text-xl text-yellow-400/70`}>Guest Player</p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={handleGuestLogout} className={BUTTON_STYLES.logout}>New Guest</button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <div className={TEXT_STYLES.subheading}>Loading guest profile...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Three Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[580px] mt-4 relative z-50 mx-auto lg:mx-0">
              <Button onClick={handleProfile} className="flex-1 py-2 text-xs sm:text-sm">{t('profileBtn')}</Button>
              <Button onClick={handlePlay} className="flex-1 py-2 text-xs sm:text-sm">{t('play')}</Button>
              <Button onClick={handleLeaders} className="flex-1 py-2 text-xs sm:text-sm">{t('leaders')}</Button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-auto pt-6">
        <div className="max-w-7xl mx-auto w-full">
          <div
            aria-hidden="true"
            className="w-full aspect-[1440/688] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/BDFM_2026_05_16_16_27%201.svg')" }}
          />
        </div>
      </div>
    </div>
  );
}