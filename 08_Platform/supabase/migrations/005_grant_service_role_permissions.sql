-- Grant service_role full access to all tables
-- Even with RLS bypassed, service_role needs table-level permissions

GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.submissions TO service_role;
GRANT ALL ON public.opt_ins TO service_role;
GRANT ALL ON public.rights_packages TO service_role;
GRANT ALL ON public.licensing_deals TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.audit_log TO service_role;

-- Grant usage on sequences (for auto-incrementing IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
