"""Route low-stock alerts to office users (owner + staff), not the retired role."""

revision = "10000016"
down_revision = "0f000015"
branch_labels = None
depends_on = None

from alembic import op


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE public.inventory_items
            SET quantity = NEW.new_quantity, updated_at = NOW()
            WHERE id = NEW.inventory_item_id;

            IF NEW.new_quantity <= (
                SELECT minimum_stock_level FROM public.inventory_items
                WHERE id = NEW.inventory_item_id
            ) THEN
                INSERT INTO public.notifications
                    (user_id, type, title, message, data)
                SELECT u.id, 'low_stock_alert', 'Low Stock Alert',
                    'Item ' || ii.name || ' is running low (Quantity: '
                    || NEW.new_quantity || ')',
                    jsonb_build_object('inventory_item_id', NEW.inventory_item_id,
                                       'quantity', NEW.new_quantity)
                FROM public.users u
                CROSS JOIN public.inventory_items ii
                WHERE u.role IN ('owner', 'staff') AND u.status = 'active'
                AND u.deleted_at IS NULL
                AND ii.id = NEW.inventory_item_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE public.inventory_items
            SET quantity = NEW.new_quantity, updated_at = NOW()
            WHERE id = NEW.inventory_item_id;

            IF NEW.new_quantity <= (
                SELECT minimum_stock_level FROM public.inventory_items
                WHERE id = NEW.inventory_item_id
            ) THEN
                INSERT INTO public.notifications
                    (user_id, type, title, message, data)
                SELECT u.id, 'low_stock_alert', 'Low Stock Alert',
                    'Item ' || ii.name || ' is running low (Quantity: '
                    || NEW.new_quantity || ')',
                    jsonb_build_object('inventory_item_id', NEW.inventory_item_id,
                                       'quantity', NEW.new_quantity)
                FROM public.users u
                CROSS JOIN public.inventory_items ii
                WHERE u.role = 'admin' AND u.deleted_at IS NULL
                AND ii.id = NEW.inventory_item_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
    )
