-- Dados de exemplo para testar o projeto "controle-de-gastos"
-- Este arquivo contém duas seções:
--  1) MySQL (backend-php)
--  2) SQLite (backend Node/Prisma)
-- Use SOMENTE a seção correspondente ao seu backend.

-- Como usar (MySQL):
--  - Garanta que o schema do backend-php está criado (backend-php/schema.sql).
--  - Configure DATABASE_URL para MySQL e rode estes comandos no seu banco.

-- Como usar (SQLite/Prisma):
--  - Garanta que o banco SQLite (backend/prisma/dev.db) está com tables criadas via Prisma.
--  - Execute apenas a segunda seção em um cliente SQLite (ou via script).

-- OBS: Os dados cobrem os últimos 12 meses com receitas, despesas, categorias,
--      orçamentos, metas, favorecidos, regras recorrentes e transações.

/* ======================================================================
   SEÇÃO 1: MySQL (backend-php)
   ====================================================================== */
-- Execute apenas se estiver usando o backend PHP.
-- Ajuste se necessário: usuário de teste, contas, categorias, etc.

-- Limpeza leve do usuário de demonstração (evita duplicidade)
DELETE FROM users WHERE email='demo@controle.local';

-- Usuário de teste (senha em texto para facilitar login; o backend re-hash automaticamente)
INSERT INTO users (name,email,password,created_at)
VALUES ('Usuário Demo','demo@controle.local','demo123', NOW());

-- Variáveis de apoio
SET @uid := (SELECT id FROM users WHERE email='demo@controle.local' LIMIT 1);
SET @today := CURDATE();

-- Contas
INSERT INTO accounts (user_id,name,type,currency,opening_balance,display_order,created_at)
VALUES 
  (@uid,'Conta Corrente','checking','BRL',1000.00,1,NOW()),
  (@uid,'Cartão de Crédito','credit_card','BRL',0.00,2,NOW()),
  (@uid,'Poupança','savings','BRL',500.00,3,NOW());

SET @acc_checking := (SELECT id FROM accounts WHERE user_id=@uid AND name='Conta Corrente' LIMIT 1);
SET @acc_credit   := (SELECT id FROM accounts WHERE user_id=@uid AND name='Cartão de Crédito' LIMIT 1);
SET @acc_savings  := (SELECT id FROM accounts WHERE user_id=@uid AND name='Poupança' LIMIT 1);

-- Categorias
INSERT INTO categories (user_id,type,name,created_at)
VALUES
  (@uid,'RECEITA','Salário',NOW()),
  (@uid,'RECEITA','Freelance',NOW()),
  (@uid,'DESPESA','Aluguel',NOW()),
  (@uid,'DESPESA','Mercado',NOW()),
  (@uid,'DESPESA','Energia',NOW()),
  (@uid,'DESPESA','Água',NOW()),
  (@uid,'DESPESA','Internet',NOW()),
  (@uid,'DESPESA','Transporte',NOW()),
  (@uid,'DESPESA','Lazer',NOW());

SET @cat_salary   := (SELECT id FROM categories WHERE user_id=@uid AND name='Salário' LIMIT 1);
SET @cat_freela   := (SELECT id FROM categories WHERE user_id=@uid AND name='Freelance' LIMIT 1);
SET @cat_rent     := (SELECT id FROM categories WHERE user_id=@uid AND name='Aluguel' LIMIT 1);
SET @cat_market   := (SELECT id FROM categories WHERE user_id=@uid AND name='Mercado' LIMIT 1);
SET @cat_energy   := (SELECT id FROM categories WHERE user_id=@uid AND name='Energia' LIMIT 1);
SET @cat_water    := (SELECT id FROM categories WHERE user_id=@uid AND name='Água' LIMIT 1);
SET @cat_internet := (SELECT id FROM categories WHERE user_id=@uid AND name='Internet' LIMIT 1);
SET @cat_transport:= (SELECT id FROM categories WHERE user_id=@uid AND name='Transporte' LIMIT 1);
SET @cat_fun      := (SELECT id FROM categories WHERE user_id=@uid AND name='Lazer' LIMIT 1);

-- Favorecidos (payees)
INSERT INTO payees (user_id,name,created_at)
VALUES
  (@uid,'Empresa X',NOW()),
  (@uid,'Proprietário',NOW()),
  (@uid,'Supermercado Bom Preço',NOW()),
  (@uid,'Concessionária Energia',NOW()),
  (@uid,'Companhia de Água',NOW()),
  (@uid,'Operadora Internet',NOW()),
  (@uid,'App Transporte',NOW());

SET @pay_employer  := (SELECT id FROM payees WHERE user_id=@uid AND name='Empresa X' LIMIT 1);
SET @pay_landlord  := (SELECT id FROM payees WHERE user_id=@uid AND name='Proprietário' LIMIT 1);
SET @pay_market    := (SELECT id FROM payees WHERE user_id=@uid AND name='Supermercado Bom Preço' LIMIT 1);
SET @pay_energy    := (SELECT id FROM payees WHERE user_id=@uid AND name='Concessionária Energia' LIMIT 1);
SET @pay_water     := (SELECT id FROM payees WHERE user_id=@uid AND name='Companhia de Água' LIMIT 1);
SET @pay_internet  := (SELECT id FROM payees WHERE user_id=@uid AND name='Operadora Internet' LIMIT 1);
SET @pay_transport := (SELECT id FROM payees WHERE user_id=@uid AND name='App Transporte' LIMIT 1);

-- Tags
INSERT INTO tags (user_id,name,created_at)
VALUES
  (@uid,'fixo',NOW()),
  (@uid,'variável',NOW()),
  (@uid,'essencial',NOW()),
  (@uid,'não essencial',NOW()),
  (@uid,'supermercado',NOW());

SET @tag_fixo       := (SELECT id FROM tags WHERE user_id=@uid AND name='fixo' LIMIT 1);
SET @tag_variavel   := (SELECT id FROM tags WHERE user_id=@uid AND name='variável' LIMIT 1);
SET @tag_essencial  := (SELECT id FROM tags WHERE user_id=@uid AND name='essencial' LIMIT 1);
SET @tag_naoess     := (SELECT id FROM tags WHERE user_id=@uid AND name='não essencial' LIMIT 1);
SET @tag_market     := (SELECT id FROM tags WHERE user_id=@uid AND name='supermercado' LIMIT 1);

-- Orçamentos por categoria/mês (para os últimos 12 meses)
WITH RECURSIVE months AS (
  SELECT 0 AS m
  UNION ALL SELECT m+1 FROM months WHERE m < 11
)
INSERT INTO budgets (user_id,category_id,month,amount)
SELECT @uid, c.id, DATE_SUB(DATE_FORMAT(@today,'%Y-%m-01'), INTERVAL m MONTH) AS month,
       CASE c.name
         WHEN 'Mercado' THEN 800.00
         WHEN 'Energia' THEN 200.00
         WHEN 'Água' THEN 120.00
         WHEN 'Internet' THEN 120.00
         WHEN 'Transporte' THEN 250.00
         WHEN 'Lazer' THEN 300.00
         WHEN 'Aluguel' THEN 1500.00
         ELSE 0.00
       END AS amount
FROM months
JOIN categories c ON c.user_id=@uid AND c.type='DESPESA';

-- Meta simples (goal)
INSERT INTO goals (user_id,name,type,target_amount,initial_amount,strategy,account_id,category_id,target_date,planned_monthly_amount,priority,created_at)
VALUES (@uid,'Reserva de Emergência','poupanca',5000.00,500.00,'linear',@acc_savings,NULL,DATE_ADD(@today, INTERVAL 6 MONTH),400.00,'alta',NOW());
SET @goal_emerg := (SELECT id FROM goals WHERE user_id=@uid AND name='Reserva de Emergência' LIMIT 1);

-- Regras recorrentes (mensais)
INSERT INTO recurring_rules (user_id,account_id,type,amount,description,category_id,payee_id,interval_unit,interval_count,next_run,end_date,payment_status,mode,notify_days,created_at)
VALUES
  (@uid,@acc_checking,'RECEITA',6000.00,'Salário mensal',@cat_salary,@pay_employer,'month',1,DATE_FORMAT(DATE_ADD(@today, INTERVAL 1 MONTH),'%Y-%m-01'),NULL,'pendente','automatic',3,NOW()),
  (@uid,@acc_checking,'DESPESA',1500.00,'Aluguel mensal',@cat_rent,@pay_landlord,'month',1,DATE_FORMAT(DATE_ADD(@today, INTERVAL 1 MONTH),'%Y-%m-05'),NULL,'pendente','manual',5,NOW()),
  (@uid,@acc_checking,'DESPESA',120.00,'Internet banda larga',@cat_internet,@pay_internet,'month',1,DATE_FORMAT(DATE_ADD(@today, INTERVAL 1 MONTH),'%Y-%m-10'),NULL,'pendente','manual',3,NOW());

/* Transações dos últimos 12 meses
   - Salário (dia 01) - RECEITA
   - Aluguel (dia 05) - DESPESA
   - Energia (dia 10) - DESPESA
   - Água (dia 12) - DESPESA
   - Internet (dia 15) - DESPESA
   - Mercado (dias 03, 10, 17, 24) - DESPESA
   - Transporte (dias 08, 22) - DESPESA
   - Lazer (dia 27) - DESPESA
   - Freelance esporádico (mês sim, mês não, dia 20) - RECEITA
*/
WITH RECURSIVE months AS (
  SELECT 0 AS m
  UNION ALL SELECT m+1 FROM months WHERE m < 11
), ms AS (
  SELECT DATE_SUB(DATE_FORMAT(@today,'%Y-%m-01'), INTERVAL m MONTH) AS month_start, m FROM months
)
-- Salário
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'RECEITA',6000.00, month_start, CONCAT('Salário ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_salary,@pay_employer,'CLEARED','pago',NOW()
FROM ms;

-- Aluguel
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',1500.00, DATE_ADD(month_start, INTERVAL 5 DAY), CONCAT('Aluguel ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_rent,@pay_landlord,'CLEARED','pago',NOW()
FROM ms;

-- Energia
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',200.00, DATE_ADD(month_start, INTERVAL 10 DAY), CONCAT('Energia ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_energy,@pay_energy,'CLEARED',IF(m IN (0,1), 'pendente', 'pago'),NOW()
FROM ms;

-- Água
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',120.00, DATE_ADD(month_start, INTERVAL 12 DAY), CONCAT('Água ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_water,@pay_water,'CLEARED','pago',NOW()
FROM ms;

-- Internet
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',120.00, DATE_ADD(month_start, INTERVAL 15 DAY), CONCAT('Internet ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_internet,@pay_internet,'CLEARED',IF(m=0,'pendente','pago'),NOW()
FROM ms;

-- Mercado: 4 compras/mês
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',
       CASE d WHEN 3 THEN 180 WHEN 10 THEN 220 WHEN 17 THEN 200 ELSE 210 END,
       DATE_ADD(month_start, INTERVAL d DAY), CONCAT('Mercado ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_market,@pay_market,'CLEARED','pago',NOW()
FROM ms CROSS JOIN (SELECT 3 AS d UNION ALL SELECT 10 UNION ALL SELECT 17 UNION ALL SELECT 24) dd;

-- Transporte: 2 por mês
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',
       CASE d WHEN 8 THEN 60 ELSE 55 END,
       DATE_ADD(month_start, INTERVAL d DAY), CONCAT('Transporte ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_transport,@pay_transport,'CLEARED','pago',NOW()
FROM ms CROSS JOIN (SELECT 8 AS d UNION ALL SELECT 22) dd;

-- Lazer: 1 por mês
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'DESPESA',
       120.00,
       DATE_ADD(month_start, INTERVAL 27 DAY), CONCAT('Lazer ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_fun,NULL,'CLEARED','pago',NOW()
FROM ms;

-- Freelance: meses pares (m % 2 = 0), dia 20
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,created_at)
SELECT @uid,@acc_checking,'RECEITA',
       1500.00,
       DATE_ADD(month_start, INTERVAL 20 DAY), CONCAT('Freelance ', DATE_FORMAT(month_start,'%b/%Y')),
       @cat_freela,NULL,'CLEARED','pago',NOW()
FROM ms WHERE (m % 2) = 0;

-- Contribuições à meta: transfere para Poupança (associa goal_id)
-- Seleciona a transação de salário de cada mês e marca uma contribuição de 400 para a meta
INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,payment_status,goal_id,created_at)
SELECT @uid,@acc_savings,'RECEITA',400.00, month_start, CONCAT('Aporte meta emergência ', DATE_FORMAT(month_start,'%b/%Y')),
       NULL,NULL,'CLEARED','pago',@goal_emerg, NOW()
FROM ms;

-- Vincular tags às transações fixas (aluguel e internet)
INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT t.id, @tag_fixo FROM transactions t
WHERE t.user_id=@uid AND t.category_id IN (@cat_rent, @cat_internet);

-- Vincular tag "supermercado" às compras de mercado
INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT t.id, @tag_market FROM transactions t
WHERE t.user_id=@uid AND t.category_id=@cat_market;

-- Criar splits em uma compra de mercado recente
SET @tx_mercado := (
  SELECT t.id FROM transactions t
  WHERE t.user_id=@uid AND t.category_id=@cat_market
  ORDER BY t.date DESC LIMIT 1
);
INSERT INTO transaction_splits (transaction_id, amount, description, category_id, payee_id)
VALUES
  (@tx_mercado, 80.00, 'Hortifruti', @cat_market, @pay_market),
  (@tx_mercado, 40.00, 'Açougue', @cat_market, @pay_market);

-- Anexo de exemplo
INSERT INTO attachments (user_id,transaction_id,filename,path,mime,size,created_at)
VALUES (@uid,@tx_mercado,'nota-fiscal.pdf','/uploads/nota-fiscal.pdf','application/pdf',123456,NOW());

/* ======================================================================
   SEÇÃO 2: SQLite (backend Node/Prisma)
   ====================================================================== */
-- Execute apenas se estiver usando o backend Node com Prisma (SQLite).
-- As tabelas: users, accounts, categories, transactions, goals
-- Datas relativas aos últimos 12 meses usando funções de data do SQLite.

-- Remove usuário demo se existir (SQLite não suporta DELETE ... LIMIT diretamente)
DELETE FROM users WHERE email='demo@controle.local';

-- Usuário de teste
INSERT INTO users (name,email,password,created_at,updated_at)
VALUES ('Usuário Demo','demo@controle.local','demo123',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- IDs auxiliares
-- OBS: em SQLite você pode usar subselects diretamente nas inserções

-- Contas
INSERT INTO accounts (name,balance,user_id,created_at,updated_at)
SELECT 'Conta Corrente', 1000.00, u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users u WHERE u.email='demo@controle.local';
INSERT INTO accounts (name,balance,user_id,created_at,updated_at)
SELECT 'Poupança', 500.00, u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users u WHERE u.email='demo@controle.local';

-- Categorias
INSERT INTO categories (name,type,user_id,created_at,updated_at)
SELECT 'Salário','income', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users u WHERE u.email='demo@controle.local';
INSERT INTO categories (name,type,user_id,created_at,updated_at)
SELECT 'Aluguel','expense', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users u WHERE u.email='demo@controle.local';
INSERT INTO categories (name,type,user_id,created_at,updated_at)
SELECT 'Mercado','expense', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users u WHERE u.email='demo@controle.local';
INSERT INTO categories (name,type,user_id,created_at,updated_at)
SELECT 'Internet','expense', u.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM users u WHERE u.email='demo@controle.local';

-- Transações para 12 meses
-- m = 0..11 meses atrás
WITH RECURSIVE months(m) AS (
  SELECT 0 UNION ALL SELECT m+1 FROM months WHERE m < 11
), base AS (
  SELECT 
    (SELECT id FROM users WHERE email='demo@controle.local') AS uid,
    (SELECT id FROM accounts WHERE name='Conta Corrente' AND user_id=uid) AS acc_checking,
    (SELECT id FROM accounts WHERE name='Poupança' AND user_id=uid) AS acc_savings,
    (SELECT id FROM categories WHERE name='Salário' AND user_id=uid) AS cat_salary,
    (SELECT id FROM categories WHERE name='Aluguel' AND user_id=uid) AS cat_rent,
    (SELECT id FROM categories WHERE name='Mercado' AND user_id=uid) AS cat_market,
    (SELECT id FROM categories WHERE name='Internet' AND user_id=uid) AS cat_internet
)
-- Salário (dia 01)
INSERT INTO transactions (description,amount,type,date,user_id,account_id,category_id,payment_status,created_at,updated_at)
SELECT 
  'Salário ' || strftime('%m/%Y', date('now','start of month','-'||m||' months')),
  6000.00,
  'income',
  datetime(date('now','start of month','-'||m||' months')), 
  base.uid, base.acc_checking, base.cat_salary,
  'pago', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM months, base;

-- Aluguel (dia 05)
INSERT INTO transactions (description,amount,type,date,user_id,account_id,category_id,payment_status,created_at,updated_at)
SELECT 
  'Aluguel ' || strftime('%m/%Y', date('now','start of month','-'||m||' months')),
  1500.00,
  'expense',
  datetime(date('now','start of month','-'||m||' months','+5 days')),
  base.uid, base.acc_checking, base.cat_rent,
  'pago', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM months, base;

-- Internet (dia 15)
INSERT INTO transactions (description,amount,type,date,user_id,account_id,category_id,payment_status,created_at,updated_at)
SELECT 
  'Internet ' || strftime('%m/%Y', date('now','start of month','-'||m||' months')),
  120.00,
  'expense',
  datetime(date('now','start of month','-'||m||' months','+15 days')),
  base.uid, base.acc_checking, base.cat_internet,
  CASE WHEN m=0 THEN 'pendente' ELSE 'pago' END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM months, base;

-- Mercado (dias 03, 10, 17, 24)
INSERT INTO transactions (description,amount,type,date,user_id,account_id,category_id,payment_status,created_at,updated_at)
SELECT 
  'Mercado ' || strftime('%m/%Y', date('now','start of month','-'||m||' months')),
  CASE d WHEN 3 THEN 180 WHEN 10 THEN 220 WHEN 17 THEN 200 ELSE 210 END,
  'expense',
  datetime(date('now','start of month','-'||m||' months','+'||d||' days')),
  base.uid, base.acc_checking, base.cat_market,
  'pago', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM months, (SELECT 3 AS d UNION ALL SELECT 10 UNION ALL SELECT 17 UNION ALL SELECT 24) dd, base;

-- Meta (goal) e contribuições mensais para poupança
INSERT INTO goals (name,target_value,current_value,target_date,user_id,account_id,category_id,created_at,updated_at)
SELECT 'Reserva de Emergência', 5000.00, 500.00,
       datetime(date('now','start of month','+6 months')),
       base.uid, base.acc_savings, NULL,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM base;

-- Aporte mensal na poupança (associado à meta se desejar via aplicação)
INSERT INTO transactions (description,amount,type,date,user_id,account_id,category_id,payment_status,created_at,updated_at)
SELECT 
  'Aporte meta emergência ' || strftime('%m/%Y', date('now','start of month','-'||m||' months')),
  400.00,
  'income',
  datetime(date('now','start of month','-'||m||' months')),
  base.uid, base.acc_savings, NULL,
  'pago', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM months, base;

-- Fim da seção SQLite