-- Application Database Schema
-- This file contains the schema for the application database (app.db)
-- which is separate from user-uploaded databases in ./uploads/

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE TABLE auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Note: id is cryptographically secure random string (not auto-increment)
-- Generated using crypto.randomBytes(32).toString('hex') for security
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,  -- Cryptographically secure session ID stored in cookies
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_auth_tokens_token ON auth_tokens (token);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens (user_id);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens (expires_at);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX idx_users_email ON users (email);