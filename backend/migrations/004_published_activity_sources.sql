ALTER TABLE published_books ADD COLUMN source_book_ids text[] NOT NULL DEFAULT '{}';
