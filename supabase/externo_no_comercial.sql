-- Vendedor externo também lança e vê as vendas do Comercial (aplicado em 21/10/2026)
alter policy commercial_read_daily_sales on public.daily_sales
  using (company_id = my_company_id() and my_role() = any (array['admin','commercial','system','client','externo']));
alter policy commercial_upsert_daily_sales on public.daily_sales
  with check (company_id = my_company_id() and my_role() = any (array['admin','commercial','system','externo']));
alter policy commercial_update_daily_sales on public.daily_sales
  using (company_id = my_company_id() and my_role() = any (array['admin','commercial','system','externo']));
