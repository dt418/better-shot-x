import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { useSettingsStore, type AppConfig, type ImageFormat, type Theme } from '@/stores/settings';

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'zh-CN', label: '简体中文' },
] as const;

const FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp', 'gif', 'bmp'];

const THEMES: Theme[] = ['light', 'dark', 'system'];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error } = useSettings();
  const update = useUpdateSettings();
  const config = useSettingsStore((s) => s.config);
  const isDirty = useSettingsStore((s) => s.isDirty);
  const patch = useSettingsStore((s) => s.patch);
  const setConfig = useSettingsStore((s) => s.setConfig);

  // Hydrate the optimistic store when the query resolves.
  useEffect(() => {
    if (data && config === null) setConfig(data);
  }, [data, config, setConfig]);

  // Propagate locale changes from the form into i18next.
  useEffect(() => {
    if (config?.locale && i18n.language !== config.locale) {
      void i18n.changeLanguage(config.locale);
    }
  }, [config?.locale, i18n]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t('settings.loading')}
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        {String(error ?? 'unknown')}
      </div>
    );
  }

  const handleSave = () => {
    if (!isDirty) return;
    update.mutate(config, {
      onSuccess: () => toast.success(t('settings.saved')),
      onError: (e) => toast.error(String(e)),
    });
  };

  const handleReset = () => {
    if (data) setConfig(data);
  };

  const pickDirectory = async () => {
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === 'string') patch({ defaultSaveDir: picked });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleReset} disabled={!isDirty}>
            {t('settings.reset')}
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || update.isPending}>
            {update.isPending ? t('settings.saving') : t('settings.save')}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="general" className="flex flex-1 overflow-hidden">
        <TabsList className="flex h-full w-56 flex-col items-stretch justify-start gap-1 border-r bg-muted/30 p-3">
          <TabsTrigger value="general" className="justify-start">
            {t('settings.general')}
          </TabsTrigger>
          <TabsTrigger value="capture" className="justify-start">
            {t('settings.capture')}
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="justify-start">
            {t('settings.shortcuts')}
          </TabsTrigger>
          <TabsTrigger value="editor" className="justify-start">
            {t('settings.editor')}
          </TabsTrigger>
          <TabsTrigger value="ocr" className="justify-start">
            {t('settings.ocr')}
          </TabsTrigger>
          <TabsTrigger value="recording" className="justify-start">
            {t('settings.recording')}
          </TabsTrigger>
          <TabsTrigger value="uploads" className="justify-start">
            {t('settings.uploads')}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="justify-start">
            {t('settings.privacy')}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="justify-start">
            {t('settings.advanced')}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="general">
            <GeneralSection
              config={config}
              onPatch={patch}
              onPickDir={pickDirectory}
            />
          </TabsContent>
          <TabsContent value="capture">
            <ComingSoon label={t('settings.capture')} />
          </TabsContent>
          <TabsContent value="shortcuts">
            <ComingSoon label={t('settings.shortcuts')} />
          </TabsContent>
          <TabsContent value="editor">
            <ComingSoon label={t('settings.editor')} />
          </TabsContent>
          <TabsContent value="ocr">
            <ComingSoon label={t('settings.ocr')} />
          </TabsContent>
          <TabsContent value="recording">
            <ComingSoon label={t('settings.recording')} />
          </TabsContent>
          <TabsContent value="uploads">
            <ComingSoon label={t('settings.uploads')} />
          </TabsContent>
          <TabsContent value="privacy">
            <ComingSoon label={t('settings.privacy')} />
          </TabsContent>
          <TabsContent value="advanced">
            <ComingSoon label={t('settings.advanced')} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

interface GeneralProps {
  config: AppConfig;
  onPatch: (patch: Partial<AppConfig>) => void;
  onPickDir: () => void;
}

function GeneralSection({ config, onPatch, onPickDir }: GeneralProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t('settings.general')}</h2>

        <div className="grid gap-2">
          <Label htmlFor="locale">{t('settings.language')}</Label>
          <select
            id="locale"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={config.locale}
            onChange={(e) => onPatch({ locale: e.target.value })}
          >
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="theme">{t('settings.theme')}</Label>
          <select
            id="theme"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={config.theme}
            onChange={(e) => onPatch({ theme: e.target.value as Theme })}
          >
            {THEMES.map((th) => (
              <option key={th} value={th}>
                {t(`settings.themeOptions.${th}`)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t('settings.capture')}</h2>

        <div className="grid gap-2">
          <Label htmlFor="format">{t('settings.defaultFormat')}</Label>
          <select
            id="format"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={config.defaultFormat}
            onChange={(e) => onPatch({ defaultFormat: e.target.value as ImageFormat })}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="save-dir">{t('settings.defaultSaveDir')}</Label>
          <div className="flex gap-2">
            <input
              id="save-dir"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.defaultSaveDir ?? ''}
              placeholder={t('settings.defaultSaveDirPlaceholder')}
              onChange={(e) =>
                onPatch({ defaultSaveDir: e.target.value === '' ? null : e.target.value })
              }
            />
            <Button type="button" variant="outline" onClick={onPickDir}>
              {t('settings.browse')}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t('settings.system')}</h2>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tray-enabled">{t('settings.trayEnabled')}</Label>
            <p className="text-xs text-muted-foreground">{t('settings.trayEnabledHint')}</p>
          </div>
          <Switch
            id="tray-enabled"
            checked={config.trayEnabled}
            onCheckedChange={(v) => onPatch({ trayEnabled: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-start">{t('settings.autoStart')}</Label>
            <p className="text-xs text-muted-foreground">{t('settings.autoStartHint')}</p>
          </div>
          <Switch
            id="auto-start"
            checked={config.autoStart}
            onCheckedChange={(v) => onPatch({ autoStart: v })}
          />
        </div>
      </section>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 py-16 text-center text-muted-foreground">
      <h2 className="text-lg font-medium text-foreground">{label}</h2>
      <p className="text-sm">{t('settings.comingSoon')}</p>
    </div>
  );
}
