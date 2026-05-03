-- Database schema for Tapwealth application

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_task_submissions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submission_data JSONB
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE marketplace_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security Policies

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_users ON users
    FOR SELECT
    USING (auth.uid() = id);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_wallet_transactions ON wallet_transactions
    FOR SELECT
    USING (user_id = auth.uid());

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_tasks ON tasks
    FOR SELECT
    USING (true);

ALTER TABLE user_task_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_user_task_submissions ON user_task_submissions
    FOR SELECT
    USING (user_id = auth.uid());

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_announcements ON announcements
    FOR SELECT
    USING (true);

ALTER TABLE marketplace_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_marketplace_partners ON marketplace_partners
    FOR SELECT
    USING (true);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_admin_users ON admin_users
    FOR SELECT
    USING (false); -- Only admin can see this table