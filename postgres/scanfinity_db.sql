CREATE TABLE "Users" (
  "id" integer PRIMARY KEY,
  "username" varchar,
  "email" varchar,
  "created_at" timestamp,
  "elo" integer,
  "total_games" integer,
  "profile_picture" bytea
);

CREATE TABLE "Puzzles" (
  "puzzle_id" integer PRIMARY KEY,
  "lang" varchar,
  "topic" varchar,
  "difficulty" varchar,
  "size" varchar,
  "times_played" integer,
  "jsonb" json
);

CREATE TABLE "Games" (
  "game_id" integer PRIMARY KEY,
  "puzzle_id" integer,
  "date_time" timestamptz,
  "game_duration" integer,
  "game_status" varchar
);

CREATE TABLE "game_players" (
  "game_player_id" integer,
  "game_id" integer,
  "score" integer,
  "is_winner" boolean
);

ALTER TABLE "Games" ADD FOREIGN KEY ("puzzle_id") REFERENCES "Puzzles" ("puzzle_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "game_players" ADD FOREIGN KEY ("game_player_id") REFERENCES "Users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "game_players" ADD FOREIGN KEY ("game_id") REFERENCES "Games" ("game_id") DEFERRABLE INITIALLY IMMEDIATE;
