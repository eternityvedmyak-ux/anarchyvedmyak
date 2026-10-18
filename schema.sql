-- ============================================================
--  ReallyWorld — схема MySQL
--  Импортируйте в phpMyAdmin (или: mysql -u root reallyworld < schema.sql)
--  Базу создайте заранее:  CREATE DATABASE reallyworld CHARACTER SET utf8mb4;
--  Привилегии и стартовые настройки заполняет app/install.php (рекомендуется),
--  но при желании можно лить данные и сюда вручную.
-- ============================================================
SET NAMES utf8mb4;
SET time_zone = '+03:00';

CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(64)  NOT NULL PRIMARY KEY,
  v TEXT         NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(80) NOT NULL UNIQUE,
  sort   INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(64) NOT NULL UNIQUE,
  type       VARCHAR(16) NOT NULL DEFAULT 'percent',  -- percent | fixed
  value      DECIMAL(10,2) NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  max_uses   INT NOT NULL DEFAULT 0,                  -- 0 = без лимита
  used       INT NOT NULL DEFAULT 0,
  expires_at DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS privileges (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  category     VARCHAR(64)  NOT NULL DEFAULT 'Гриф. Выживание',
  section      VARCHAR(120) NOT NULL DEFAULT 'Донат привилегии',
  name         VARCHAR(190) NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  old_price    DECIMAL(10,2) NULL,
  image        VARCHAR(255) NOT NULL DEFAULT '',
  rcon_command VARCHAR(255) NOT NULL DEFAULT '',
  qty_enabled  TINYINT(1) NOT NULL DEFAULT 0,
  qty_max      INT NOT NULL DEFAULT 0,
  sort         INT NOT NULL DEFAULT 0,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_priv (category, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, -- номер заказа (передаётся в кассу)
  privilege_id  INT NULL,
  privilege     VARCHAR(190) NOT NULL,
  category      VARCHAR(64)  NOT NULL DEFAULT '',
  nickname      VARCHAR(32)  NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  currency      VARCHAR(8)   NOT NULL DEFAULT 'RUB',
  gateway       VARCHAR(32)  NOT NULL,
  status        ENUM('pending','paid','failed','canceled') NOT NULL DEFAULT 'pending',
  ext_id        VARCHAR(190) NULL,                   -- id транзакции у кассы
  ip            VARCHAR(64)  NULL,
  issued        TINYINT(1)   NOT NULL DEFAULT 0,     -- выдан ли товар на сервере
  qty           DECIMAL(12,2) NULL,                  -- кол-во (для игровой валюты)
  kind          VARCHAR(16)  NOT NULL DEFAULT 'privilege', -- privilege | currency
  promo         VARCHAR(64)  NULL,                   -- применённый промокод
  created_at    DATETIME     NOT NULL,
  paid_at       DATETIME     NULL,
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8mb4;
