"""Add original_preferred_date to preserve customer's initial choice

Revision ID: 1789669764
Revises: 1000002b
Create Date: 2026-09-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1789669764'
down_revision: Union[str, None] = '1000002b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add original_preferred_date column (nullable initially)
    op.add_column('bookings', sa.Column('original_preferred_date', sa.Date(), nullable=True))
    
    # Backfill: copy current preferred_date to original_preferred_date for all existing bookings
    op.execute("""
        UPDATE bookings 
        SET original_preferred_date = preferred_date
        WHERE original_preferred_date IS NULL
    """)
    
    # Make it non-nullable after backfill
    op.alter_column('bookings', 'original_preferred_date', nullable=False)


def downgrade() -> None:
    op.drop_column('bookings', 'original_preferred_date')
