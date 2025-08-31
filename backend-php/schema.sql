-- Minimal schema for PHP backend
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  type ENUM('cash','checking','savings','credit_card','wallet','investment') NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id),
  UNIQUE KEY uniq_account_user_name (user_id, name),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('RECEITA','DESPESA') NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id),
  CONSTRAINT fk_cat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payees (Favorecidos) - MUST be created before transactions (FK)
CREATE TABLE IF NOT EXISTS payees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_payee_user_name (user_id, name),
  INDEX (user_id),
  CONSTRAINT fk_payee_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  account_id INT NOT NULL,
  type ENUM('RECEITA','DESPESA') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(255) NULL,
  category_id INT NULL,
  payee_id INT NULL,
  transfer_group VARCHAR(36) NULL,
  status ENUM('PENDING','CLEARED','RECONCILED') NOT NULL DEFAULT 'CLEARED',
  created_at DATETIME NOT NULL,
  INDEX (user_id, account_id, date),
  INDEX idx_tx_transfer_group (transfer_group),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_payee FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uniq_tag_user_name (user_id, name),
  INDEX (user_id),
  CONSTRAINT fk_tag_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pivot: transaction_tags
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  CONSTRAINT fk_tt_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Splits
CREATE TABLE IF NOT EXISTS transaction_splits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description VARCHAR(255) NULL,
  category_id INT NULL,
  payee_id INT NULL,
  CONSTRAINT fk_ts_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_ts_payee FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  mime VARCHAR(120) NULL,
  size INT NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id, transaction_id),
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Budgets (orçamentos por categoria/mês)
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  month DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  UNIQUE KEY uniq_budget (user_id, category_id, month),
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_budget_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Goals (metas simples)
CREATE TABLE IF NOT EXISTS goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  type ENUM('poupanca','quitar_divida') NOT NULL DEFAULT 'poupanca',
  target_amount DECIMAL(14,2) NOT NULL,
  initial_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  strategy ENUM('linear','por_alocacao') NOT NULL DEFAULT 'linear',
  account_id INT NULL,
  category_id INT NULL,
  target_date DATE NULL,
  planned_monthly_amount DECIMAL(14,2) NULL,
  recurring_day TINYINT NULL,
  priority ENUM('baixa','media','alta') NOT NULL DEFAULT 'media',
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goal_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_goal_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: link transactions to goals for linear strategy contributions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS goal_id INT NULL,
  ADD CONSTRAINT fk_tx_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;

-- Recurring rules (recorrências)
CREATE TABLE IF NOT EXISTS recurring_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  account_id INT NOT NULL,
  type ENUM('RECEITA','DESPESA') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description VARCHAR(255) NULL,
  category_id INT NULL,
  payee_id INT NULL,
  interval_unit ENUM('day','week','month') NOT NULL,
  interval_count INT NOT NULL DEFAULT 1,
  next_run DATE NOT NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id),
  CONSTRAINT fk_rr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_rr_payee FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
