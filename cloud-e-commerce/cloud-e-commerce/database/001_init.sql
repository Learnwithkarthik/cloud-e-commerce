-- Demo schema. Applied ONLY when the PostgreSQL volume is first created.
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    emoji VARCHAR(12) NOT NULL DEFAULT '📦',
    color VARCHAR(20) NOT NULL DEFAULT '#e8edfb'
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(254) NOT NULL,
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    status VARCHAR(24) NOT NULL DEFAULT 'placed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(120) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

INSERT INTO products (name,category,description,price,stock,emoji,color) VALUES
('Wireless Headphones','Audio','Immersive sound, all-day comfort, and crisp calls.',2499.00,25,'🎧','#ede9fe'),
('Smart Watch Pro','Wearables','Health insights, notifications, and a sleek design.',3999.00,18,'⌚','#dbeafe'),
('Mechanical Keyboard','Accessories','Tactile keys for a better workflow.',3299.00,15,'⌨️','#fce7f3'),
('Portable Bluetooth Speaker','Audio','Big, clear sound in a compact package.',1899.00,30,'🔊','#fef3c7'),
('Laptop Stand','Accessories','Ergonomic aluminum desk companion.',1299.00,40,'💻','#dcfce7'),
('Digital Camera','Electronics','Capture daily moments in vivid detail.',12999.00,9,'📷','#ffedd5'),
('Gaming Mouse','Accessories','Precision sensor with a comfortable grip.',1499.00,28,'🖱️','#e0e7ff'),
('USB-C Docking Hub','Electronics','Connect displays, storage, and peripherals.',2799.00,20,'🔌','#ccfbf1');
