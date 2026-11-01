/* Optional live test account panel. Existing dashboard remains synthetic. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const config = window.IG_LIVE_CONFIG || {};
  const status = $('liveConnectionStatus');
  const login = $('liveLoginForm');
  const refresh = $('liveRefresh');
  const logout = $('liveLogout');
  const result = $('liveResults');
  const feedback = $('liveFeedback');
  let accessToken = null;

  function show(message, kind = '') {
    feedback.textContent = message;
    feedback.dataset.kind = kind;
  }

  function text(id, value) {
    $(id).textContent = value ?? '—';
  }

  function format(value) {
    return typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat('ru-RU').format(value) : '—';
  }

  function configured() {
    try {
      const uri = new URL(config.supabaseUrl);
      return uri.protocol === 'https:' && uri.hostname.endsWith('.supabase.co') &&
        typeof config.supabasePublishableKey === 'string' &&
        config.supabasePublishableKey.trim().length > 10;
    } catch { return false; }
  }

  async function fetchJson(path, options) {
    const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.msg || data.error || 'Сервис временно недоступен');
    return data;
  }

  function setAuthenticated(yes) {
    status.textContent = yes ? 'Supabase: авторизовано' : 'Supabase: не авторизовано';
    refresh.disabled = !yes;
    logout.hidden = !yes;
    login.hidden = yes;
    if (!yes) result.hidden = true;
  }

  async function signIn(event) {
    event.preventDefault();
    const email = $('liveEmail').value.trim();
    const password = $('livePassword').value;
    if (!email || !password) return;
    const submit = $('liveSignIn');
    submit.disabled = true;
    show('Выполняется вход через Supabase Auth...');
    try {
      const data = await fetchJson('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'apikey': config.supabasePublishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (!data.access_token) throw new Error('Не получен токен сессии');
      accessToken = data.access_token;
      $('livePassword').value = '';
      setAuthenticated(true);
      show('Успешный вход. Теперь можно запросить реальные показатели.', 'success');
      await loadLive();
    } catch {
      show('Не удалось войти. Проверьте тестовый аккаунт Supabase и подтверждение email.', 'error');
    } finally {
      submit.disabled = false;
    }
  }

  function addCell(row, value) {
    const td = document.createElement('td');
    td.textContent = value;
    row.append(td);
  }

  function render(data) {
    const account = data.account || {};
    text('liveHandle', account.username ? '@' + account.username : '—');
    text('liveFollowers', format(account.followers_count));
    text('liveMediaCount', format(account.media_count));
    text('liveViews', format(data.insights?.views));
    text('liveReach', format(data.insights?.reach));
    text('liveUpdatedAt', data.fetched_at ? new Date(data.fetched_at).toLocaleString('ru-RU') : '—');

    const table = $('liveMediaBody');
    table.replaceChildren();
    for (const item of (Array.isArray(data.media) ? data.media : [])) {
      const tr = document.createElement('tr');
      addCell(tr, (item.caption || '').slice(0, 75) || '(Без подписи)');
      addCell(tr, item.media_type || '—');
      addCell(tr, format(item.like_count));
      addCell(tr, format(item.comments_count));
      table.append(tr);
    }
    $('liveEmptyMedia').hidden = Boolean(table.children.length);
    result.hidden = false;
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    show(warnings.length ? 'Данные профиля получены. ' + warnings.join(' ') :
      'Данные получены из официального Instagram API (не из демо-генератора).', warnings.length ? 'warning' : 'success');
  }

  async function loadLive() {
    if (!accessToken) return;
    refresh.disabled = true;
    show('Запрашиваем данные Instagram через защищённую Supabase Edge Function...');
    try {
      const data = await fetchJson('/functions/v1/instagram-live', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'apikey': config.supabasePublishableKey,
        },
        cache: 'no-store',
      });
      if (data.source !== 'meta_instagram_api') throw new Error('Неверный источник данных');
      render(data);
    } catch (error) {
      show(error.message === 'Failed to fetch'
        ? 'Ошибка сети или CORS. Проверьте адрес сайта в IG_ALLOWED_ORIGIN.'
        : String(error.message || 'Не удалось загрузить Instagram'), 'error');
    } finally {
      refresh.disabled = false;
    }
  }

  if (!configured()) {
    status.textContent = 'Реальный API ещё не настроен';
    login.hidden = true;
    refresh.disabled = true;
    show('Чтобы включить режим, заполните публичные параметры real-config.js и разверните защищённую Edge Function по инструкции REAL_INSTAGRAM_SETUP.md.');
  } else {
    setAuthenticated(false);
    login.addEventListener('submit', signIn);
    refresh.addEventListener('click', loadLive);
    logout.addEventListener('click', () => {
      accessToken = null;
      $('livePassword').value = '';
      setAuthenticated(false);
      show('Выход выполнен. Токен сессии не сохранялся в браузере.');
    });
  }
})();
