-- FitVault Database Schema
-- Fully compatible with MySQL 5.1+ (WampServer / MySQL 5.1.36)

CREATE DATABASE IF NOT EXISTS fitvault_db CHARACTER SET utf8 COLLATE utf8_unicode_ci;
USE fitvault_db;

-- A. Users, Devices & Sessions
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') DEFAULT 'staff',
    is_active TINYINT(1) DEFAULT 1,
    photo_url VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS user_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_uuid VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_token VARCHAR(191) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- B. Sports, Offers, Subscriptions & Debts
CREATE TABLE IF NOT EXISTS sports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_single_session_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS offers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_type ENUM('session', 'standard_month', 'custom_days', 'custom_months') NOT NULL,
    duration_value INT NOT NULL,
    sessions_count INT NULL,
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS offer_sports (
    offer_id INT NOT NULL,
    sport_id INT NOT NULL,
    PRIMARY KEY (offer_id, sport_id),
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    barcode VARCHAR(64) UNIQUE NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(120) NULL,
    emergency_contact VARCHAR(100) NULL,
    photo_url TEXT NULL,
    gender VARCHAR(20) NULL,
    date_of_birth DATE NULL,
    address VARCHAR(255) NULL,
    initial_debt DECIMAL(10,2) DEFAULT 0.00,
    total_debt DECIMAL(10,2) DEFAULT 0.00,
    created_at DATETIME NULL,
    INDEX idx_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS inscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_id INT NOT NULL,
    offer_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remaining_sessions INT NULL,
    status ENUM('active', 'expired', 'frozen', 'cancelled') DEFAULT 'active',
    total_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('paid', 'partial', 'pending') DEFAULT 'pending',
    created_at DATETIME NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_id INT NOT NULL,
    inscription_id INT NULL,
    sport_id INT NOT NULL,
    is_debt_session TINYINT(1) DEFAULT 0,
    debt_id INT NULL,
    checked_in_at DATETIME NOT NULL,
    checked_out_at DATETIME NULL,
    status ENUM('present', 'departed') DEFAULT 'present',
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (inscription_id) REFERENCES inscriptions(id) ON DELETE SET NULL,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS member_debts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_id INT NOT NULL,
    attendance_id INT NULL,
    product_sale_id INT NULL,
    sport_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('unpaid', 'settled') DEFAULT 'unpaid',
    incurred_at DATETIME NULL,
    settled_at DATETIME NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (attendance_id) REFERENCES attendance_logs(id) ON DELETE SET NULL,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- C. Dual-Mode Retail Inventory (Tel Quel vs Fractionné)
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    barcode VARCHAR(64) UNIQUE NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80),
    product_type ENUM('standard', 'fractional') NOT NULL DEFAULT 'standard',
    buy_price_unit DECIMAL(10,2) NOT NULL,
    sell_price_unit DECIMAL(10,2) NOT NULL,
    container_capacity DECIMAL(10,2) NULL,
    serving_dose_size DECIMAL(10,2) NULL,
    sell_price_whole DECIMAL(10,2) NULL,
    sell_price_dose DECIMAL(10,2) NULL,
    sell_price_per_100g DECIMAL(10,2) NULL,
    stock_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    min_stock_alert DECIMAL(10,2) DEFAULT 5.00,
    is_archived TINYINT(1) DEFAULT 0,
    created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS product_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    purchase_date DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS product_purchase_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_added DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_line_cost DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES product_purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS product_sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    customer_type ENUM('member', 'passage') DEFAULT 'passage' NOT NULL,
    member_id INT NULL,
    guest_name VARCHAR(100) NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'debt') NOT NULL,
    sale_date DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE RESTRICT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS product_sale_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    sale_format ENUM('piece_standard', 'whole_pack', 'spoon_dose', 'by_weight') NOT NULL,
    quantity_sold DECIMAL(10,2) NOT NULL,
    stock_deducted DECIMAL(10,2) NOT NULL,
    unit_price_charged DECIMAL(10,2) NOT NULL,
    total_line_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES product_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- D. Central Treasury (Gestion de Caisse)
CREATE TABLE IF NOT EXISTS caisse_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    flow_direction ENUM('in', 'out') NOT NULL,
    module_category ENUM('entrainement', 'boutique', 'general', 'autre') NOT NULL,
    transaction_type ENUM('alimentation', 'retrait_general', 'paiement_inscription', 'reglement_dette', 'vente_produit', 'achat_stock_produit', 'recette') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    related_id INT NULL,
    member_id INT NULL,
    motif VARCHAR(255) NOT NULL,
    transaction_date DATETIME NULL,
    note TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE RESTRICT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- E. Audit Logging
CREATE TABLE IF NOT EXISTS log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NULL,
    device_uuid VARCHAR(64) NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NULL,
    record_id VARCHAR(100) NULL,
    details LONGTEXT NULL,
    user_name VARCHAR(255) NULL,
    device_name VARCHAR(255) NULL,
    ip_address VARCHAR(100) NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id),
    INDEX idx_device_uuid (device_uuid),
    INDEX idx_action (action),
    INDEX idx_table_name (table_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- F. Gym Settings
CREATE TABLE IF NOT EXISTS gym_settings (
    id INT PRIMARY KEY DEFAULT 1,
    gym_name VARCHAR(255) DEFAULT '',
    facebook VARCHAR(255) DEFAULT '',
    phone VARCHAR(100) DEFAULT '',
    logo_url VARCHAR(255) DEFAULT NULL,
    badge_image_url VARCHAR(255) DEFAULT NULL,
    badge_template VARCHAR(50) DEFAULT 'standard',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Initial seed data
INSERT IGNORE INTO users (id, full_name, username, password_hash, role, is_active) VALUES 
(1, 'Admin', 'admin', '$2b$10$X7XnZQgA8Cq1I1y7m9a7kO5d9wH1V1Z4jQy6pD3kF9v6K4mQx8F7C', 'admin', 1);

INSERT IGNORE INTO gym_settings (id, gym_name, facebook, phone, badge_template)
VALUES (1, 'FitVault Gym', '', '', 'standard');


