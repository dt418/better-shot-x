import { useEffect, useState, type ReactNode } from 'react';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

import en from '@/locales/en/common.json';
import vi from '@/locales/vi/common.json';
import zhCN from '@/locales/zh-CN/common.json';

const STORAGE_KEY = 'better-shot-locale';

export async function detectInitialLocale(): Promise<string> {
  try {
    const sys = await invoke<string>('plugin:os|locale');
    if (sys) {
      const lower = sys.toLowerCase();
      if (lower.startsWith('vi')) return 'vi';
      if (lower.startsWith('zh')) return 'zh-CN';
      if (lower.startsWith('en')) return 'en';
    }
  } catch {
    // Tauri unavailable (e.g. in browser test).
  }
  return localStorage.getItem(STORAGE_KEY) ?? navigator.language ?? 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const lng = await detectInitialLocale();
      await i18n.use(initReactI18next).init({
        resources: {
          en: { translation: en },
          vi: { translation: vi },
          'zh-CN': { translation: zhCN },
        },
        lng,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
      });
      i18n.on('languageChanged', (l) => localStorage.setItem(STORAGE_KEY, l));
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-background text-foreground grid min-h-screen place-items-center"
      >
        <span className="text-muted-foreground animate-pulse text-sm">Loading…</span>
      </div>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
