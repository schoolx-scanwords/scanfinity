// app/components/LanguageSwitcher.tsx
'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2 absolute top-4 right-4 z-50">
      <button
        onClick={() => setLanguage('ru')}
        className={`px-2 py-1 text-xs rounded transition-all ${
          language === 'ru' 
            ? 'text-white bg-white/20' 
            : 'text-white/40 hover:text-white/60'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-xs rounded transition-all ${
          language === 'en' 
            ? 'text-white bg-white/20' 
            : 'text-white/40 hover:text-white/60'
        }`}
      >
        EN
      </button>
    </div>
  );
}