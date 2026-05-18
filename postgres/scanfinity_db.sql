-- 1) Enums
CREATE TYPE lobby_status AS ENUM ('open', 'in_game', 'closed');
CREATE TYPE game_type AS ENUM ('single', 'one_v_one', 'multi');
CREATE TYPE game_status AS ENUM ('created', 'running', 'finished', 'canceled');
CREATE TYPE queue_status AS ENUM ('searching', 'matched', 'cancelled', 'expired');

-- 2) Tables
CREATE TABLE users (
  id serial PRIMARY KEY,
  username varchar(64) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false,
  email_verified_at timestamp,
  elo int NOT NULL DEFAULT 0,
  total_games int NOT NULL DEFAULT 0,
  product_image bytea,
  password_hash varchar(255),
  password_salt varchar(255)
);

CREATE TABLE verification_tokens (
  id serial PRIMARY KEY,
  user_id int NOT NULL,
  token_hash varchar(64) NOT NULL,
  type varchar(64) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  last_sent_at timestamp,
  CONSTRAINT verification_tokens_user_fk FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX verification_tokens_token_hash_idx ON verification_tokens (token_hash);
CREATE INDEX verification_tokens_user_type_idx ON verification_tokens (user_id, type);

CREATE TABLE players (
  id serial PRIMARY KEY,
  display_name varchar(128) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  user_id int UNIQUE,
  guest_device_id varchar(255) UNIQUE
);

CREATE TABLE topics (
  topic_id serial PRIMARY KEY,
  name varchar(255) NOT NULL UNIQUE
);

CREATE TABLE puzzles (
  puzzle_id serial PRIMARY KEY,
  lang varchar(32),
  topic_id int,
  difficulty varchar(64),
  size varchar(64),
  times_played int NOT NULL DEFAULT 0,
  json jsonb NOT NULL
);

CREATE TABLE lobbies (
  lobby_id serial PRIMARY KEY,
  host_player_id int NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  status lobby_status NOT NULL DEFAULT 'open',
  game_type game_type NOT NULL,
  max_players int NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  lang varchar(32),
  difficulty varchar(64),
  size varchar(64),
  topic_id int
);

CREATE TABLE lobby_players (
  lobby_id int NOT NULL,
  player_id int NOT NULL,
  joined_at timestamp NOT NULL DEFAULT now(),
  is_ready boolean NOT NULL DEFAULT false,
  PRIMARY KEY (lobby_id, player_id)
);

CREATE TABLE games (
  game_id serial PRIMARY KEY,
  lobby_id int,
  puzzle_id int,
  game_type game_type NOT NULL,
  is_ranked boolean NOT NULL DEFAULT false,
  date_time timestamp NOT NULL DEFAULT now(),
  game_duration int,
  game_status game_status NOT NULL DEFAULT 'created'
);

CREATE TABLE game_players (
  game_id int NOT NULL,
  player_id int NOT NULL,
  score int NOT NULL DEFAULT 0,
  is_winner boolean DEFAULT false,
  elo_before int,
  elo_after int,
  PRIMARY KEY (game_id, player_id)
);

CREATE TABLE matchmaking_queue (
  id serial PRIMARY KEY,
  player_id int NOT NULL UNIQUE,
  elo int NOT NULL DEFAULT 0,
  game_type varchar(32) NOT NULL,
  is_ranked boolean NOT NULL DEFAULT false,
  filters jsonb DEFAULT '{}'::jsonb,
  joined_at timestamp NOT NULL DEFAULT now(),
  last_activity_at timestamp NOT NULL DEFAULT now(),
  status queue_status NOT NULL DEFAULT 'searching'
);

-- 3) Constraints (CHECKs)
ALTER TABLE players
  ADD CONSTRAINT players_exactly_one_identity_chk
  CHECK (
    (user_id IS NOT NULL AND guest_device_id IS NULL)
    OR
    (user_id IS NULL AND guest_device_id IS NOT NULL)
  );

ALTER TABLE players
  ADD CONSTRAINT players_guest_device_id_not_blank_chk
  CHECK (guest_device_id IS NULL OR length(btrim(guest_device_id)) > 0);

ALTER TABLE lobbies
  ADD CONSTRAINT lobbies_max_players_min_1_chk
  CHECK (max_players >= 1);

ALTER TABLE games
  ADD CONSTRAINT games_duration_non_negative_chk
  CHECK (game_duration IS NULL OR game_duration >= 0);

-- 4) Foreign keys with ON DELETE behavior
ALTER TABLE players
  ADD CONSTRAINT players_user_fk FOREIGN KEY (user_id)
  REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE puzzles
  ADD CONSTRAINT puzzles_topic_fk FOREIGN KEY (topic_id)
  REFERENCES topics (topic_id) ON DELETE SET NULL;

ALTER TABLE lobbies
  ADD CONSTRAINT lobbies_topic_fk FOREIGN KEY (topic_id)
  REFERENCES topics (topic_id) ON DELETE SET NULL;

ALTER TABLE lobbies
  ADD CONSTRAINT lobbies_host_player_fk FOREIGN KEY (host_player_id)
  REFERENCES players (id) ON DELETE RESTRICT;

ALTER TABLE lobby_players
  ADD CONSTRAINT lobby_players_lobby_fk FOREIGN KEY (lobby_id)
  REFERENCES lobbies (lobby_id) ON DELETE CASCADE;

ALTER TABLE lobby_players
  ADD CONSTRAINT lobby_players_player_fk FOREIGN KEY (player_id)
  REFERENCES players (id) ON DELETE CASCADE;

ALTER TABLE games
  ADD CONSTRAINT games_lobby_fk FOREIGN KEY (lobby_id)
  REFERENCES lobbies (lobby_id) ON DELETE SET NULL;

ALTER TABLE games
  ADD CONSTRAINT games_puzzle_fk FOREIGN KEY (puzzle_id)
  REFERENCES puzzles (puzzle_id) ON DELETE SET NULL;

ALTER TABLE game_players
  ADD CONSTRAINT game_players_game_fk FOREIGN KEY (game_id)
  REFERENCES games (game_id) ON DELETE CASCADE;

ALTER TABLE game_players
  ADD CONSTRAINT game_players_player_fk FOREIGN KEY (player_id)
  REFERENCES players (id) ON DELETE CASCADE;

ALTER TABLE matchmaking_queue
  ADD CONSTRAINT matchmaking_queue_player_fk FOREIGN KEY (player_id)
  REFERENCES players (id) ON DELETE CASCADE;

-- 5) Indexes
CREATE INDEX puzzles_lang_difficulty_size_idx ON puzzles (lang, difficulty, size);
CREATE INDEX puzzles_topic_id_idx ON puzzles (topic_id);
CREATE INDEX lobby_players_player_id_idx ON lobby_players (player_id);
CREATE INDEX games_is_ranked_status_dt_idx ON games (is_ranked, game_status, date_time);
CREATE INDEX lobbies_host_player_id_idx ON lobbies (host_player_id);
CREATE INDEX games_lobby_id_idx ON games (lobby_id);
CREATE INDEX games_puzzle_id_idx ON games (puzzle_id);
CREATE INDEX game_players_player_id_idx ON game_players (player_id);
CREATE INDEX matchmaking_queue_game_type_elo_idx ON matchmaking_queue (game_type, elo, status);
CREATE INDEX matchmaking_queue_filters_gin_idx ON matchmaking_queue USING GIN (filters jsonb_path_ops);
CREATE INDEX matchmaking_queue_joined_at_idx ON matchmaking_queue (joined_at) WHERE status = 'searching';