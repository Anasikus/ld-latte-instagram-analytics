// Real Instagram API test bridge. No Instagram token, app secret or service-role key ever enters the browser.
// A Supabase Auth user must match IG_ALLOWED_USER_ID. Only GET requests to fixed Meta endpoints.
import { createClient } from 'npm:@supabase/supabase-js@2';

const noCache = { 'Cache-Control': 'no-store' };
const IG_BASE = 'https://graph.instagram.com';

function headers(origin: string | null): Record<string, string> {
  const allowed = Deno.env.get('IG_ALLOWED_ORIGIN');
  const cors = origin && (origin === allowed || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    : {};
  return {
    ...cors,
    ...noCache,
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) });
}

async function graph(path: string, token: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, IG_BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`Meta HTTP ${response.status}`);
  return await response.json();
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function insight(metric: string, token: string): Promise<number | null> {
  try {
    const raw = await graph('/me/insights', token, {
      metric, period: 'day', metric_type: 'total_value',
    }) as { data?: Array<{ total_value?: { value?: unknown }; values?: Array<{ value?: unknown }> }> };
    const first = raw.data?.[0];
    return numberOrNull(first?.total_value?.value ?? first?.values?.[0]?.value);
  } catch {
    // Unsupported metric, insufficient rights or missing data is NOT zero.
    return null;
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin');
  const allowedOrigin = Deno.env.get('IG_ALLOWED_ORIGIN');
  if (origin && origin !== allowedOrigin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return json({ error: 'Недопустимый источник запроса' }, 403, null);
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== 'GET') return json({ error: 'Метод не поддерживается' }, 405, origin);

  const adminUserId = Deno.env.get('IG_ALLOWED_USER_ID');
  const instagramToken = Deno.env.get('IG_TEST_ACCESS_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  let publishable = Deno.env.get('SUPABASE_ANON_KEY');
  if (!publishable) {
    try {
      publishable = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default;
    } catch { /* invalid environment configuration */ }
  }
  if (!adminUserId || !instagramToken || !supabaseUrl || !publishable) {
    return json({ error: 'Серверное подключение ещё не настроено' }, 503, origin);
  }

  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: 'Требуется авторизация' }, 401, origin);

  const supabase = createClient(supabaseUrl, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(match[1]);
  if (error || !user) return json({ error: 'Сессия недействительна' }, 401, origin);
  if (user.id !== adminUserId) return json({ error: 'Нет доступа к этому Instagram-аккаунту' }, 403, origin);

  try {
    const raw = await graph('/me', instagramToken, {
      fields: 'id,username,followers_count,media_count',
    }) as { id?: string; username?: string; followers_count?: number; media_count?: number };
    if (!raw.id || !raw.username) throw new Error('Meta response lacks required fields');

    // Media metadata is optional: an unavailable media endpoint must not hide valid profile data.
    let media: Array<Record<string, unknown>> = [];
    const warnings: string[] = [];
    try {
      const result = await graph('/me/media', instagramToken, {
        fields: 'id,caption,media_type,timestamp,like_count,comments_count,permalink',
        limit: '12',
      }) as { data?: Array<Record<string, unknown>> };
      media = Array.isArray(result.data) ? result.data.map((entry) => ({
        id: String(entry.id || ''),
        caption: typeof entry.caption === 'string' ? entry.caption.slice(0, 180) : '',
        media_type: typeof entry.media_type === 'string' ? entry.media_type : '',
        timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : null,
        like_count: numberOrNull(entry.like_count),
        comments_count: numberOrNull(entry.comments_count),
        permalink: typeof entry.permalink === 'string' && entry.permalink.startsWith('https://www.instagram.com/')
          ? entry.permalink : null,
      })) : [];
    } catch {
      warnings.push('Публикации пока не удалось получить. Проверьте права и тип аккаунта.');
    }

    const [reach, views] = await Promise.all([
      insight('reach', instagramToken), insight('views', instagramToken),
    ]);
    if (reach === null || views === null) {
      warnings.push('Некоторые insights недоступны. Значения оставлены пустыми, а не заменены нулями.');
    }

    return json({
      source: 'meta_instagram_api',
      fetched_at: new Date().toISOString(),
      account: {
        id: raw.id,
        username: raw.username,
        followers_count: numberOrNull(raw.followers_count),
        media_count: numberOrNull(raw.media_count),
      },
      insights: { reach, views, period: 'day', status: 'best_effort' },
      media,
      warnings,
    }, 200, origin);
  } catch {
    return json({ error: 'Не удалось получить данные Instagram. Проверьте токен, разрешения и тип аккаунта.' }, 502, origin);
  }
});
