"""initial_migration_create_all_tables

Revision ID: 2fb5ef10619c
Revises: 
Create Date: 2026-03-03 12:26:54.461825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2fb5ef10619c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enums ---
    userrole = postgresql.ENUM('LEARNER', 'ADMIN', 'MANAGER', name='userrole', create_type=False)
    nodestatus = postgresql.ENUM('PENDING', 'IN_PROGRESS', 'DONE', name='nodestatus', create_type=False)
    userrole.create(op.get_bind(), checkfirst=True)
    nodestatus.create(op.get_bind(), checkfirst=True)

    # --- Users ---
    op.create_table('users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', userrole, nullable=False),
        sa.Column('xp', sa.Integer(), nullable=True),
        sa.Column('level', sa.Integer(), nullable=True),
        sa.Column('current_job_role', sa.String(length=255), nullable=True),
        sa.Column('streak_days', sa.Integer(), nullable=True),
        sa.Column('streak_last_date', sa.DateTime(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # --- Point Transactions ---
    op.create_table('point_transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('points', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_point_transactions_id', 'point_transactions', ['id'])

    # --- User Skills ---
    op.create_table('user_skills',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('skill_name', sa.String(length=100), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_skills_id', 'user_skills', ['id'])

    # --- Roadmaps ---
    op.create_table('roadmaps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_roadmaps_id', 'roadmaps', ['id'])

    # --- Roadmap Nodes (self-referential for tree) ---
    op.create_table('roadmap_nodes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('roadmap_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('resource_links', sa.JSON(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('depth_level', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['roadmap_id'], ['roadmaps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['roadmap_nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_roadmap_nodes_id', 'roadmap_nodes', ['id'])

    # --- User Roadmaps (assignment) ---
    op.create_table('user_roadmaps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('roadmap_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('progress_pct', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['roadmap_id'], ['roadmaps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_roadmaps_id', 'user_roadmaps', ['id'])

    # --- Node Progress ---
    op.create_table('node_progress',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('node_id', sa.Integer(), nullable=False),
        sa.Column('status', nodestatus, nullable=False),
        sa.Column('quiz_passed', sa.Boolean(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['node_id'], ['roadmap_nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_node_progress_id', 'node_progress', ['id'])

    # --- Chat Messages ---
    op.create_table('chat_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('node_id', sa.Integer(), nullable=True),
        sa.Column('roadmap_id', sa.Integer(), nullable=True),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['node_id'], ['roadmap_nodes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['roadmap_id'], ['roadmaps.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chat_messages_id', 'chat_messages', ['id'])


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('node_progress')
    op.drop_table('user_roadmaps')
    op.drop_table('roadmap_nodes')
    op.drop_table('roadmaps')
    op.drop_table('user_skills')
    op.drop_table('point_transactions')
    op.drop_table('users')

    sa.Enum(name='nodestatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
