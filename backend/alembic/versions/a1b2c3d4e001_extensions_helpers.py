"""Extensions + helper functions (no tables).

- pgcrypto / uuid-ossp for gen_random_uuid()
- update_updated_at_column() trigger helper
- audit_trigger_function() generic audit writer (SECURITY DEFINER so
  service/cron jobs with NULL auth.uid() still log the row change)

NOTE: current_app_user_id() / is_admin() live in 0002 (b2c3d4e5f002) because
Postgres validates SQL-language function bodies at CREATE time and the users
table does not exist yet at this point.
"""

revision = "a1b2c3d4e001"
down_revision = None
branch_labels = None
depends_on = None

from alembic import op


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.audit_trigger_function()
        RETURNS TRIGGER AS $$
        DECLARE
            current_user_id BIGINT;
        BEGIN
            BEGIN
                SELECT id INTO current_user_id FROM public.users
                WHERE uuid = auth.uid();
            EXCEPTION WHEN undefined_function THEN
                current_user_id := NULL;
            END;

            IF (TG_OP = 'INSERT') THEN
                INSERT INTO public.audit_logs
                    (table_name, record_id, action, new_data, user_id)
                VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb,
                        current_user_id);
                RETURN NEW;
            ELSIF (TG_OP = 'UPDATE') THEN
                INSERT INTO public.audit_logs
                    (table_name, record_id, action, old_data, new_data, user_id)
                VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb,
                        row_to_json(NEW)::jsonb, current_user_id);
                RETURN NEW;
            ELSIF (TG_OP = 'DELETE') THEN
                INSERT INTO public.audit_logs
                    (table_name, record_id, action, old_data, user_id)
                VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb,
                        current_user_id);
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )

def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS public.audit_trigger_function()")
    op.execute("DROP FUNCTION IF EXISTS public.update_updated_at_column()")
