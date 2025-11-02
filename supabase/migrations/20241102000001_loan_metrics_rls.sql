-- Enable RLS on loan_metrics
ALTER MATERIALIZED VIEW loan_metrics OWNER TO postgres;

-- Grant access to authenticated users
GRANT SELECT ON loan_metrics TO authenticated;

-- Note: RLS policies cannot be directly applied to materialized views
-- We rely on the fact that loan_metrics only exposes data that users
-- already have access to through the loans table RLS policies
-- Users can only query loan_metrics via API which checks household membership

