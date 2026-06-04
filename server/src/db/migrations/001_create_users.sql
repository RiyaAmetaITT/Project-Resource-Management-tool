CREATE TABLE IF NOT EXISTS users (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  username              VARCHAR(50)  NOT NULL UNIQUE,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  full_name             VARCHAR(100) NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  role                  ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') NOT NULL,
  force_password_change BOOLEAN NOT NULL DEFAULT TRUE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
