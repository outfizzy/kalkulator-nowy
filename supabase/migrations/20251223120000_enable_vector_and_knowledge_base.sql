-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector with schema extensions;

-- Table to manage uploaded PDF documents
create table if not exists knowledge_docs (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  file_path text not null, -- Path in Supabase Storage
  file_size bigint,
  content_type text,
  status text default 'pending', -- pending, processing, processed, error
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table to store text chunks and their embeddings
create table if not exists knowledge_chunks (
  id uuid default gen_random_uuid() primary key,
  doc_id uuid references knowledge_docs(id) on delete cascade not null,
  content text not null,
  embedding extensions.vector(1536), -- OpenAIs text-embedding-3-small uses 1536 dimensions
  metadata jsonb default '{}'::jsonb, -- Page number, section title, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table knowledge_docs enable row level security;
alter table knowledge_chunks enable row level security;

-- Policies for Docs
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON knowledge_docs;
create policy "Enable all access for authenticated users" on knowledge_docs
  for all using (auth.role() = 'authenticated');

-- Policies for Chunks
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON knowledge_chunks;
create policy "Enable read access for authenticated users" on knowledge_chunks
  for select using (auth.role() = 'authenticated');

-- Function to search for knowledge
create or replace function match_knowledge (
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  doc_id uuid,
  content text,
  similarity float,
  filename text
)
language plpgsql
as $$
begin
  return query
  select
    knowledge_chunks.id,
    knowledge_chunks.doc_id,
    knowledge_chunks.content,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity,
    knowledge_docs.filename
  from knowledge_chunks
  join knowledge_docs on knowledge_docs.id = knowledge_chunks.doc_id
  where 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
