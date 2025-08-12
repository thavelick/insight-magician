CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

INSERT INTO users (name, email) VALUES
  ('Alice Johnson', 'alice@example.com'),
  ('Bob Smith', 'bob@example.com'),
  ('Carol Davis', 'carol@example.com'),
  ('David Wilson', 'david@example.com'),
  ('Emma Brown', 'emma@example.com'),
  ('Frank Miller', 'frank@example.com'),
  ('Grace Lee', 'grace@example.com'),
  ('Henry Taylor', 'henry@example.com'),
  ('Iris Chen', 'iris@example.com'),
  ('Jack Anderson', 'jack@example.com');