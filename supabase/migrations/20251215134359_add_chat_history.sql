-- Create chat_sessions table safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
        create table public.chat_sessions (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users(id) not null,
          title text,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        alter table public.chat_sessions enable row level security;
    END IF;
END $$;

-- Create chat_messages table safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
        create table public.chat_messages (
          id uuid default gen_random_uuid() primary key,
          session_id uuid references public.chat_sessions(id) on delete cascade not null,
          role text not null check (role in ('user', 'assistant', 'system')),
          content text not null,
          created_at timestamptz default now()
        );
        alter table public.chat_messages enable row level security;
    END IF;
END $$;


-- Drop policies if they exist to allow re-running
drop policy if exists "Users can view their own sessions" on public.chat_sessions;
drop policy if exists "Users can insert their own sessions" on public.chat_sessions;
drop policy if exists "Users can update their own sessions" on public.chat_sessions;
drop policy if exists "Users can delete their own sessions" on public.chat_sessions;

drop policy if exists "Users can view messages from their sessions" on public.chat_messages;
drop policy if exists "Users can insert messages to their sessions" on public.chat_messages;


-- Recreate policies for chat_sessions
create policy "Users can view their own sessions"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.chat_sessions for delete
  using (auth.uid() = user_id);

-- Recreate policies for chat_messages
create policy "Users can view messages from their sessions"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their sessions"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

-- Add real-time safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_sessions'
  ) THEN
    alter publication supabase_realtime add table public.chat_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_messages'
  ) THEN
    alter publication supabase_realtime add table public.chat_messages;
  END IF;
END $$;
