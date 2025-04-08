-- Create a database for testing
CREATE DATABASE IF NOT EXISTS facet;

-- Use the new database
USE facet;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UInt32,
    name String,
    email String,
    created_at DateTime,
    country String,
    status String
) ENGINE = MergeTree() 
PARTITION BY toYYYYMM(created_at)
ORDER BY (id);

-- Create Events table
CREATE TABLE IF NOT EXISTS events (
    id UInt32,
    timestamp DateTime,
    user_id UInt32,
    event_type String,
    page String,
    properties String, -- JSON as string since ClickHouse has limited JSON support
    duration UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (timestamp, id);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
    id UInt32,
    name String,
    price Decimal(10, 2),
    category String,
    created_at DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (id);

-- Insert sample data for Users
INSERT INTO users (id, name, email, created_at, country, status) VALUES
(1, 'Alice Johnson', 'alice@example.com', '2024-10-15 08:30:00', 'US', 'active'),
(2, 'Bob Smith', 'bob@example.com', '2024-11-20 14:15:00', 'CA', 'active'),
(3, 'Charlie Davis', 'charlie@example.com', '2024-11-25 09:45:00', 'UK', 'active'),
(4, 'Diana Martinez', 'diana@example.com', '2024-12-05 16:20:00', 'US', 'inactive'),
(5, 'Edward Wilson', 'edward@example.com', '2024-12-10 11:10:00', 'AU', 'active'),
(6, 'Fiona Brown', 'fiona@example.com', '2024-12-15 13:30:00', 'CA', 'active'),
(7, 'George Clark', 'george@example.com', '2024-12-20 10:00:00', 'US', 'active'),
(8, 'Hannah Lewis', 'hannah@example.com', '2024-12-25 15:45:00', 'UK', 'pending'),
(9, 'Ian Taylor', 'ian@example.com', '2025-01-05 09:20:00', 'US', 'active'),
(10, 'Julia White', 'julia@example.com', '2025-01-10 14:30:00', 'AU', 'active');

-- Insert sample data for Events
INSERT INTO events (id, timestamp, user_id, event_type, page, properties, duration) VALUES
(1, '2025-04-01 10:00:00', 1, 'page_view', '/home', '{"referrer": "google"}', 5200),
(2, '2025-04-01 10:05:23', 2, 'page_view', '/products', '{"referrer": "direct"}', 3100),
(3, '2025-04-01 10:10:45', 1, 'button_click', '/products', '{"button_id": "add-to-cart"}', 150),
(4, '2025-04-01 10:15:12', 3, 'page_view', '/home', '{"referrer": "facebook"}', 4500),
(5, '2025-04-01 10:20:30', 2, 'form_submit', '/contact', '{"form_id": "contact-form"}', 900),
(6, '2025-04-01 10:25:15', 4, 'page_view', '/about', '{"referrer": "direct"}', 2800),
(7, '2025-04-01 10:30:45', 1, 'page_view', '/checkout', '{"referrer": "internal"}', 6200),
(8, '2025-04-01 10:35:20', 5, 'button_click', '/products', '{"button_id": "filter"}', 200),
(9, '2025-04-01 10:40:10', 2, 'page_view', '/cart', '{"referrer": "internal"}', 3500),
(10, '2025-04-01 10:45:30', 3, 'form_submit', '/signup', '{"form_id": "registration"}', 1200),
(11, '2025-04-01 10:50:15', 4, 'page_view', '/products', '{"referrer": "search"}', 4100),
(12, '2025-04-01 10:55:45', 5, 'page_view', '/home', '{"referrer": "twitter"}', 3800),
(13, '2025-04-01 11:00:20', 1, 'button_click', '/cart', '{"button_id": "checkout"}', 180),
(14, '2025-04-01 11:05:10', 2, 'page_view', '/checkout', '{"referrer": "internal"}', 5500),
(15, '2025-04-01 11:10:30', 3, 'page_view', '/confirmation', '{"referrer": "internal"}', 2500),
(16, '2025-04-01 11:15:15', 6, 'page_view', '/home', '{"referrer": "instagram"}', 4300),
(17, '2025-04-01 11:20:45', 7, 'page_view', '/products', '{"referrer": "direct"}', 3700),
(18, '2025-04-01 11:25:20', 6, 'button_click', '/products', '{"button_id": "sort"}', 160),
(19, '2025-04-01 11:30:10', 7, 'form_submit', '/contact', '{"form_id": "feedback"}', 950),
(20, '2025-04-01 11:35:30', 8, 'page_view', '/home', '{"referrer": "linkedin"}', 4100);

-- Insert sample data for Products
INSERT INTO products (id, name, price, category, created_at) VALUES
(1, 'Laptop Pro', 1299.99, 'Electronics', '2025-01-15 10:00:00'),
(2, 'Smartphone X', 899.99, 'Electronics', '2025-01-20 14:30:00'),
(3, 'Wireless Headphones', 149.99, 'Audio', '2025-01-25 09:15:00'),
(4, 'Coffee Maker', 79.99, 'Home', '2025-02-01 11:30:00'),
(5, 'Fitness Tracker', 129.99, 'Wearables', '2025-02-05 16:45:00'),
(6, 'Desk Lamp', 39.99, 'Home', '2025-02-10 13:20:00'),
(7, 'Portable Charger', 49.99, 'Electronics', '2025-02-15 10:10:00'),
(8, 'Smart Speaker', 199.99, 'Audio', '2025-02-20 15:30:00'),
(9, 'Digital Camera', 599.99, 'Electronics', '2025-02-25 12:00:00'),
(10, 'Wireless Mouse', 29.99, 'Accessories', '2025-03-01 09:45:00');

-- Create aggregate views for faster queries (create table first, then add data)
CREATE TABLE IF NOT EXISTS events_by_page
(
    page String,
    event_type String,
    date Date,
    timestamp DateTime DEFAULT now(),
    count UInt64,
    avg_duration Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(date)
ORDER BY (page, event_type, date);

-- Now create the view to populate it
CREATE MATERIALIZED VIEW IF NOT EXISTS events_by_page_mv
TO events_by_page
AS SELECT
    page,
    event_type,
    toDate(timestamp) AS date,
    timestamp,
    count() AS count,
    avg(duration) AS avg_duration
FROM events
GROUP BY page, event_type, date, timestamp;

-- Create users_by_country table
CREATE TABLE IF NOT EXISTS users_by_country
(
    country String,
    status String,
    count UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (country, status);

-- Create view to populate it
CREATE MATERIALIZED VIEW IF NOT EXISTS users_by_country_mv
TO users_by_country
AS SELECT
    country,
    status,
    count() AS count
FROM users
GROUP BY country, status;

-- Manually populate materialized views to ensure data is available immediately
-- This guarantees data is present when querying the tables

-- Option 1: Trigger the materialized views directly 
-- (this is more reliable for future schema changes)

-- Trigger events_by_page_mv materialized view
INSERT INTO events_by_page_mv SELECT 
    page,
    event_type,
    toDate(timestamp) AS date,
    timestamp,
    count() AS count,
    avg(duration) AS avg_duration
FROM events
GROUP BY page, event_type, date, timestamp;

-- Trigger users_by_country_mv materialized view
INSERT INTO users_by_country_mv SELECT
    country,
    status,
    count() AS count
FROM users
GROUP BY country, status;