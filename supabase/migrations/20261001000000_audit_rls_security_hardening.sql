-- ==============================================================================
-- SECURITY HARDENING v1.0 — AUTHORITATIVE DATABASE RLS AUDIT RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.audit_rls_policies()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  policy_name text,
  operation text,
  roles text[],
  using_expression text,
  with_check_expression text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled,
    p.polname::text AS policy_name,
    p.polcmd::text AS operation,
    ARRAY(
      SELECT r.rolname::text
      FROM unnest(p.polroles) AS role_oid
      JOIN pg_roles r ON r.oid = role_oid
    ) AS roles,
    pg_get_expr(p.polqual, p.polrelid)::text AS using_expression,
    pg_get_expr(p.polwithcheck, p.polrelid)::text AS with_check_expression
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
  ORDER BY c.relname, p.polname;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_rls_policies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_rls_policies() TO service_role;
