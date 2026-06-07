import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { SettingsPage } from '@/routes/settings';
import { CapturePage } from '@/routes/capture';
import { HistoryPage } from '@/routes/history';

type Health = { status: 'ok' | 'error'; message: string };

async function checkHealth(): Promise<Health> {
  try {
    const pong = await invoke<string>('ping');
    return { status: pong === 'pong' ? 'ok' : 'error', message: pong };
  } catch (e) {
    return { status: 'error', message: String(e) };
  }
}

function HomePage() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    void checkHealth().then(setHealth);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('app.title')}</h1>
        <div className="flex items-center gap-2">
          <span
            data-testid="health"
            className={
              health?.status === 'ok'
                ? 'inline-flex items-center gap-1 text-xs text-emerald-600'
                : 'inline-flex items-center gap-1 text-xs text-amber-600'
            }
          >
            <span
              className={
                health?.status === 'ok'
                  ? 'size-2 rounded-full bg-emerald-500'
                  : 'size-2 rounded-full bg-amber-500'
              }
            />
            {t('app.bridge')}: {health?.message ?? t('app.connecting')}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">{t('tray.openSettings')}</Link>
          </Button>
        </div>
      </header>
      <main className="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center">
        {t('app.placeholder')}
      </main>
    </div>
  );
}

export default function App() {
  // The tray "Settings" menu item emits a global event. The router
  // lives inside App, so we can't use `useNavigate` here directly;
  // we just stash a custom event the HomePage/SettingsPage can hear.
  useEffect(() => {
    const unlisten = listen('tray-settings', () => {
      window.history.pushState({}, '', '/settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <Toaster />
    </Router>
  );
}
