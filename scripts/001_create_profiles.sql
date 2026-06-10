-- Criar tabela de perfis se não existir
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  employee_id text not null unique,
  role text not null check (role in ('admin', 'coordinator', 'operator')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Políticas de acesso
create policy "Qualquer um pode ver perfis"
  on public.profiles for select
  using (true);

create policy "Usuários podem atualizar próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuários podem inserir próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Adicionar coluna employee_id se não existir na tabela profiles existente
do $$ 
begin
  if not exists (select 1 from information_schema.columns 
                 where table_name='profiles' and column_name='employee_id') then
    alter table public.profiles add column employee_id text;
    alter table public.profiles add constraint profiles_employee_id_unique unique (employee_id);
  end if;
end $$;

-- Criar função para atualizar updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger para atualizar updated_at
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Criar função para auto-criar perfil ao registar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, employee_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Novo Usuário'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'employee_id', new.id::text),
    coalesce(new.raw_user_meta_data ->> 'role', 'operator')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger para criar perfil automaticamente
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
