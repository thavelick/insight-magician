-- Sample database for testing graph widget examples
-- Create this database by running: sqlite3 sample.db < sample-database.sql

-- Sample sales data
CREATE TABLE sales (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    count INTEGER NOT NULL,
    revenue REAL NOT NULL
);

INSERT INTO sales (category, count, revenue) VALUES 
    ('Electronics', 25, 15000.50),
    ('Books', 15, 750.25),
    ('Clothing', 30, 4500.75),
    ('Home & Garden', 12, 2400.00),
    ('Sports', 8, 1200.30);

-- Sample product data
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    value INTEGER NOT NULL,
    price REAL NOT NULL
);

INSERT INTO products (name, value, price) VALUES 
    ('Product A', 100, 29.99),
    ('Product B', 200, 45.50),
    ('Product C', 150, 33.25),
    ('Product D', 75, 19.99),
    ('Product E', 120, 55.00);

-- Sample time series data
CREATE TABLE daily_stats (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    visits INTEGER NOT NULL,
    sales INTEGER NOT NULL
);

INSERT INTO daily_stats (date, visits, sales) VALUES 
    ('2024-01-01', 120, 15),
    ('2024-01-02', 135, 18),
    ('2024-01-03', 98, 12),
    ('2024-01-04', 156, 22),
    ('2024-01-05', 142, 19),
    ('2024-01-06', 189, 28),
    ('2024-01-07', 167, 24);