-- Criar o bucket para armazenar os ícones
insert into storage.buckets (id, name, public) values ('public', 'public', true);

-- Política para permitir upload de imagens
create policy "Allow authenticated uploads"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'public' AND
    (storage.extension(name) = 'jpg' OR
     storage.extension(name) = 'jpeg' OR
     storage.extension(name) = 'png' OR
     storage.extension(name) = 'gif' OR
     storage.extension(name) = 'svg')
  );

-- Política para permitir leitura pública
create policy "Allow public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'public');
