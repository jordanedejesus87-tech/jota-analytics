-- O dono da empresa (role client) enxerga os perfis da própria empresa — necessário para
-- o dashboard do vendedor externo (a view vw_ext_visitas junta com profiles). Aplicado em 20/10/2026.
create policy client_read_company_profiles on public.profiles for select to authenticated
  using (my_role() = 'client' and company_id = my_company_id());
