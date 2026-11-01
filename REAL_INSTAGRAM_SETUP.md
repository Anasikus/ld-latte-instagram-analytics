# Подключение реального Instagram — бесплатный тестовый режим

> Статус: **код интеграционного моста подготовлен, реальные подключения НЕ протестированы**. В этой ветке demo-графики не превращаются в реальные: отдельный блок показывает настоящие значения только после успешного ответа официального Meta API.

## Что нужно бесплатно

- Собственный Instagram аккаунт **Business или Creator** (не обычный Personal).
- Meta for Developers и Meta App с **Instagram API with Instagram Login**.
- Для собственного тестового аккаунта — соответствующая роль/допуск в App Dashboard и **Standard Access**, если Meta его предоставляет данному сценарию. Для сторонних аккаунтов обычно потребуется **Advanced Access / App Review**.
- Отдельный проект **Supabase Free** (рекомендуется, чтобы не затронуть основную LD LATTE БД).
- GitHub Pages для статического интерфейса. Дополнительный платный сервер не требуется.

Официальные источники для настройки: [Meta Instagram Platform](https://developers.facebook.com/docs/instagram-platform/) и [Instagram API Meta/Postman](https://www.postman.com/meta/instagram/collection/6yqw8pt/instagram-api).

## Шаг 1. Подготовить Instagram и Meta App

1. В Instagram откройте профиль → настройки → тип аккаунта / инструменты для профессионалов → переключитесь на **Creator** или **Business**, если ещё не сделали этого. Названия пунктов меню могут различаться.
2. Создайте приложение на [Meta for Developers](https://developers.facebook.com/apps/) с Instagram API / Instagram Login. **Не** выбирайте Facebook Login, если не планируете привязку Facebook Page.
3. Настройте Instagram API и разрешения:
   - `instagram_business_basic` для чтения профиля и списка публикаций;
   - `instagram_business_manage_insights` для insights (при наличии доступа).
4. Добавьте свой профессиональный профиль к тестовым аккаунтам / ролям приложения, при необходимости примите приглашение в Instagram.
5. Получите **access token собственного тестового Instagram-аккаунта** через App Dashboard в соответствии с выбранным режимом. Не отправляйте токен в чат и не вставляйте в GitHub.
6. Учитывайте сроки действия: краткосрочный токен быстро истекает, долгосрочный токен в Instagram Login имеет ограниченный срок действия; для постоянной работы понадобится серверное обновление/переподключение. В этой первой версии токен заменяется вручную в секретах Supabase.

**Важно:** пока у Meta нет подтверждённого доступа к выбранным метрикам, UI отображает «—»; это не нулевое значение.

## Шаг 2. Создать отдельный Supabase Free проект

1. Создайте проект Supabase и включите email/password authentication.
2. Создайте и подтвердите **собственный тестовый аккаунт Supabase Auth**. Запишите его UUID из **Authentication → Users**.
3. В **Project Settings → API Keys** найдите **Project URL** и **Publishable Key**.
4. В **Edge Functions → Secrets** создайте секреты:

| Secret | Значение |
| --- | --- |
| `IG_TEST_ACCESS_TOKEN` | действующий Instagram User access token, только для собственного тестового аккаунта |
| `IG_ALLOWED_USER_ID` | UUID вашего тестового пользователя Supabase Auth |
| `IG_ALLOWED_ORIGIN` | `https://anasikus.github.io` — origin опубликованного GitHub Pages, **без** пути |

Не присылайте секреты в чат, не кладите их в `real-config.js`, README, Issues, Postman-коллекции или код GitHub. `IG_ALLOWED_ORIGIN` — адрес origin, поэтому для GitHub Pages это `https://anasikus.github.io`, не полный путь проекта.

## Шаг 3. Развернуть Edge Function

В каталоге репозитория на Windows PowerShell:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref ВАШ_PROJECT_REF
npx.cmd supabase functions deploy instagram-live --use-api
```

Если используете новый интерфейс Supabase, функцию также можно создать через Dashboard и вставить содержимое файла `supabase/functions/instagram-live/index.ts`.

**Docker для API-based deployment не нужен**, Supabase CLI может использовать `--use-api`. Убедитесь, что вы указали проект тестовой аналитики, а не Supabase основного приложения.

Проверка: функция доступна по адресу `https://ВАШ_PROJECT_REF.supabase.co/functions/v1/instagram-live`. Запрос без пользовательского JWT не должен отдавать статистику.

## Шаг 4. Включить интерфейс

В этой ветке откройте `real-config.js` и заполните только **публичные** значения:

```js
window.IG_LIVE_CONFIG = {
  supabaseUrl: 'https://ВАШ_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'sb_publishable_...',
};
```

Публикация этих двух значений допустима: Supabase Publishable Key предназначен для браузера. **Meta access token, Meta App Secret и Supabase Secret Key сюда не добавлять.**

После локальной проверки можно объединить feature-ветку с `main` нового репозитория и обновить GitHub Pages. Исходный проект `ld-latte-automation` не меняется.

## Шаг 5. Демонстрация

1. Откройте приложение: большая панель ниже шапки — **«Подключение собственного Instagram»**.
2. Введите логин и пароль **тестового Supabase Auth пользователя**, не Instagram.
3. Нажмите «Войти», затем «Получить реальные метрики».
4. Отдельная панель отобразит подтверждённые Meta API: `username`, `followers_count`, `media_count`, до 12 публикаций; `reach` / `views` — только если API/разрешения реально возвращают эти значения.
5. Проверьте, что три синтетических профиля и демо-графики ниже остались без изменений.

## Контроль безопасности и ограничения MVP

- Серверный токен Meta **никогда не передаётся в браузер**; Edge Function обращается только к `graph.instagram.com`.
- Выдача статистики требует действительной сессии Supabase Auth **именно пользователя**, указанного в `IG_ALLOWED_USER_ID`.
- CORS ограничен указанным origin, а также локальным `localhost` для разработки. **CORS не заменяет авторизацию**.
- Данные реального аккаунта не сохраняются в БД, не смешиваются с синтетическими графиками; это запрос «по кнопке» для одного тестового аккаунта.
- Пагинация публикаций, автоматическое обновление 60-дневного токена, полноценный Meta OAuth и работа с несколькими реальными аккаунтами — **следующие этапы**, а не функции этого MVP.
- При 401/403/просрочке Instagram-токена функция вернёт общую ошибку без раскрытия токена.
- Прежде чем считать работу готовой, необходимо выполнить ручные тесты: успешный запрос; неавторизованный запрос (401); другой пользователь (403); неверный токен (502); недоступные insights (null, не 0); мобильный экран; отсутствие секретов в Git/Network.

**Ничего в этом документе не означает, что реальный Meta API уже подключён или протестирован.**
