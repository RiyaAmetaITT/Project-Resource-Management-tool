CREATE TABLE users (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  role_id               INT          NOT NULL,
  manager_id            INT          NULL,
  username              VARCHAR(50)  NOT NULL UNIQUE,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  full_name             VARCHAR(100) NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  department            VARCHAR(100) NULL,
  designation           VARCHAR(100) NULL,
  force_password_change BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role    FOREIGN KEY (role_id)    REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);
