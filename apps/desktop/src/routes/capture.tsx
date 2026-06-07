import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSettingsStore, type ImageFormat } from '@/stores/settings';

type WindowId = { '0': string };

interface WindowInfo {
  id: WindowId;
  title: string;
  app_name: string;
  geometry: { x: number; y: number; width: number; height: number };
}

const CMD_LIST = 'listWindows';
const CMD_CAPTURE = 'captureWindow';

async function listWindows(): Promise<WindowInfo[]> {
  return invoke<WindowInfo[]>(CMD_LIST);
}

async function captureWindow(id: WindowId, format: ImageFormat): Promise<string> {
  return invoke<string>(CMD_CAPTURE, { id, format });
}

export function CapturePage() {
  const { t } = useTranslation();
  const config = useSettingsStore((s) => s.config);
  const [windows, setWindows] = useState<WindowInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWindows()
      .then(setWindows)
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCapture = async (win: WindowInfo) => {
    if (!config) return;
    setCapturing(win.id['0']);
    try {
      await captureWindow(win.id, config.defaultFormat);
      toast.success(t('capture.success'));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setCapturing(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('capture.title')}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">{t('tray.openSettings')}</Link>
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && <p className="text-muted-foreground text-center">{t('app.connecting')}</p>}
        {error && <p className="text-destructive text-center">{error}</p>}
        {windows !== null && !isLoading && (
          <>
            <p className="text-muted-foreground mb-4 text-sm">
              {windows.length > 0
                ? t('capture.listWindows', { count: windows.length })
                : t('capture.noWindows')}
            </p>
            <div className="grid gap-2">
              {windows.map((win) => {
                const id = win.id['0'];
                return (
                  <button
                    key={id}
                    onClick={() => void handleCapture(win)}
                    disabled={capturing !== null}
                    className="hover:bg-accent flex items-center gap-4 rounded-lg border p-4 text-left transition-colors disabled:opacity-50"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{win.title || '(no title)'}</span>
                      <span className="text-muted-foreground text-xs">
                        {win.app_name || t('capture.app')}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {win.geometry.width}×{win.geometry.height}
                      </span>
                      {capturing === id ? (
                        <span className="text-muted-foreground text-sm">
                          {t('capture.capturing')}
                        </span>
                      ) : (
                        <span className="text-primary text-xs">→</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
