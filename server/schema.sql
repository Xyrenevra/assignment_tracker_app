-- AssignAI Relational Schema Reference
-- Matches the normalized entity structure persisted by server/db.ts

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  university TEXT DEFAULT '',
  major TEXT DEFAULT '',
  semester TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  is_demo INTEGER DEFAULT 0,
  preferences_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT DEFAULT '',
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  model TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('overdue', 'upcoming', 'system')),
  message TEXT NOT NULL,
  read_status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
