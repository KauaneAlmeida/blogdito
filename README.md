# Partiu Intercâmbio — Blog + CMS

Blog dinâmico com painel admin, construído em Vite + vanilla JS e Supabase como backend (Postgres, Auth e Storage).

O conteúdo do site (posts, sidebar, seções dinâmicas, marquee, banner, rodapé) é editado pelo painel admin em `/admin.html` e renderizado em tempo real na home (`/`).

## Stack

- **Vite** — dev server e build
- **Vanilla JS** (ES modules) — sem framework
- **Supabase** — Postgres + Row Level Security, Auth (email/senha) e Storage (imagens)

## Estrutura

```
.
├── index.html              # Home do blog (slots dinâmicos)
├── admin.html              # Painel admin (login + dashboard)
├── sql/
│   └── schema.sql          # Tabelas, seeds, RLS e bucket de storage
├── src/
│   ├── lib/
│   │   └── supabase.js     # Cliente Supabase compartilhado
│   ├── blog/
│   │   ├── main.js         # Renderiza a home a partir do Supabase
│   │   └── style.css
│   └── admin/
│       ├── main.js         # Auth, tabs e bootstrap do painel
│       ├── posts.js        # CRUD dos posts (featured + grid)
│       ├── sidebar.js      # CRUD dos itens da sidebar
│       ├── sections.js     # CRUD das seções dinâmicas e seus cards
│       ├── config.js       # Editor de site_config (banner, marquee, rodapé)
│       ├── upload.js       # Upload de imagens pro Storage
│       ├── ui.js           # Toasts, modal e helpers
│       └── style.css
├── vite.config.js          # Multi-page (index + admin)
├── .env.example
└── package.json
```

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar projeto Supabase

Em [supabase.com](https://supabase.com), crie um projeto novo e pegue:

- `Project URL` (Settings → API)
- `anon public key` (Settings → API)

### 3. Aplicar o schema

Abra o SQL Editor do Supabase e cole o conteúdo de [sql/schema.sql](sql/schema.sql). Ele cria:

- Tabelas: `posts`, `sidebar_posts`, `sections`, `section_items`, `site_config`
- Seeds iniciais com o conteúdo atual do site
- Row Level Security: leitura pública, escrita só pro email admin
- Bucket `blog-images` no Storage

> **Importante**: o email admin está hardcoded nas policies (`blogdito07@gmail.com`). Se quiser outro, troque as ocorrências no `schema.sql` **antes** de rodar, ou altere as policies manualmente depois.

### 4. Criar usuário admin

No painel Supabase → Authentication → Users → Add user → Create new user. Use o mesmo email das policies do schema e defina uma senha.

### 5. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_ADMIN_EMAIL=blogdito07@gmail.com
```

### 6. Rodar em dev

```bash
npm run dev
```

- Home: http://localhost:5173/
- Admin: http://localhost:5173/admin.html

## Build de produção

```bash
npm run build
npm run preview
```

O output vai pra `dist/` com duas entries: `index.html` e `admin.html`.

## Como usar o painel admin

Acesse `/admin.html`, entre com o email e senha criados no Supabase.

### Aba Posts

- **Novo Post**: cria um post no grid principal. Marque "featured" pra fazer o post aparecer no topo (só um por vez — o admin desmarca os outros automaticamente).
- **Posição**: define a ordem dos posts no grid (menor número = primeiro).
- **Imagem de capa**: upload direto pro Supabase Storage.

### Aba Sidebar

Itens que aparecem na coluna lateral direita da home. Só precisam de título, categoria e posição.

### Aba Seções

Seções dinâmicas customizadas (ex.: "Guias", "Mais Lidas") que aparecem abaixo do marquee.

- Tipos: `grid-3` (3 colunas), `grid-2` (2 colunas), `featured` (um card destaque).
- Botões `↑` / `↓` reordenam as seções na home.
- `Ocultar` / `Mostrar` esconde a seção sem deletar.
- Dentro de cada seção, clique em **+ Adicionar card** pra criar itens (título, categoria, resumo, imagem, posição).

### Aba Configurações

Edita o `site_config` (key-value):

- **Banner**: badge, título, subtítulo e texto do botão.
- **Marquee**: as duas linhas de hashtags que rolam acima das seções dinâmicas. Use espaços entre as hashtags (ex.: `#INTERCÂMBIO #BOLSAS #EXTERIOR`).
- **Rodapé**: tagline e copyright.

Clique em **Salvar Tudo** pra persistir — um upsert é feito em todas as keys de uma vez.

## Como a segurança funciona

- O frontend usa a **anon key**, que é segura pra publicar.
- Todas as tabelas têm RLS ligado: leitura pública, escrita limitada a `auth.email() = <email admin>`.
- O Storage `blog-images` também é público pra leitura e restrito pra upload/update/delete.
- Mesmo que alguém descubra o endpoint do Supabase, sem estar logado como o email admin não consegue escrever nada.

## Troubleshooting

- **"Erro ao salvar / new row violates RLS"**: você está logado com um email diferente do configurado nas policies. Confira o `VITE_ADMIN_EMAIL` e as policies no SQL.
- **Upload de imagem falha**: verifique se o bucket `blog-images` existe e está público, e se as policies de `storage.objects` foram aplicadas.
- **Home não carrega nada**: abra o console do navegador — provavelmente as env vars estão faltando ou o schema não foi aplicado.
- **Marquee sumiu**: as keys `marquee_line_1` e `marquee_line_2` precisam existir em `site_config`. Rode o schema de novo pra popular os defaults.
