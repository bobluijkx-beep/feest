-- Defense-in-depth: Prisma connects with a role that bypasses RLS (see
-- docs/architectuurvoorstel.md, sectie "Auth & RBAC" voor de motivatie — de echte
-- toegangsgrens is de requireRole()-guard in packages/core). Deze migratie zet RLS aan
-- op elke tabel zonder policies te definiëren, zodat de Supabase "anon" en
-- "authenticated" Postgres-rollen (gebruikt door PostgREST/de Supabase-client) standaard
-- niets kunnen lezen of schrijven, ook niet per ongeluk buiten de applicatie om.

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
