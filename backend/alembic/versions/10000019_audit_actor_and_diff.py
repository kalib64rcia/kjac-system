"""Audit trail accountability: real actor + changed-fields diff.

Why: the trigger resolved the actor via auth.uid() (Supabase JWT), but the
app signs its own JWTs — so every office action logged user_id NULL ("system"
in the viewer) and UPDATEs never filled changed_fields. This keeps the same
trigger-written, immutable design and only fixes the identity channel and the
diff:

- Actor: app.current_user_uuid session setting first (set per request by the
  API layer, transaction-scoped via SET LOCAL), auth.uid() fallback for cron
  and Supabase-side writes, NULL for guests (honestly "system").
- UPDATE rows now store changed_fields (jsonb key diff, updated_at excluded;
  NULL when only the timestamp moved).
- Backfill: existing UPDATE rows get their diff recomputed from the stored
  old/new snapshots. Old NULL actors stay NULL — the actor was never recorded
  and cannot be recovered.
"""

revision = "10000019"
down_revision = "10000018"
branch_labels = None
depends_on = None

from alembic import op

_NEW_TRIGGER = """
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    actor_uuid TEXT;
    current_user_id BIGINT;
    changed TEXT[];
BEGIN
    actor_uuid := NULLIF(current_setting('app.current_user_uuid', true), '');
    IF actor_uuid IS NULL THEN
        BEGIN
            actor_uuid := auth.uid()::TEXT;
        EXCEPTION WHEN undefined_function THEN
            actor_uuid := NULL;
        END;
    END IF;
    current_user_id := NULL;
    IF actor_uuid IS NOT NULL THEN
        BEGIN
            SELECT id INTO current_user_id FROM public.users
            WHERE uuid = actor_uuid::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            current_user_id := NULL;
        END;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs
            (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb,
                current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        SELECT NULLIF(ARRAY(
            SELECT key FROM jsonb_each(row_to_json(OLD)::jsonb) o
            FULL OUTER JOIN jsonb_each(row_to_json(NEW)::jsonb) n USING (key)
            WHERE o.value IS DISTINCT FROM n.value AND key <> 'updated_at'
        ), '{}') INTO changed;
        INSERT INTO public.audit_logs
            (table_name, record_id, action, old_data, new_data,
             changed_fields, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb,
                row_to_json(NEW)::jsonb, changed, current_user_id);
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

# Original body from a1b2c3d4e001 (auth.uid()-only actor, no diff).
_OLD_TRIGGER = """
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

_BACKFILL_DIFF = """
UPDATE public.audit_logs a SET changed_fields = sub.keys FROM (
    SELECT id, NULLIF(ARRAY(
        SELECT key FROM jsonb_each(old_data) o
        FULL OUTER JOIN jsonb_each(new_data) n USING (key)
        WHERE o.value IS DISTINCT FROM n.value AND key <> 'updated_at'
    ), '{}') AS keys
    FROM public.audit_logs
    WHERE action = 'UPDATE' AND changed_fields IS NULL
      AND old_data IS NOT NULL AND new_data IS NOT NULL
) sub WHERE a.id = sub.id
"""


def upgrade() -> None:
    op.execute(_NEW_TRIGGER)
    op.execute(_BACKFILL_DIFF)


def downgrade() -> None:
    op.execute(_OLD_TRIGGER)
