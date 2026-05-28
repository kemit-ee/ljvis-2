-- liquibase formatted sql
-- changeset ljvis:20260330100000 ignore:true
-- Initial schema for LJVIS-2 User Management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS users;

-- Organisation reference table
CREATE TABLE users.organisation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permission reference table (fixed set)
CREATE TABLE users.permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User table (users are never deleted, only deactivated)
CREATE TABLE users."user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    personal_code TEXT NOT NULL,
    organisation_id UUID NOT NULL REFERENCES users.organisation(id),
    email TEXT NOT NULL,
    phone TEXT,
    access_start DATE NOT NULL,
    access_end DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivating', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User group table
CREATE TABLE users.user_group (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User group <-> Organisation (many-to-many)
CREATE TABLE users.user_group_organisation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_group_id UUID NOT NULL REFERENCES users.user_group(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES users.organisation(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_group_id, organisation_id)
);

-- User group <-> Permission (many-to-many)
CREATE TABLE users.user_group_permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_group_id UUID NOT NULL REFERENCES users.user_group(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES users.permission(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_group_id, permission_id)
);

-- User <-> User group (many-to-many)
CREATE TABLE users.user_user_group (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users."user"(id),
    user_group_id UUID NOT NULL REFERENCES users.user_group(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, user_group_id)
);

-- Indexes
CREATE INDEX idx_user_organisation ON users."user"(organisation_id);
CREATE INDEX idx_user_status ON users."user"(status);
CREATE INDEX idx_user_personal_code ON users."user"(personal_code);
CREATE INDEX idx_user_access_end ON users."user"(access_end);
CREATE INDEX idx_user_group_org_group ON users.user_group_organisation(user_group_id);
CREATE INDEX idx_user_group_org_org ON users.user_group_organisation(organisation_id);
CREATE INDEX idx_user_group_perm_group ON users.user_group_permission(user_group_id);
CREATE INDEX idx_user_user_group_user ON users.user_user_group(user_id);
CREATE INDEX idx_user_user_group_group ON users.user_user_group(user_group_id);
