CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('conversation', 'document', 'codebase', 'note')),
  source_id TEXT,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_memory_chunks_user_created_idx
  ON ai_memory_chunks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_memory_chunks_metadata_idx
  ON ai_memory_chunks USING GIN (metadata);

CREATE INDEX IF NOT EXISTS ai_memory_chunks_embedding_idx
  ON ai_memory_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_memory_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id)
);

CREATE TABLE IF NOT EXISTS ai_memory_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id, user_id)
    REFERENCES ai_memory_conversations (id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ai_memory_messages_conversation_idx
  ON ai_memory_messages (conversation_id, user_id, created_at);

CREATE INDEX IF NOT EXISTS ai_memory_messages_user_idx
  ON ai_memory_messages (user_id, created_at DESC);
