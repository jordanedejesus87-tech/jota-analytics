-- Jota Analytics — administrador define a senha dos usuários e vê os logins (já aplicado em 20/10/2026)
create or replace function public.admin_definir_senha(p_user uuid, p_senha text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
declare alvo_role text;
begin
  if coalesce(public.my_role(), '') not in ('admin', 'system') then raise exception 'Apenas administradores podem definir senhas.'; end if;
  if p_senha is null or length(p_senha) < 8 then raise exception 'A senha precisa ter pelo menos 8 caracteres.'; end if;
  select role into alvo_role from public.profiles where id = p_user;
  if alvo_role in ('admin', 'system') and p_user <> auth.uid() then raise exception 'Não é permitido trocar a senha de outro administrador.'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
  if not found then raise exception 'Usuário não encontrado.'; end if;
end; $$;
revoke all on function public.admin_definir_senha(uuid, text) from public, anon;
grant execute on function public.admin_definir_senha(uuid, text) to authenticated;

create or replace function public.admin_logins()
returns table (id uuid, email text, ultimo_acesso timestamptz) language plpgsql security definer set search_path = public, auth as $$
begin
  if coalesce(public.my_role(), '') not in ('admin', 'system') then raise exception 'Apenas administradores.'; end if;
  return query select u.id, u.email::text, u.last_sign_in_at from auth.users u;
end; $$;
revoke all on function public.admin_logins() from public, anon;
grant execute on function public.admin_logins() to authenticated;
