// app/translations.ts
export type Language = 'ru' | 'en';

export const translations = {
  ru: {

    // Auth states
    login: 'Вход в игру',
    register: 'Регистрация',
    profile: 'Профиль',
    
    // Buttons
    loginBtn: 'Войти',
    registerBtn: 'Зарегистрироваться',
    logout: 'Выйти',
    play: 'Играть',
    leaders: 'Лидеры',
    profileBtn: 'Профиль',
    
    // Form labels
    username: 'Логин',
    email: 'Email',
    password: 'Пароль',
    
    // Form links
    noAccount: 'Нет аккаунта? Зарегистрироваться',
    backToLogin: '← Назад к входу',
    
    // Anonymous play
    playAnonymous: 'Играть без регистрации',
    clickToStart: 'Нажмите чтобы начать',
    progressNotSaved: 'Прогресс не сохранится',
    
    // Loading states
    loggingIn: 'Входим...',
    registering: 'Регистрируем...',
    sending: 'Отправляем...',
    
    // Error messages
    authError: 'Ошибка авторизации',
    registerError: 'Ошибка регистрации',
    invalidCredentials: 'Неверное имя пользователя или пароль',
    
    // Success messages
    registerSuccess: 'Регистрация прошла успешно!',
    registerSuccessVerifyEmail: 'Регистрация прошла успешно! Мы отправили письмо для подтверждения почты. Подтвердите почту и затем войдите.',

    // Email verification
    resendVerification: 'Отправить письмо ещё раз',
    goToLogin: 'Перейти ко входу',
    
    // Plack toggles
    authenticated: 'авторизоваться',
    anonymous: 'играть как гость',

    // Game auth page
    gameAccess: 'Доступ к игре',
    or: 'или',
    continueAsGuest: 'Продолжить как гость',
    guestNote: 'Как гость ваш прогресс не будет сохранен',
  },
  en: {
    // Auth states
    login: 'Login',
    register: 'Register',
    profile: 'Profile',
    
    // Buttons
    loginBtn: 'Login',
    registerBtn: 'Register',
    logout: 'Logout',
    play: 'Play',
    leaders: 'Leaders',
    profileBtn: 'Profile',
    
    // Form labels
    username: 'Username',
    email: 'Email',
    password: 'Password',
    
    // Form links
    noAccount: "Don't have an account? Register",
    backToLogin: '← Back to login',
    
    // Anonymous play
    playAnonymous: 'Play without registration',
    clickToStart: 'Click to start',
    progressNotSaved: 'Progress will not be saved',
    
    // Loading states
    loggingIn: 'Logging in...',
    registering: 'Registering...',
    sending: 'Sending...',
    
    // Error messages
    authError: 'Authentication error',
    registerError: 'Registration error',
    invalidCredentials: 'Invalid username or password',
    
    // Success messages
    registerSuccess: 'Registration successful!',
    registerSuccessVerifyEmail: 'Registration successful! We sent a verification email. Confirm your email and then log in.',

    // Email verification
    resendVerification: 'Resend verification email',
    goToLogin: 'Go to login',
    
    // Plack toggles
    authenticated: 'authenticated',
    anonymous: 'anonymous',

    // Game auth page
    gameAccess: 'Game Access',
    or: 'or',
    continueAsGuest: 'Continue as Guest',
    guestNote: 'Your progress will not be saved as a guest',
  },
};

export type TranslationKey = keyof typeof translations.ru;