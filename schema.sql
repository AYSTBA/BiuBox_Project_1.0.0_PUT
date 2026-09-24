-- BiuBox D1 数据库 Schema
-- 执行：npx wrangler d1 execute biubox-db --file=schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  real_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  account TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#1f7a6e',
  role TEXT DEFAULT 'user',
  banned_until TEXT,
  subordinate_of TEXT,
  created_at TEXT NOT NULL
);

-- 话题表
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  reply_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  revoked_at TEXT,
  soft_deleted_by TEXT DEFAULT '[]'
);

-- 回复表
CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  soft_deleted_by TEXT DEFAULT '[]'
);

-- 举报表
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_topic_id TEXT,
  reporter_id TEXT NOT NULL,
  reporter_nickname TEXT NOT NULL,
  reason TEXT NOT NULL,
  snapshot TEXT,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_at TEXT
);

-- 撤销内容归档表（30天后自动清除）
CREATE TABLE IF NOT EXISTS revoked (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  topic_id TEXT,
  snapshot TEXT,
  reason TEXT,
  revoked_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_topics_circle ON topics(circle_id);
CREATE INDEX IF NOT EXISTS idx_topics_author ON topics(author_id);
CREATE INDEX IF NOT EXISTS idx_topics_created ON topics(created_at);
CREATE INDEX IF NOT EXISTS idx_replies_topic ON replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
