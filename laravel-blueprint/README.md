# Laravel 11 Blueprint (pt-BR)

Este diretório contém migrations e seeders alinhados às especificações do seu app financeiro (single-user). Use-os em um projeto Laravel 11 novo.

Passo-a-passo (resumo)
- Crie um app Laravel 11 (PHP 8.3+).
- Instale Breeze (Blade, Tailwind, Alpine) e desative registro público.
- Copie a pasta `database/` deste blueprint para o seu projeto (mesclando com a existente).
- Ajuste `.env` (APP_KEY, DB, QUEUE=database, SESSION_DRIVER=database, TZ=America/Sao_Paulo, APP_LOCALE=pt_BR).
- Rode: `php artisan migrate --seed` (inclui RootUserSeeder).
- Ative filas (queue:work) e cron (schedule:run) conforme README do seu projeto.

Observações
- Migrations cobrem: users, accounts, categories (hierárquicas), tags, payees, transactions (inclui splits/tags), attachments, recorrências, budgets (periods/allocations), goals, import (batches/rows), reconciliation (itens), sessions, jobs/failed_jobs.
- Índices e constraints conforme especificação.
- Seeds: cria usuário raiz (e-mail/senha via .env ou defaults).
