ALTER TABLE users ADD COLUMN all_books boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN book_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN expires_at timestamptz;
ALTER TABLE users ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
CREATE TABLE login_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_progress (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  page integer NOT NULL CHECK (page >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE portal_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
