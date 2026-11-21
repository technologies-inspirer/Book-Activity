CREATE TABLE published_books (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  series_id text NOT NULL,
  class_id text NOT NULL,
  subject_id text NOT NULL,
  page_count integer NOT NULL CHECK (page_count BETWEEN 1 AND 200),
  archive bytea NOT NULL,
  cover bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
