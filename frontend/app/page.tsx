'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from './contexts/auth_context';
import { useLanguage } from './contexts/LanguageContext';
import { COLORS, BUTTON_STYLES, TEXT_STYLES, LAYOUT_STYLES } from '@/app/styles/theme';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import Card from './components/ui/Card';
import LanguageSwitcher from './components/LanguageSwitcher';

type ActivePlack = 'authenticated' | 'anonymous' | null;
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

// Guest user interface
interface GuestUser {
  username: string;
  isAnonymous: boolean;
  guestId: string;
  avatar?: string;
}

export default function UnifiedAuthScreen() {
  const router = useRouter();
  const { user: authUser, login, logout } = useAuth();
  const { t } = useLanguage();
  const [activePlack, setActivePlack] = useState<ActivePlack>('authenticated');
  const [authState, setAuthState] = useState<AuthState>('login');
  const [rightColumnHeight, setRightColumnHeight] = useState(0);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  
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

  // Error highlight states
  const [loginUsernameError, setLoginUsernameError] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState(false);
  const [regUsernameError, setRegUsernameError] = useState(false);
  const [regEmailError, setRegEmailError] = useState(false);
  const [regPasswordError, setRegPasswordError] = useState(false);

  // Check for existing guest session on mount
  useEffect(() => {
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
          setAuthState('profile');
        }
      } catch (e) {
        console.error('Failed to parse guest user data', e);
      }
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      setAuthState('profile');
      setGuestUser(null);
    }
  }, [authUser]);

  const highlightInput = (setErrorState: (value: boolean) => void) => {
    setErrorState(true);
    setTimeout(() => {
      setErrorState(false);
    }, 1000);
  };

  useEffect(() => {
    const updateHeight = () => {
      if (rightColumnRef.current) {
        setRightColumnHeight(rightColumnRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    setTimeout(updateHeight, 100);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

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
        if (typeof detail === 'string' && detail.toLowerCase().includes('not verified')) {
          setLoginNeedsVerification(true);
        }
        throw new Error(detail);
      }

      const data = await res.json();
      
      login({
        username: data.user.username || loginUsername,
        email: data.user.email || '',
      }, data.access_token);
      
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Не удалось отправить письмо');
      }

      setLoginResendMessage('Если аккаунт существует, письмо отправлено.');
    } catch (err: any) {
      setLoginError(err.message || 'Не удалось отправить письмо');
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || t('registerError'));
      }

      // Email verification is required before login.
      // Show a success message and let the user confirm via email first.
      setRegPendingEmail(regEmail);
      setRegSuccess(t('registerSuccessVerifyEmail'));
      setRegPassword('');
      
    } catch (err: any) {
      setRegError(err.message || t('registerError'));
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Не удалось отправить письмо');
      }

      setRegSuccess('Если аккаунт существует, письмо отправлено повторно.');
    } catch (err: any) {
      setRegError(err.message || 'Не удалось отправить письмо');
    } finally {
      setRegResendLoading(false);
    }
  };

  const handleAnonymousPlay = () => {
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
    
    // Create guest user object
    const guestUserData: GuestUser = {
      username: uniqueId,
      isAnonymous: true,
      guestId: uniqueId,
      avatar: undefined
    };
    
    // Store guest info
    localStorage.setItem('auth_token', 'anonymous');
    localStorage.setItem('auth_user', JSON.stringify(guestUserData));
    
    // Also store in session for current session tracking
    sessionStorage.setItem('guest_id', uniqueId);
    
    // Set guest user state
    setGuestUser(guestUserData);
    setAuthState('profile');
    
    // Navigate to lobby after a short delay to show profile
    setTimeout(() => {
      router.push('/lobby');
    }, 1500);
  };

  const handleGuestLogout = () => {
    // Clear guest session
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('guest_id');
    setGuestUser(null);
    setAuthState('login');
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const handlePlay = () => {
    router.push('/lobby');
  };

  const handleLeaders = () => {
    console.log('Leaders clicked');
  };

  const handleLogout = () => {
    logout();
    setAuthState('login');
    setGuestUser(null);
    setLoginUsername('');
    setLoginPassword('');
  };

  // Determine which user to display in profile
  const displayUser = authUser || guestUser;

  return (
    <div className={LAYOUT_STYLES.container}>
      <LanguageSwitcher />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen gap-8">
          
          {/* Left side - GIF */}
          <div className="lg:w-1/3 flex justify-center">
            {rightColumnHeight > 0 && (
              <div 
                className="relative"
                style={{ width: `${rightColumnHeight}px`, height: `${rightColumnHeight}px` }}
              >
                <Image
                  src="/question.gif"
                  alt="question"
                  fill
                  className="object-contain"
                  unoptimized 
                />
              </div>
            )}
          </div>

          {/* Right side - Content */}
          <div ref={rightColumnRef} className="lg:w-2/4 flex flex-col items-start">
            
            {/* Logo */}
            <div className="relative h-32 w-full max-w-md mb-6 self-start">
              <Image
                src="/logo_left.svg"
                alt="Icon"
                fill
                className="object-contain object-left"
              />
            </div>

            {/* Container with placks */}
            <div className="relative w-full max-w-[580px]">
              
              {/* SVGs */}
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
                  onClick={() => setActivePlack(activePlack === 'authenticated' ? null : 'authenticated')}
                  className={getButtonClass(activePlack === 'authenticated', true)}
                  style={{ left: '4%', top: '6%' }}
                >
                  {t('authenticated')}
                </button>

                <button
                  onClick={() => setActivePlack(activePlack === 'anonymous' ? null : 'anonymous')}
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
                    <Card className="w-[calc(100%+40px)] -mx-5 p-3 sm:p-4 md:p-5 -mt-6">
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
                          <h3 className={`${TEXT_STYLES.heading} text-base sm:text-lg md:text-2xl`}>
                            {displayUser.username}
                            {guestUser && (
                              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">
                                Guest
                              </span>
                            )}
                          </h3>
                          {!guestUser && authUser && (
                            <p className={`${TEXT_STYLES.subheading} text-xs sm:text-base md:text-xl`}>
                              {authUser.email}
                            </p>
                          )}
                          {guestUser && (
                            <p className={`${TEXT_STYLES.subheading} text-xs sm:text-base md:text-xl text-yellow-400/70`}>
                              Guest Player
                            </p>
                          )}
                          <button
                            onClick={guestUser ? handleGuestLogout : handleLogout}
                            className={BUTTON_STYLES.logout}
                          >
                            {guestUser ? 'Exit Guest Mode' : t('logout')}
                          </button>
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
                            <button
                              type="button"
                              onClick={() => setShowRegister(true)}
                              className={`w-full ${BUTTON_STYLES.secondary}`}
                            >
                              {t('noAccount')}
                            </button>
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
                              <p className={`text-xs ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-2 py-1 text-center`}>
                                {loginError}
                              </p>
                            )}
                            <button
                              type="submit"
                              disabled={loginLoading}
                              className={`w-full ${COLORS.textPrimary} hover:${COLORS.textHover} font-semibold transition-all text-sm py-2 ${loginLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {loginLoading ? t('loggingIn') : t('loginBtn')}
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleRegister} className="w-full space-y-2">
                            <button
                              type="button"
                              onClick={() => setShowRegister(false)}
                              className={`${BUTTON_STYLES.secondary} text-left w-full`}
                            >
                              {t('backToLogin')}
                            </button>
                            <Input
                              type="text"
                              value={regUsername}
                              onChange={(e) => setRegUsername(e.target.value)}
                              placeholder={t('username')}
                              error={regUsernameError}
                              variant="register"
                            />
                            <Input
                              type="email"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              placeholder={t('email')}
                              error={regEmailError}
                              variant="register"
                            />
                            <Input
                              type="password"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder={t('password')}
                              error={regPasswordError}
                              variant="register"
                            />
                            {regSuccess && (
                              <p className={`text-[10px] ${COLORS.successText} ${COLORS.successBg} rounded-lg px-2 py-1 text-center`}>
                                {regSuccess}
                              </p>
                            )}
                            {regError && (
                              <p className={`text-xs ${COLORS.errorText} ${COLORS.errorBg} rounded-lg px-2 py-1 text-center`}>
                                {regError}
                              </p>
                            )}
                              {regPendingEmail && (
                                <div className="space-y-2">
                                  <button
                                    type="button"
                                    onClick={handleRegisterResend}
                                    disabled={regResendLoading}
                                    className={`w-full ${BUTTON_STYLES.secondary} ${regResendLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {regResendLoading ? t('sending') : t('resendVerification')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowRegister(false)}
                                    className={`w-full ${BUTTON_STYLES.secondary}`}
                                  >
                                    {t('goToLogin')}
                                  </button>
                                </div>
                              )}
                            <button
                              type="submit"
                              disabled={regLoading}
                              className={`w-full ${COLORS.textPrimary} hover:${COLORS.textHover} font-semibold transition-all text-sm py-2 ${regLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {regLoading ? t('registering') : t('registerBtn')}
                            </button>
                          </form>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Anonymous Content */}
              <div className={`absolute inset-0 transition-all duration-500 ${activePlack === 'anonymous' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center px-[12%] py-[15%]" style={{ paddingTop: '28%', paddingBottom: '20%' }}>
                  <div 
                    onClick={handleAnonymousPlay}
                    className="text-center space-y-2 cursor-pointer hover:scale-105 transition-transform w-full"
                  >
                    <div className="text-3xl sm:text-4xl">🎮</div>
                    <h3 className={`${TEXT_STYLES.heading} text-sm`}>{t('playAnonymous')}</h3>
                    <p className={`${TEXT_STYLES.subheading} text-[10px]`}>
                      {t('clickToStart')}
                    </p>
                    <div className={`${COLORS.textTertiary} text-[8px]`}>
                      {t('progressNotSaved')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Three Buttons */}
            <div className="flex gap-3 w-full max-w-[580px] mt-4 relative z-50">
              <Button onClick={handleProfile} className="flex-1 py-2 text-xs sm:text-sm">
                {t('profileBtn')}
              </Button>
              <Button onClick={handlePlay} className="flex-1 py-2 text-xs sm:text-sm">
                {t('play')}
              </Button>
              <Button onClick={handleLeaders} className="flex-1 py-2 text-xs sm:text-sm">
                {t('leaders')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}