# 🚀 Music Connect — Auditoria de Deploy (Protótipo)

## Veredicto Geral

| Área | Nota | Status |
|------|------|--------|
| **Backend** | 7/10 | ⚠️ Quase pronto — blockers são de **configuração**, não bugs |
| **Frontend** | 8/10 | ✅ Pronto — só precisa setar env vars no deploy |
| **Esforço estimado** | **~2h** | Maioria é config de ambiente |

> **ℹ️ IMPORTANTE:**
> O código está bem estruturado: auth sólido, validação Zod em tudo, rate-limiting, soft delete, health check, CORS. Os problemas são quase todos de **configuração para produção**, não defeitos de código.

---

## 🔴 Blockers (Tem que resolver antes de subir)

### Backend

| # | Problema | Esforço | Fix |
|---|----------|---------|-----|
| 1 | **Env vars apontam pra localhost** (`DATABASE_URL`, `BETTER_AUTH_URL`, `CORS_ORIGIN`) | 5 min | Setar as variáveis corretas na plataforma de deploy (Railway/Render) |
| 2 | **`BETTER_AUTH_SECRET` é o valor padrão** | 1 min | Gerar com `openssl rand -base64 48` e setar no deploy |
| 3 | **Sem graceful shutdown** (SIGTERM/SIGINT) | 5 min | Adicionar `process.on('SIGTERM', () => app.close())` no `index.ts` |
| 4 | **Sem script de migrate para produção** | 2 min | Adicionar `"db:migrate:deploy": "prisma migrate deploy"` no `package.json` |

### Frontend

| # | Problema | Esforço | Fix |
|---|----------|---------|-----|
| 5 | **`NEXT_PUBLIC_API_URL` precisa apontar pro backend de produção** | 2 min | Setar como env var no Vercel |
| 6 | **Wildcard `**` em `remotePatterns` de imagens** (risco de segurança) | 5 min | Restringir aos domínios reais (CDN, Google, etc.) |

---

## 🟡 Warnings (Bom arrumar, mas não quebra o protótipo)

### Backend

- **Uploads no disco local** — Em Railway/Render o filesystem é efêmero, arquivos somem no redeploy. Funciona pro protótipo se ninguém depender de uploads persistentes. Futuro: migrar pra S3/Cloudflare R2.
- **Recomendações carregam TODOS os artistas na memória** — OK pra poucos artistas, vai pesar em escala.
- **Reset de senha não funciona em produção** — O `sendResetPassword` só faz `console.log` em dev. Usuários não vão receber email de reset. Precisa configurar Resend/SendGrid.
- **`strict: false` no tsconfig** — Possíveis erros de null/undefined não são pegos em compile time.
- **Rate-limit é in-memory** — Funciona com 1 instância, mas não compartilha entre múltiplas instâncias (precisaria Redis store).
- **`pino-pretty` em dependencies** — Deveria estar em devDependencies.

### Frontend

- **Middleware de auth só verifica se o cookie existe** — Não valida o token. O backend rejeita requests inválidos, então funciona, mas é uma proteção fraca no client.
- **Stats fake na landing page** ("500+ Artistas", "1.2k Eventos") — Pode confundir se não há dados reais.
- **Links do footer são decorativos** — "Termos", "Privacidade" não levam a lugar nenhum.
- **`onKeyPress` deprecated** no Header — Trocar por `onKeyDown`.

---

## 🟢 Nice-to-haves (Polimento)

- Custom error pages (`error.tsx`, `not-found.tsx`)
- Open Graph / Twitter Card tags para SEO
- Favicon e branding customizados (atualmente usa SVGs do Next.js)
- CI/CD com deploy automático
- Testes (nenhum existe atualmente)
- Limpar arquivos deprecated (`src/routes/auth.ts`, `src/utils/auth.ts` são `export {}`)
- Migração completa do tema dark → tokens de CSS (algumas páginas ainda usam classes hardcoded)

---

## ✅ O que já tá bom

### 🔒 Segurança
- Auth com Better Auth + sessions, rate-limit em rotas sensíveis (5/min/IP)
- Helmet, CORS, validação de HTTPS em produção
- Zod em **todas** as rotas de input
- Checagem de ownership em todas as mutations

### 🏗️ Arquitetura
- Backend modular: rotas em arquivos separados, middleware de auth reutilizável
- Prisma v7 com driver adapter (`@prisma/adapter-pg`)
- 8 migrações em sync com o schema
- Soft delete em posts, comentários e propostas

### ⚡ Performance & Resiliência
- Cursor-based pagination no feed (scroll infinito)
- Redis com graceful degradation (não crasha se Redis estiver offline)
- Health check `/health` com latência do DB (pronto pra load balancer)
- Cron job de limpeza de stories com proteção contra overlap

### 🎨 Frontend
- Next.js 16 + React 19 + Tailwind v4 + Zustand
- Design system com tokens CSS, dark mode
- CI pipeline (lint + typecheck + build) no GitHub Actions
- API client configurável via env vars

---

## 📋 Plano de Deploy Sugerido

### Backend → [Railway](https://railway.app) ou [Render](https://render.com)

```bash
# Build command:
npm install && npx prisma generate && npx prisma migrate deploy && npm run build

# Start command:
npm start
```

**Env vars a setar:**

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/music_connect_db
BETTER_AUTH_SECRET=<gerar com openssl rand -base64 48>
BETTER_AUTH_URL=https://seu-backend.railway.app
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### Frontend → [Vercel](https://vercel.com)

Framework auto-detectado (Next.js), sem configuração extra necessária.

**Env vars a setar:**

```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

---

## 🎯 Conclusão

**Sim, dá pra deployar como protótipo.** O código está maduro o suficiente. Os "blockers" são todos de configuração de ambiente (~30 min de trabalho) + 3 linhas de graceful shutdown. Não há bugs críticos no código em si.

### O que fazer antes de subir:

1. ✅ Adicionar graceful shutdown (3 linhas)
2. ✅ Adicionar script `db:migrate:deploy`
3. ✅ Restringir wildcard de imagens no frontend
4. ⚙️ Configurar banco de dados na nuvem (Railway Postgres / Supabase / Neon)
5. ⚙️ Setar env vars de produção
6. 🚀 Deploy!

### O que pode ficar pro futuro:

- Migrar uploads pra S3
- Configurar email (SendGrid/Resend)
- Google OAuth em produção
- Testes automatizados

---

*Documento gerado em 20/05/2026 por auditoria automatizada.*
