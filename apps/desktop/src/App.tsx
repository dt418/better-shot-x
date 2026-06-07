import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';

type Health = { status: 'ok' | 'error'; message: string };

async function checkHealth(): Promise<Health> {
  try {
    const pong = await invoke<string>('ping');
    return { status: pong === 'pong' ? 'ok' : 'error', message: pong };
  } catch (e) {
    return { status: 'error', message: String(e) };
  }
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    void checkHealth().then(setHealth);
    const unlisten = listen('shortcut://region-capture', () => {
      // Capture trigger — wired up in Milestone 1.
      console.info('region capture shortcut fired');
    });
    return () => {
      void unlisten.then((u) => u());
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{t('app.title')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={
            health?.status === 'ok'
              ? 'size-2 rounded-full bg-emerald-500'
              : 'size-2 rounded-full bg-amber-500'
          }
        />
        <span>
          {t('app.bridge')}: {health ? health.message : t('app.connecting')}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => i18n.changeLanguage('en')}
          aria-pressed={i18n.language === 'en'}
        >
          English
        </Button>
        <Button
          variant="outline"
          onClick={() => i18n.changeLanguage('vi')}
          aria-pressed={i18n.language === 'vi'}
        >
          Tiếng Việt
        </Button>
        <Button
          variant="outline"
          onClick={() => i18n.changeLanguage('zh-CN')}
          aria-pressed={i18n.language === 'zh-CN'}
        >
          中文
        </Button>
      </div>

      <p className="max-w-md text-center text-xs text-muted-foreground">
        {t('app.placeholder')}
      </p>

      <Toaster />
    </main>
  );
}
