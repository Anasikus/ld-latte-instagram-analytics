/* LD LATTE Instagram Analytics — offline demo. All accounts, metrics and posts are fictional. */
(() => {
  'use strict';

  const accounts = [
    { id: 'demo-ig-001', handle: '@latte.studio.demo', name: 'LATTE Design Studio', type: 'Business', followers: 18420, baseViews: 13400, baseReach: 6200, seed: 11, color: '#49d7c6', avatar: 'L', avatarClass: 'mint', status: 'active' },
    { id: 'demo-ig-002', handle: '@urban.daily.demo', name: 'Urban Daily', type: 'Creator', followers: 9270, baseViews: 8900, baseReach: 3600, seed: 29, color: '#3f8fd6', avatar: 'U', avatarClass: 'blue', status: 'active' },
    { id: 'demo-ig-003', handle: '@nova.brand.demo', name: 'Nova Brand', type: 'Business', followers: 6390, baseViews: 5300, baseReach: 2600, seed: 53, color: '#9d8ae1', avatar: 'N', avatarClass: 'violet', status: 'reconnect_required' },
  ];

  const media = [
    { accountId: 'demo-ig-001', id: 'm-01', title: 'Новая коллекция', type: 'Reels', daysAgo: 2, views: 24600, reach: 12900, likes: 1680, saved: 340, icon: '✦' },
    { accountId: 'demo-ig-002', id: 'm-02', title: 'Утро в городе', type: 'Reels', daysAgo: 4, views: 18900, reach: 11200, likes: 920, saved: 175, icon: '☼' },
    { accountId: 'demo-ig-001', id: 'm-03', title: 'За кадром', type: 'Фото', daysAgo: 8, views: 11320, reach: 7350, likes: 604, saved: 128, icon: '◈' },
    { accountId: 'demo-ig-003', id: 'm-04', title: 'Студийный дневник', type: 'Карусель', daysAgo: 11, views: null, reach: null, likes: 210, saved: null, icon: '◇' },
    { accountId: 'demo-ig-002', id: 'm-05', title: 'Подборка недели', type: 'Карусель', daysAgo: 15, views: 9700, reach: 6020, likes: 415, saved: null, icon: '▦' },
    { accountId: 'demo-ig-001', id: 'm-06', title: 'История бренда', type: 'Reels', daysAgo: 23, views: 18200, reach: 9000, likes: 1330, saved: 290, icon: '✧' },
    { accountId: 'demo-ig-002', id: 'm-07', title: 'Планы на сезон', type: 'Фото', daysAgo: 42, views: 6600, reach: 3250, likes: 294, saved: 67, icon: '☷' },
    { accountId: 'demo-ig-003', id: 'm-08', title: 'Серия постеров', type: 'Фото', daysAgo: 61, views: null, reach: null, likes: 392, saved: null, icon: '◉' },
    { accountId: 'demo-ig-001', id: 'm-09', title: 'Наши проекты', type: 'Карусель', daysAgo: 72, views: 8900, reach: 5100, likes: 510, saved: 91, icon: '▤' },
  ];

  const storageKey = 'ld-latte-instagram-prototype-v1';
  const snapshotsKey = 'ld-latte-instagram-demo-snapshots-v1';
  let snapshotsCache = {};
  const format = new Intl.NumberFormat('ru-RU');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const state = { accountId: 'all', days: 30, chartMetric: 'views', syncing: false, runs: [] };

  const $ = (id) => document.getElementById(id);
  const safeText = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const num = (value) => value === null || value === undefined ? '—' : format.format(Math.round(value));
  const compact = (value) => value === null || value === undefined ? '—' : value >= 1000000 ? (value / 1000000).toFixed(1).replace('.', ',') + ' млн' : value >= 1000 ? (value / 1000).toFixed(1).replace('.', ',') + ' тыс.' : num(value);
  const dayDate = (daysAgo) => { const date = new Date(today); date.setDate(today.getDate() - daysAgo); return date; };
  const shortDate = (date) => date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const byId = (id) => accounts.find(account => account.id === id);
  const selected = () => state.accountId === 'all' ? accounts : accounts.filter(item => item.id === state.accountId);

  function dailyMetric(account, daysAgo, metric) {
    if (account.status !== 'active') return null;
    const wave = Math.sin((daysAgo + account.seed) * 0.38) * 0.17 + Math.sin(daysAgo * 0.11 + account.seed) * 0.09;
    const weekend = dayDate(daysAgo).getDay() === 0 || dayDate(daysAgo).getDay() === 6 ? 1.16 : 1;
    const factor = Math.max(.45, (1 + wave) * weekend * (1 + ((daysAgo * 7 + account.seed) % 13) / 100));
    return Math.round((metric === 'views' ? account.baseViews : account.baseReach) * factor);
  }

  function series(metric, accountIds = selected()) {
    return Array.from({ length: state.days }, (_, index) => {
      const daysAgo = state.days - 1 - index;
      const values = accountIds.map(account => dailyMetric(account, daysAgo, metric)).filter(value => value !== null);
      return { date: dayDate(daysAgo), value: values.length ? values.reduce((a, b) => a + b, 0) : null };
    });
  }

  function total(metric, accountIds = selected()) {
    const values = series(metric, accountIds).map(entry => entry.value).filter(value => value !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  }

  function postsForSelection() {
    const ids = new Set(selected().map(item => item.id));
    return media.filter(post => ids.has(post.accountId) && post.daysAgo < state.days);
  }

  function showToast(message, warning = false) {
    const node = document.createElement('div');
    node.className = `toast${warning ? ' warning' : ''}`;
    node.innerHTML = `<button type="button" aria-label="Закрыть уведомление">×</button><strong>${warning ? 'Внимание' : 'Готово'}</strong><span>${safeText(message)}</span>`;
    node.querySelector('button').addEventListener('click', () => node.remove());
    $('toastRegion').append(node);
    window.setTimeout(() => node.remove(), 6500);
  }

  function renderMetrics() {
    const list = selected();
    const followers = list.reduce((sum, account) => sum + account.followers, 0);
    const postCount = postsForSelection().length;
    const data = [
      { title: 'Подписчики', value: followers, icon: '♙', description: 'Последний известный снимок', delta: 'Демо' },
      { title: 'Просмотры', value: total('views'), icon: '◉', description: `За ${state.days} дней · сумма аккаунтов`, delta: 'Симуляция' },
      { title: 'Охват', value: total('reach'), icon: '⊙', description: 'Сумма охватов, не уникальный итог', delta: 'Симуляция' },
      { title: 'Публикации', value: postCount, icon: '▤', description: `За выбранные ${state.days} дней`, delta: 'Демо' },
    ];
    $('metricsGrid').innerHTML = data.map(item => `<article class="metric-card"><div class="metric-top"><span class="metric-label">${safeText(item.title)}</span><span class="metric-icon">${item.icon}</span></div><div class="metric-number">${num(item.value)}</div><div class="metric-desc">${safeText(item.description)}</div></article>`).join('');
  }

  function renderTrend() {
    const points = series(state.chartMetric);
    const valid = points.filter(p => p.value !== null);
    const label = state.chartMetric === 'views' ? 'Просмотры' : 'Охват';
    $('chartCaption').textContent = `${label} · ${state.accountId === 'all' ? 'все аккаунты' : byId(state.accountId).handle}`;
    $('chartRange').textContent = `${shortDate(points[0].date)} — ${shortDate(points[points.length - 1].date)}`;
    $('chartArea').setAttribute('aria-label', `График «${label}», период ${state.days} дней`);
    document.querySelectorAll('.segment').forEach(btn => btn.classList.toggle('active', btn.dataset.metric === state.chartMetric));
    if (!valid.length) {
      $('chartArea').innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#8aaab6;text-align:center">Нет доступной статистики: требуется переподключение аккаунта.</div>';
      return;
    }
    const width = 700, height = 210, left = 52, right = 13, top = 13, bottom = 35;
    const max = Math.max(...valid.map(p => p.value), 1) * 1.17;
    const x = (index) => left + index * (width - left - right) / Math.max(1, points.length - 1);
    const y = (value) => top + (max - value) / max * (height - top - bottom);
    const coords = points.map((p, i) => p.value === null ? null : `${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).filter(Boolean).join(' ');
    const line = points.map((p, i) => p.value === null ? null : `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).filter(Boolean).join(' ');
    const firstValidIndex = points.findIndex(p => p.value !== null);
    const lastValidIndex = points.findLastIndex(p => p.value !== null);
    const fill = firstValidIndex < 0 ? '' : `M ${x(firstValidIndex)} ${height - bottom} L ${coords.replaceAll(' ', ' L ')} L ${x(lastValidIndex)} ${height - bottom} Z`;
    const grid = [0, .25, .5, .75, 1].map(ratio => {
      const yy = y(max * ratio);
      return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#315367" stroke-opacity=".52" stroke-dasharray="4 6"/><text x="${left - 12}" y="${yy + 4}" text-anchor="end" fill="#7195a5" font-size="10">${compact(max * ratio)}</text>`;
    }).join('');
    const tickStep = Math.max(1, Math.ceil(points.length / 6));
    const labels = points.map((p, i) => i % tickStep === 0 || i === points.length - 1 ? `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" fill="#7698a9" font-size="10">${shortDate(p.date)}</text>` : '').join('');
    const dots = points.length <= 7 ? points.map((p, i) => p.value === null ? '' : `<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="#61e4ce" stroke="#0c2e3c" stroke-width="2"><title>${shortDate(p.date)}: ${num(p.value)}</title></circle>`).join('') : '';
    $('chartArea').innerHTML = `<svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="areaFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#49dcc4" stop-opacity=".26"/><stop offset="100%" stop-color="#49dcc4" stop-opacity="0"/></linearGradient><linearGradient id="lineColor" x1="0" x2="1"><stop offset="0%" stop-color="#3e92d4"/><stop offset="100%" stop-color="#52dfc2"/></linearGradient></defs>${grid}<path d="${fill}" fill="url(#areaFade)"/><path d="${line}" fill="none" stroke="url(#lineColor)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
  }

  function renderDonut() {
    const chosen = selected();
    const values = chosen.map(account => ({ account, value: total('views', [account]) }));
    const valid = values.filter(item => item.value !== null);
    const sum = valid.reduce((acc, item) => acc + item.value, 0);
    $('donutValue').textContent = compact(sum || null);
    if (!sum) {
      $('donutChart').style.background = '#254454';
    } else {
      let offset = 0;
      const slices = valid.map(({ account, value }) => {
        const start = offset;
        offset += value / sum * 100;
        return `${account.color} ${start.toFixed(2)}% ${offset.toFixed(2)}%`;
      });
      $('donutChart').style.background = `conic-gradient(${slices.join(', ')})`;
    }
    $('donutLegend').innerHTML = values.map(({ account, value }) => `<div class="legend-item"><span class="swatch" style="background:${account.color}"></span><div><strong>${safeText(account.handle)}</strong><small>${value === null ? 'Нет данных · переподключение' : `${num(value)} · ${sum ? Math.round(value / sum * 100) : 0}%`}</small></div></div>`).join('');
  }

  function renderAccounts() {
    $('accountsGrid').innerHTML = selected().map(account => {
      const unavailable = account.status !== 'active';
      const views = total('views', [account]);
      return `<article class="account-card"><div class="account-head"><div class="account-avatar ${account.avatarClass}">${account.avatar}</div><div><strong>${safeText(account.handle)}</strong><small>${safeText(account.name)} · ${account.type}</small></div><span class="account-status ${unavailable ? 'warning' : ''}">${unavailable ? 'Требует входа' : 'Демо-активен'}</span></div><div class="account-stats"><div><span>Подписчики</span><strong>${num(account.followers)}</strong></div><div><span>Просмотры</span><strong>${num(views)}</strong></div></div><div class="account-foot ${unavailable ? 'warning' : ''}"><span>Состояние синхронизации</span><b>${unavailable ? 'Токен истёк (сценарий)' : 'Симуляция готова'}</b></div></article>`;
    }).join('');
  }

  function renderPosts() {
    const posts = postsForSelection();
    $('postsCount').textContent = `Показано ${posts.length} публикаций`;
    $('postsBody').innerHTML = posts.length ? posts.map(post => {
      const acc = byId(post.accountId);
      const metric = (value) => value === null ? `<span class="metric-unavailable" title="Метрика недоступна: нет ответа API или токен требует обновления">—</span>` : num(value);
      return `<tr><td><div class="post-cell"><div class="post-thumb" style="background:linear-gradient(130deg,${acc.color},#193b52)">${post.icon}</div><div><strong>${safeText(post.title)}</strong><small>${safeText(post.type)} · демо-ID ${safeText(post.id)}</small></div></div></td><td>${safeText(acc.handle)}</td><td>${shortDate(dayDate(post.daysAgo))}</td><td>${metric(post.views)}</td><td>${metric(post.reach)}</td><td>${metric(post.likes)}</td><td>${metric(post.saved)}</td></tr>`;
    }).join('') : `<tr><td colspan="7" style="text-align:center;padding:30px">За выбранный период публикаций нет.</td></tr>`;
  }

  function loadRuns() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      state.runs = Array.isArray(saved) ? saved.filter(item => item && typeof item.date === 'string' && typeof item.status === 'string').slice(0, 6) : [];
    } catch { state.runs = []; }
  }

  function renderLog() {
    $('syncLog').innerHTML = state.runs.length ? state.runs.map(run => `<div class="log-item"><div><strong>${safeText(run.name)}</strong><small>${safeText(run.date)}</small></div><span class="log-status ${run.status === 'warning' ? 'warning' : ''}">${run.status === 'warning' ? 'ВНИМАНИЕ' : 'ГОТОВО'}</span></div>`).join('') : '<div class="log-item"><div><strong>Синхронизация ещё не запускалась</strong><small>Нажмите «Обновить данные» для демонстрации</small></div></div>';
  }

  function render() {
    renderMetrics(); renderTrend(); renderDonut(); renderAccounts(); renderPosts(); renderLog();
  }

  function downloadCsv() {
    const rows = [['account_id', 'username', 'date', 'period', 'followers_snapshot', 'views', 'reach', 'unavailable_reason', 'source']];
    for (const account of selected()) {
      for (let i = state.days - 1; i >= 0; i -= 1) {
        const views = dailyMetric(account, i, 'views');
        const reach = dailyMetric(account, i, 'reach');
        rows.push([account.id, account.handle, isoDate(dayDate(i)), 'day', account.followers, views, reach, views === null ? 'reconnect_required' : '', 'synthetic_demo']);
      }
    }
    // Neutralize spreadsheet formula injection even if fixture data changes in the future.
    const cell = (v) => {
      const raw = v === null || v === undefined ? '' : String(v);
      const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const csv = '\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ld-latte-instagram-demo-${state.days}d.csv`;
    document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('CSV с синтетической статистикой готов.');
  }

  function upsertDemoSnapshots(accountList) {
    try {
      const saved = JSON.parse(localStorage.getItem(snapshotsKey) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) snapshotsCache = saved;
    } catch { /* Local storage is optional for the prototype. */ }

    let inserted = 0, updated = 0;
    for (const account of accountList) {
      for (let daysAgo = state.days - 1; daysAgo >= 0; daysAgo -= 1) {
        const date = isoDate(dayDate(daysAgo));
        const key = `${account.id}|${date}|day`;
        if (Object.hasOwn(snapshotsCache, key)) updated += 1;
        else inserted += 1;
        snapshotsCache[key] = {
          connection_id: account.id, period_start: date,
          period: 'day', views: dailyMetric(account, daysAgo, 'views'),
          reach: dailyMetric(account, daysAgo, 'reach'),
          source: 'synthetic_demo', collected_at: new Date().toISOString(),
        };
      }
    }
    try { localStorage.setItem(snapshotsKey, JSON.stringify(snapshotsCache)); } catch { /* Optional storage. */ }
    return { inserted, updated, total: Object.keys(snapshotsCache).length };
  }

  function simulateSync() {
    if (state.syncing) return;
    state.syncing = true;
    $('syncButton').disabled = true;
    $('syncButtonText').textContent = 'Синхронизация...';
    document.querySelector('.sync-icon').classList.add('spinning');
    window.setTimeout(() => {
      const now = new Date().toLocaleString('ru-RU');
      const active = selected().filter(account => account.status === 'active');
      const expired = selected().filter(account => account.status !== 'active');
      if (active.length) {
        const result = upsertDemoSnapshots(active);
        state.runs.unshift({ name: `Upsert: +${result.inserted}, обновлено ${result.updated} · всего ${result.total} уникальных снимков`, date: now, status: 'ok' });
      }
      if (expired.length) state.runs.unshift({ name: `Требуется переподключение: ${expired.map(a => a.handle).join(', ')}`, date: now, status: 'warning' });
      state.runs = state.runs.slice(0, 6);
      try { localStorage.setItem(storageKey, JSON.stringify(state.runs)); } catch { /* private mode may disable storage */ }
      state.syncing = false;
      $('syncButton').disabled = false;
      $('syncButtonText').textContent = 'Обновить данные';
      document.querySelector('.sync-icon').classList.remove('spinning');
      render();
      showToast(expired.length ? `Демо-синхронизация: ${active.length} успешно, ${expired.length} требуют переподключения. Реальных API-запросов не было.` : 'Демо-синхронизация завершена. Дубликаты не создаются.', Boolean(expired.length));
    }, 900);
  }

  function init() {
    loadRuns();
    const accountSelect = $('accountSelect');
    for (const account of accounts) {
      const option = document.createElement('option'); option.value = account.id; option.textContent = account.handle;
      accountSelect.append(option);
    }
    accountSelect.addEventListener('change', (event) => { state.accountId = event.target.value; render(); });
    $('periodSelect').addEventListener('change', (event) => { state.days = Number(event.target.value); render(); });
    document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => { state.chartMetric = button.dataset.metric; renderTrend(); }));
    $('syncButton').addEventListener('click', simulateSync);
    $('exportButton').addEventListener('click', downloadCsv);
    $('connectButton').addEventListener('click', () => showToast('Подключение через Meta OAuth не реализовано: это интерфейсный прототип. Для реальных аккаунтов нужен серверный OAuth.', true));
    $('resetButton').addEventListener('click', () => { state.runs = []; try { localStorage.removeItem(storageKey); localStorage.removeItem(snapshotsKey); } catch {} snapshotsCache = {}; renderLog(); showToast('История демо-синхронизации очищена.'); });
    render();
  }

  init();
})();
