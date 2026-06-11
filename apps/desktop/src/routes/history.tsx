import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Download,
  FolderOpen,
  Image,
  Info,
  Maximize2,
  Tag,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

type Screenshot = {
  id: { '0': string };
  path: string;
  width: number;
  height: number;
  byte_size: number;
  created_at: string;
  favorited: boolean;
  tags: string[];
};

const CMD_LIST = 'listHistory';
const CMD_SEARCH = 'searchHistory';
const CMD_DELETE = 'deleteHistory';
const CMD_FAVORITE = 'favoriteHistory';

async function listHistory(limit = 50, offset = 0): Promise<Screenshot[]> {
  return invoke<Screenshot[]>(CMD_LIST, { limit, offset });
}

async function searchHistory(query: string): Promise<Screenshot[]> {
  return invoke<Screenshot[]>(CMD_SEARCH, { query });
}

async function deleteHistory(id: string): Promise<void> {
  return invoke<void>(CMD_DELETE, { id });
}

async function favoriteHistory(id: string, favorited: boolean): Promise<void> {
  return invoke<void>(CMD_FAVORITE, { id, favorited });
}



function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function getFileFormat(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const formats: Record<string, string> = {
    png: 'PNG',
    jpg: 'JPEG',
    jpeg: 'JPEG',
    webp: 'WebP',
    gif: 'GIF',
    bmp: 'BMP',
  };
  return formats[ext] ?? ext.toUpperCase();
}

function getPixelDensity(width: number, height: number): string {
  const megapixels = (width * height) / 1000000;
  return megapixels >= 1
    ? `${megapixels.toFixed(1)} MP`
    : `${((width * height) / 1000).toFixed(0)}K px`;
}

// ---------------------------------------------------------------------------
// Metadata panel for a single screenshot
// ---------------------------------------------------------------------------

function MetadataPanel({
  item,
  onClose,
}: {
  item: Screenshot;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const format = getFileFormat(item.path);
  const fileName = item.path.split('/').pop() ?? item.path;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background w-full max-w-[400px] rounded-lg border p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('history.metadata')}</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="mb-4 overflow-hidden rounded-md border">
          <img
            src={`file://${item.path}`}
            alt={fileName}
            className="max-h-48 w-full object-contain bg-muted"
          />
        </div>

        <div className="space-y-3 text-sm">
          <MetadataRow label={t('history.meta.fileName')} value={fileName} icon={<Image className="h-3.5 w-3.5" />} />
          <MetadataRow label={t('history.meta.format')} value={format} icon={<Tag className="h-3.5 w-3.5" />} />
          <MetadataRow
            label={t('history.meta.dimensions')}
            value={`${item.width} × ${item.height}`}
            icon={<Maximize2 className="h-3.5 w-3.5" />}
          />
          <MetadataRow
            label={t('history.meta.megapixels')}
            value={getPixelDensity(item.width, item.height)}
            icon={<Info className="h-3.5 w-3.5" />}
          />
          <MetadataRow label={t('history.meta.fileSize')} value={formatBytes(item.byte_size)} icon={<Info className="h-3.5 w-3.5" />} />
          <MetadataRow label={t('history.meta.created')} value={formatDate(item.created_at)} icon={<Info className="h-3.5 w-3.5" />} />
          <MetadataRow label={t('history.meta.path')} value={item.path} icon={<FolderOpen className="h-3.5 w-3.5" />} />
        </div>

        <div className="mt-5 flex justify-end">
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetadataRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch export dialog
// ---------------------------------------------------------------------------

function BatchExportDialog({
  selectedItems,
  onClose,
}: {
  selectedItems: Screenshot[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: selectedItems.length });

  const handleExport = async () => {
    setExporting(true);
    setProgress({ done: 0, total: selectedItems.length });

    try {
      // Pick output directory first
      const { open } = await import('@tauri-apps/plugin-dialog');
      const dir = await open({ directory: true, title: t('history.batchExport.selectFolder') });
      if (!dir) {
        setExporting(false);
        return;
      }

      const { readFile, writeFile } = await import('@tauri-apps/plugin-fs');
      const ext = format === 'jpeg' ? 'jpg' : format;
      const quality = format === 'png' ? undefined : 0.92;

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        if (!item) continue;
        const baseName = item.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? `screenshot-${i}`;
        const outPath = `${dir}/${baseName}.${ext}`;

        try {
          // Check if source format already matches target — skip conversion
          const srcExt = item.path.split('.').pop()?.toLowerCase() ?? '';
          const srcFormat = srcExt === 'jpg' ? 'jpeg' : srcExt;

          if (srcFormat === format) {
            const data = await readFile(item.path);
            await writeFile(outPath, data);
          } else {
            const data = await readFile(item.path);
            const blob = new Blob([data]);
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              failCount++;
              continue;
            }

            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();

            const convertedBlob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, `image/${format}`, quality),
            );
            if (!convertedBlob) {
              failCount++;
              continue;
            }

            const arrayBuffer = await convertedBlob.arrayBuffer();
            await writeFile(outPath, new Uint8Array(arrayBuffer));
          }

          successCount++;
        } catch {
          failCount++;
        }

        setProgress({ done: i + 1, total: selectedItems.length });
      }

      if (failCount > 0) {
        toast.warning(t('history.batchExport.warnings', { count: failCount }));
      }

      toast.success(t('history.batchExport.complete', { count: successCount, total: selectedItems.length }));
      onClose();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background w-[400px] rounded-lg border p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold">{t('history.batchExport.title')}</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {t('history.batchExport.description', { count: selectedItems.length })}
        </p>

        <div className="mb-4">
          <label className="text-muted-foreground mb-2 block text-xs font-medium">
            {t('history.batchExport.format')}
          </label>
          <div className="flex gap-2">
            {(['png', 'jpeg', 'webp'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-md border p-2 text-sm font-medium transition-colors ${
                  format === f
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {exporting && (
          <div className="mb-4">
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('history.batchExport.progress', { done: progress.done, total: progress.total })}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={exporting}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? t('history.batchExport.exporting') : t('history.batchExport.export')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History page
// ---------------------------------------------------------------------------

export function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Screenshot[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setSearching] = useState(false);

  // Selection state for batch operations
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Metadata panel
  const [metadataItem, setMetadataItem] = useState<Screenshot | null>(null);

  // Batch export dialog
  const [showBatchExport, setShowBatchExport] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = q ? await searchHistory(q) : await listHistory();
      setItems(result);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const handleSearch = async () => {
    setSearching(true);
    await load(query);
    setSearching(false);
  };

  const handleDelete = async (id: string) => {
    await deleteHistory(id);
    setItems((prev) => prev.filter((s) => s.id['0'] !== id));
  };

  const handleFavorite = async (id: string, current: boolean) => {
    await favoriteHistory(id, !current);
    setItems((prev) => prev.map((s) => (s.id['0'] === id ? { ...s, favorited: !current } : s)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((s) => s.id['0'])));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await deleteHistory(id);
    }
    setItems((prev) => prev.filter((s) => !selectedIds.has(s.id['0'])));
    setSelectedIds(new Set());
    setSelectMode(false);
    toast.success(t('history.batchDelete.complete', { count }));
  };

  const selectedItems = items.filter((s) => selectedIds.has(s.id['0']));

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('history.title')}</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <span className="text-muted-foreground text-sm">
                {t('history.selected', { count: selectedIds.size })}
              </span>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === items.length ? t('history.deselectAll') : t('history.selectAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchExport(true)}
                disabled={selectedIds.size === 0}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                {t('history.batchExport.button')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleBatchDelete()}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {t('history.batchDelete.button')}
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <>
              <input
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                placeholder={t('history.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              />
              <Button onClick={() => void handleSearch()} size="sm" variant="outline">
                {t('history.search')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                {t('history.select')}
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">{t('tray.openSettings')}</Link>
              </Button>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="text-muted-foreground text-center">{t('app.connecting')}</p>}
        {!loading && items.length === 0 && (
          <p className="text-muted-foreground text-center">{t('history.empty')}</p>
        )}
        {!loading && items.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const format = getFileFormat(item.path);
              const isSelected = selectedIds.has(item.id['0']);

              return (
                <div
                  key={item.id['0']}
                  className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  {/* Image preview */}
                  <div className="bg-muted flex h-40 items-center justify-center relative">
                    <img
                      src={`file://${item.path}`}
                      alt={item.id['0']}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                    {selectMode && (
                      <button
                        onClick={() => toggleSelect(item.id['0'])}
                        className={`absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background/80 hover:bg-muted'
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </button>
                    )}
                    {/* Format badge */}
                    <span className="bg-background/80 text-muted-foreground absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium">
                      {format}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1.5 p-3 text-sm">
                    {/* Dimensions + size row */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Maximize2 className="h-3 w-3" />
                        {item.width}×{item.height}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getPixelDensity(item.width, item.height)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(item.byte_size)}
                      </span>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </span>

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-muted text-muted-foreground rounded px-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        onClick={() => void handleFavorite(item.id['0'], item.favorited)}
                        className="text-xs"
                        title={item.favorited ? t('history.unfavorite') : t('history.favorite')}
                      >
                        {item.favorited ? '★' : '☆'}
                      </button>
                      <button
                        onClick={() => setMetadataItem(item)}
                        className="text-muted-foreground hover:text-foreground"
                        title={t('history.metadata')}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate('/editor', { state: { imagePath: item.path } })}
                        className="text-primary text-xs"
                      >
                        {t('history.edit')}
                      </button>
                      <button
                        onClick={() => void handleDelete(item.id['0'])}
                        className="text-destructive ml-auto text-xs"
                      >
                        {t('history.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Metadata panel */}
      {metadataItem && (
        <MetadataPanel item={metadataItem} onClose={() => setMetadataItem(null)} />
      )}

      {/* Batch export dialog */}
      {showBatchExport && selectedItems.length > 0 && (
        <BatchExportDialog
          selectedItems={selectedItems}
          onClose={() => {
            setShowBatchExport(false);
            exitSelectMode();
          }}
        />
      )}
    </div>
  );
}
