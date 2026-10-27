# CYB Study Studio

[Live website / 在线使用](https://cyb-study-studio-hao-6-9.jzhou6.chatgpt.site)

Bilingual quiz practice with shuffled question/option order, vocabulary hints, mistake review, browser-local guest progress and account-isolated cloud progress.

双语刷题工具：随机题序及选项、单词翻译、错题复习、游客本机进度和登录后的跨设备同步。

## Start locally

Node.js >=22.13 is required (Node 24 for the included SQLite tests).

For a standalone offline HTML file, run `node build-offline.cjs` and open `.sites-runtime/offline.html`. It needs no server and has no cloud sync, presence list or server-enforced course visibility. Keep this generated file local rather than deploying it as a public asset.

无需服务器的离线版：运行 `node build-offline.cjs`，打开生成的 `.sites-runtime/offline.html`。此版本没有云同步、在线昵称或服务器题库开关，生成文件仅用于本机。

1. Install dependencies: `npm ci`.
2. Set your own Sites project ID in `.openai/hosting.json`. The example ID is intentionally not a live deployment.
3. Run `node build-practice.cjs`, then `npm run build`.
4. Apply SQL files under `drizzle/` in order to your LOCAL D1 database using the Wrangler command below. Do not replay applied migrations.
5. Run `npm run dev` and open the printed local URL.

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_gorgeous_caretaker.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_careful_tag.sql
```

The supplied starter supports Sites-managed Cloudflare Workers/D1. Sites supplies trusted account identity. Simply putting this repository on GitHub Pages will not run its server APIs. Porting to another host requires trusted authentication and database bindings. Never expose a raw deployment that accepts client-forged `oai-authenticated-user-id` headers. Development mock authentication is LOCAL ONLY.

当前完整版本依赖 Sites 的身份验证和 Workers／D1。上传 GitHub 不会自动部署后端；迁移其他平台必须接入可信登录与数据库，不能信任用户自行传入的身份头。

## Administrator

Configure `STUDY_ADMIN_USER_ID` as a SECRET production environment variable using the owner's site-specific authenticated ID. Optionally set `STUDY_ADMIN_EMAIL` as a SECRET fallback matched only against the hosting platform's trusted authenticated email header. Keep both out of the repository. Without either value, administration is denied. `/welcome.html` and practice pages show administrator controls only to that identity. Course visibility is enforced server-side. Hiding stops new downloads, not previously saved or open-source copies. Administrators can hide active nicknames.

管理员身份通过服务器私密环境变量设置；未配置时拒绝管理操作。管理员在题库入口或练习页底部可切换课程题库展示，也可隐藏在线昵称。

## Guests and accounts

- Guests practice without login; answers remain in the current browser.
- Nickname sharing is optional and off by default. Shared nicknames are public, unverified and may repeat. The list covers approximately 90 seconds of recent activity.
- Course mode supports signed-in cross-device sync; demo mode is local only. Different accounts have isolated local/cloud records.
- Guest progress is not silently assigned to an account after sign-in. A newly used account can explicitly import the browser's guest records; existing cloud/local records are handled separately. Export important records before changing modes. JSON progress exports are personal files, distinct from question-bank exports.
- Deleting cloud progress keeps a minimal tombstone to stop automatic re-upload by stale devices. Manual exports cannot be remotely removed.
- Review `/privacy.html` before operating a public instance. This is a learning tool, not a graded-exam system.

## Replace the question bank

The program uses stable unit, question and option IDs. Each question needs `id`, `en`, `zh`, `options`, and an `answer` matching an option ID. Options contain `id`, `en`, `zh`. A bank has `id`, `title`, `units` and an optional `glossary` mapping English terms to Chinese meanings. See `lib/example-bank.json`.

Use Import in the practice interface for your own browser/account, or replace the JSON script with `id="bank"` in `practice-base.html` to change the distributed course bank. Then run `node build-practice.cjs`. Avoid hand-editing generated `public/practice.html` or `public/practice-app.js`.

## Validation

```
node build-practice.cjs
node test-shuffle.cjs
node test-sync.mjs
node test-public.mjs
npm run build
```

## Open source and deployment

Program code: MIT; third-party notices are retained. Course content: see `CONTENT-NOTICE.md`.

Publish the sanitized source package as a NEW GitHub repository with new history. Do not upload the original project mirror, existing private Git history, runtime folders, database files, credentials, private exports, or personal screenshots. The package replaces the original hosting identity with a placeholder. Add your own screenshots and deployed URL after review.

Use `npm ci` with the included lockfile. Review dependency advisories and hosting quotas before a larger launch. The application limits new nickname sessions and signed-in progress writes; these controls do not replace edge-level abuse protection at high traffic.

公开源码包不包含原 Git 历史、个人进度、运行时数据库或登录密钥。建议新建 GitHub 仓库上传。大规模开放前应复查依赖安全、托管额度与平台侧限流。
