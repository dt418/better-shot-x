import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function HistoryPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Screenshot[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setSearching] = useState(false);

  const load = async (q: string) => {
    setLoading(true);
    try {
      const result = q ? await searchHistory(q) : await listHistory();
      setItems(result);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
  }, []);

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

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('history.title')}</h1>
        <div className="flex items-center gap-2">
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
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">{t('tray.openSettings')}</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="text-muted-foreground text-center">{t('app.connecting')}</p>}
        {!loading && items.length === 0 && (
          <p className="text-muted-foreground text-center">{t('history.empty')}</p>
        )}
        {!loading && items.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id['0']} className="flex flex-col overflow-hidden rounded-lg border">
                <div className="bg-muted flex h-40 items-center justify-center">
                  <img
                    src={`file://${item.path}`}
                    alt={item.id['0']}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col gap-1 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {item.width}×{item.height}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatBytes(item.byte_size)}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(item.created_at)}
                  </span>
                  <div className="mt-1 flex items-center gap-1">
                    <button
                      onClick={() => void handleFavorite(item.id['0'], item.favorited)}
                      className="text-xs"
                    >
                      {item.favorited ? '★' : '☆'}
                    </button>
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted text-muted-foreground rounded px-1 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    <button
                      onClick={() => void handleDelete(item.id['0'])}
                      className="text-destructive ml-auto text-xs"
                    >
                      {t('history.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
