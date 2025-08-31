# Finance App (Monorepo)

Aplicativo web de controle financeiro pessoal (receitas/despesas) com React + Node + Prisma + MySQL.

## Requisitos
- Node.js LTS (>= 20)
- MySQL (pode ser via XAMPP, WAMP, Laragon ou hospedagem com phpMyAdmin)

## Configuração (sem Docker)
1. Crie um banco MySQL e pegue a URL de conexão (ex.: `mysql://user:pass@localhost:3306/finance_app`).
2. Copie `.env.example` para `.env` na raiz e ajuste:
	- `DATABASE_URL` apontando para seu MySQL (XAMPP/WAMP/hospedagem).
	- `APP_URL` = `http://localhost:3000` (para testes locais) ou domínio de produção.
3. Na raiz do projeto, rode uma única vez para preparar tudo e iniciar o servidor:

```
# Finance App (frontend + backend PHP)

Aplicativo de controle financeiro com frontend (Vite/React) e backend em PHP (PDO + JWT) usando MySQL.

## Requisitos
- Node.js LTS (>= 20)
- MySQL (XAMPP/WAMP/Laragon ou hospedagem com phpMyAdmin)

## Configuração e uso (local, sem Docker)
1. Crie o banco no MySQL (via phpMyAdmin, por exemplo) e anote a URL, ex.: `mysql://root@localhost:3306/finance`.
2. Copie `.env.example` para `.env` na raiz e ajuste:
	- `DATABASE_URL` apontando para seu MySQL
	- `APP_URL` = `http://localhost:3000`
3. Na raiz do projeto, faça o build (gera pasta `dist/` pronta para subir):

```powershell
npm run build
```

4. Em outro terminal, aplique as migrations e (opcional) seed dentro de `backend`:

```powershell
cd backend
npm run db:migrate
npm run db:seed   # opcional
```

Conteúdo gerado:
- `dist/frontend` → arquivos estáticos (index.html + assets) para colocar em `public_html/` ou `htdocs/`.
- `dist/api` → backend PHP (coloque esta pasta como `/api` no hosting). Há também `dist/schema.sql` e `.env.example` para configuração.

## Scripts
- `npm run build`  → builda o frontend e empacota `dist/` com frontend + api PHP

## Publicação em hospedagem com phpMyAdmin (PHP)
- Suba o conteúdo de `dist/frontend` para `public_html/`.
- Suba a pasta `dist/api` para `public_html/api` (ou outro subdiretório) e garanta que o `.htaccess` aplicativo funcione (mod_rewrite habilitado).
- Crie o banco MySQL e execute `dist/schema.sql` no phpMyAdmin.
- Crie um arquivo `.env` dentro de `public_html/api` baseado em `dist/.env.example` (defina `DATABASE_URL`, `JWT_SECRET`, etc.).
- Ajuste o frontend para chamar a API em `/api/...` (já apontado por padrão se hospedado junto).

## Notas
- JWT Access + Refresh (cookie httpOnly). Helmet, CORS, rate limit.
- Locale `pt-BR`, timezone `America/Sao_Paulo`, moeda BRL.

## Pasta do projeto
- `frontend/` React + TS + Vite + Tailwind
- `backend-php/` API PHP (código-fonte)
