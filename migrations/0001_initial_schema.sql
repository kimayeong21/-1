-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (분류 카테고리: 사진, 동영상, 문서, SNS 등)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memories table (디지털 유품/추억)
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  tags TEXT, -- JSON array stored as text
  ai_summary TEXT, -- AI generated summary
  ai_sentiment TEXT, -- positive, negative, neutral
  ai_keywords TEXT, -- JSON array stored as text
  importance_score INTEGER DEFAULT 5, -- 1-10
  is_archived BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  original_date DATETIME, -- 원본 파일의 날짜
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Connections table (추억 간의 연결/관계)
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id_1 INTEGER NOT NULL,
  memory_id_2 INTEGER NOT NULL,
  connection_type TEXT, -- related, similar, sequence
  strength INTEGER DEFAULT 5, -- 1-10
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id_1) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id_2) REFERENCES memories(id) ON DELETE CASCADE,
  UNIQUE(memory_id_1, memory_id_2)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_category_id ON memories(category_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_importance_score ON memories(importance_score);
CREATE INDEX IF NOT EXISTS idx_connections_memory_1 ON connections(memory_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_memory_2 ON connections(memory_id_2);
