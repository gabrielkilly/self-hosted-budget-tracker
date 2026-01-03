-- PostgreSQL Schema for Transactions Database

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    budget_type VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    payedOff BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_budget_type ON transactions(budget_type);
CREATE INDEX idx_transactions_amount ON transactions(amount);

-- Create a view for monthly summaries
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', date) as month,
    budget_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM transactions
GROUP BY DATE_TRUNC('month', date), budget_type
ORDER BY month DESC, total_amount DESC;

-- Create a view for budget type summaries
CREATE OR REPLACE VIEW budget_summary AS
SELECT 
    budget_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM transactions
GROUP BY budget_type
ORDER BY total_amount DESC;

-- Comments for documentation
COMMENT ON TABLE transactions IS 'Stores all financial transactions from budget tracking';
COMMENT ON COLUMN transactions.date IS 'Transaction date';
COMMENT ON COLUMN transactions.name IS 'Transaction merchant/name';
COMMENT ON COLUMN transactions.description IS 'Transaction description';
COMMENT ON COLUMN transactions.budget_type IS 'Budget category (e.g., Personal eat out, Personal subscriptions)';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in dollars';
COMMENT ON COLUMN transactions.payedOff IS 'Whether the transaction has been paid off (true/false)';
