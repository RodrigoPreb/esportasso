SET NAMES utf8mb4;   -- garante os acentos quando o script roda pelo terminal
DROP DATABASE IF EXISTS brazinos;
CREATE DATABASE brazinos CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Se aparecer "Unknown collation 'utf8mb4_0900_ai_ci'" (MariaDB/XAMPP), troque por utf8mb4_unicode_ci
USE brazinos;

CREATE TABLE usuarios (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL,
  senha_hash  CHAR(60)      NOT NULL,          -- hash bcrypt, NUNCA a senha
  criado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios        PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_email  UNIQUE (email)
);

CREATE TABLE partidas (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id    INT UNSIGNED  NOT NULL,
  titulo        VARCHAR(120)  NOT NULL,        -- ex.: 'Flamengo x Palmeiras'
  descricao     TEXT          NULL,
  prioridade    ENUM('baixa', 'media', 'alta')                  NOT NULL DEFAULT 'media',
  status        ENUM('pendente', 'em_andamento', 'concluida')   NOT NULL DEFAULT 'pendente',
  data_partida  DATE          NULL,            -- equivale ao "prazo" do PDF
  criada_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizada_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  concluida_em  DATETIME      NULL,
  CONSTRAINT pk_partidas PRIMARY KEY (id),
  CONSTRAINT fk_partidas_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT ck_partidas_titulo CHECK (CHAR_LENGTH(TRIM(titulo)) >= 3)
);

CREATE TABLE tags (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  nome        VARCHAR(40)  NOT NULL,
  CONSTRAINT pk_tags PRIMARY KEY (id),
  CONSTRAINT uq_tags_usuario_nome UNIQUE (usuario_id, nome),
  CONSTRAINT fk_tags_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE TABLE partida_tag (
  partida_id  INT UNSIGNED NOT NULL,
  tag_id      INT UNSIGNED NOT NULL,
  CONSTRAINT pk_partida_tag PRIMARY KEY (partida_id, tag_id),
  CONSTRAINT fk_partida_tag_partida FOREIGN KEY (partida_id)
    REFERENCES partidas (id) ON DELETE CASCADE,
  CONSTRAINT fk_partida_tag_tag FOREIGN KEY (tag_id)
    REFERENCES tags (id) ON DELETE CASCADE
);

-- ---------- Dados de exemplo ----------
-- Dois usuários (senha de ambos: senha123, guardada como hash bcrypt)
INSERT INTO usuarios (id, nome, email, senha_hash) VALUES
  (1, 'Ana',   'ana@brazinos.com',   '$2b$10$yQBH.u6NtyqM6C/bTzPhDOTkHZYvuD2XWIXi4YZGIPX4ejdq5QrSK'),
  (2, 'Bruno', 'bruno@brazinos.com', '$2b$10$yQBH.u6NtyqM6C/bTzPhDOTkHZYvuD2XWIXi4YZGIPX4ejdq5QrSK');

-- As mesmas 6 partidas do dados.ts (da Ana) + 1 do Bruno = 7 linhas
INSERT INTO partidas (id, usuario_id, titulo, descricao, prioridade, status, data_partida, concluida_em) VALUES
  (1, 1, 'Flamengo x Palmeiras',     NULL,                            'alta',  'pendente',     '2026-11-08', NULL),
  (2, 1, 'Corinthians x São Paulo',  'Majestoso, jogo já encerrado',  'alta',  'concluida',    '2026-10-25', '2026-10-25 20:00:00'),
  (3, 1, 'Grêmio x Internacional',   'Gre-Nal, segundo tempo',        'alta',  'em_andamento', '2026-10-28', NULL),
  (4, 1, 'Santos x Vasco',           NULL,                            'media', 'pendente',     '2026-11-09', NULL),
  (5, 1, 'Bahia x Fortaleza',        NULL,                            'media', 'pendente',     '2026-11-10', NULL),
  (6, 1, 'Juventude x Bragantino',   NULL,                            'baixa', 'pendente',     NULL,         NULL),
  (7, 2, 'Cruzeiro x Atlético-MG',   NULL,                            'alta',  'pendente',     '2026-11-11', NULL);

INSERT INTO tags (id, usuario_id, nome) VALUES
  (1, 1, 'clássico'),
  (2, 1, 'rodada-31'),
  (3, 1, 'nordeste'),
  (4, 2, 'clássico');

INSERT INTO partida_tag (partida_id, tag_id) VALUES
  (1, 1), (1, 2),
  (2, 1),
  (3, 1), (3, 2),
  (4, 2),
  (5, 3),
  (6, 2),
  (7, 4);
