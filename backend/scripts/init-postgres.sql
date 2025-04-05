-- Create tables for testing and development

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    country VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active'
);

-- Events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    page VARCHAR(255),
    properties JSONB,
    duration INTEGER
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert sample data for Users
INSERT INTO users (name, email, created_at, country, status) VALUES
('Alice Johnson', 'alice@example.com', '2024-10-15 08:30:00', 'US', 'active'),
('Bob Smith', 'bob@example.com', '2024-11-20 14:15:00', 'CA', 'active'),
('Charlie Davis', 'charlie@example.com', '2024-11-25 09:45:00', 'UK', 'active'),
('Diana Martinez', 'diana@example.com', '2024-12-05 16:20:00', 'US', 'inactive'),
('Edward Wilson', 'edward@example.com', '2024-12-10 11:10:00', 'AU', 'active'),
('Fiona Brown', 'fiona@example.com', '2024-12-15 13:30:00', 'CA', 'active'),
('George Clark', 'george@example.com', '2024-12-20 10:00:00', 'US', 'active'),
('Hannah Lewis', 'hannah@example.com', '2024-12-25 15:45:00', 'UK', 'pending'),
('Ian Taylor', 'ian@example.com', '2025-01-05 09:20:00', 'US', 'active'),
('Julia White', 'julia@example.com', '2025-01-10 14:30:00', 'AU', 'active');

-- Insert sample data for Events
INSERT INTO events (timestamp, user_id, event_type, page, properties, duration) VALUES
('2025-04-01 10:00:00', 1, 'page_view', '/home', '{"referrer": "google"}', 5200),
('2025-04-01 10:05:23', 2, 'page_view', '/products', '{"referrer": "direct"}', 3100),
('2025-04-01 10:10:45', 1, 'button_click', '/products', '{"button_id": "add-to-cart"}', 150),
('2025-04-01 10:15:12', 3, 'page_view', '/home', '{"referrer": "facebook"}', 4500),
('2025-04-01 10:20:30', 2, 'form_submit', '/contact', '{"form_id": "contact-form"}', 900),
('2025-04-01 10:25:15', 4, 'page_view', '/about', '{"referrer": "direct"}', 2800),
('2025-04-01 10:30:45', 1, 'page_view', '/checkout', '{"referrer": "internal"}', 6200),
('2025-04-01 10:35:20', 5, 'button_click', '/products', '{"button_id": "filter"}', 200),
('2025-04-01 10:40:10', 2, 'page_view', '/cart', '{"referrer": "internal"}', 3500),
('2025-04-01 10:45:30', 3, 'form_submit', '/signup', '{"form_id": "registration"}', 1200),
('2025-04-01 10:50:15', 4, 'page_view', '/products', '{"referrer": "search"}', 4100),
('2025-04-01 10:55:45', 5, 'page_view', '/home', '{"referrer": "twitter"}', 3800),
('2025-04-01 11:00:20', 1, 'button_click', '/cart', '{"button_id": "checkout"}', 180),
('2025-04-01 11:05:10', 2, 'page_view', '/checkout', '{"referrer": "internal"}', 5500),
('2025-04-01 11:10:30', 3, 'page_view', '/confirmation', '{"referrer": "internal"}', 2500),
('2025-04-01 11:15:15', 6, 'page_view', '/home', '{"referrer": "instagram"}', 4300),
('2025-04-01 11:20:45', 7, 'page_view', '/products', '{"referrer": "direct"}', 3700),
('2025-04-01 11:25:20', 6, 'button_click', '/products', '{"button_id": "sort"}', 160),
('2025-04-01 11:30:10', 7, 'form_submit', '/contact', '{"form_id": "feedback"}', 950),
('2025-04-01 11:35:30', 8, 'page_view', '/home', '{"referrer": "linkedin"}', 4100);

-- Insert sample data for Products
INSERT INTO products (name, price, category, created_at) VALUES
('Laptop Pro', 1299.99, 'Electronics', '2025-01-15 10:00:00'),
('Smartphone X', 899.99, 'Electronics', '2025-01-20 14:30:00'),
('Wireless Headphones', 149.99, 'Audio', '2025-01-25 09:15:00'),
('Coffee Maker', 79.99, 'Home', '2025-02-01 11:30:00'),
('Fitness Tracker', 129.99, 'Wearables', '2025-02-05 16:45:00'),
('Desk Lamp', 39.99, 'Home', '2025-02-10 13:20:00'),
('Portable Charger', 49.99, 'Electronics', '2025-02-15 10:10:00'),
('Smart Speaker', 199.99, 'Audio', '2025-02-20 15:30:00'),
('Digital Camera', 599.99, 'Electronics', '2025-02-25 12:00:00'),
('Wireless Mouse', 29.99, 'Accessories', '2025-03-01 09:45:00');