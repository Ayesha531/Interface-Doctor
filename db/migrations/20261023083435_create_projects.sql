create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_token text not null,
  name text not null,
  source text not null check (source in ('upload', 'sample')),
  screenshot_data_url text not null,
  screenshot_mime_type text not null,
  screenshot_width integer not null,
  screenshot_height integer not null,
  screenshot_size_bytes integer not null,
  thumbnail_data_url text,
  findings_json jsonb,
  redesign_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_client_token on projects(client_token);
create index if not exists idx_projects_created_at on projects(created_at desc);
