-- Globe Protocol Database Schema (SQLite)
-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    agent_id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL UNIQUE,
    name TEXT,
    capabilities TEXT NOT NULL DEFAULT '[]',
    pricing_model TEXT DEFAULT '{}',
    region_lat REAL DEFAULT 0,
    region_lon REAL DEFAULT 0,
    reputation_score REAL DEFAULT 0,
    total_contracts INTEGER DEFAULT 0,
    successful_contracts INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    service_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    capability TEXT NOT NULL,
    description TEXT,
    price_min REAL,
    price_max REAL,
    pricing_model TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
    offer_id TEXT PRIMARY KEY,
    requester_agent_id TEXT NOT NULL,
    provider_agent_id TEXT NOT NULL,
    service_id TEXT,
    capability TEXT NOT NULL,
    price REAL NOT NULL,
    deadline TEXT,
    nonce TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (requester_agent_id) REFERENCES agents(agent_id),
    FOREIGN KEY (provider_agent_id) REFERENCES agents(agent_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);

-- Escrows table
CREATE TABLE IF NOT EXISTS escrows (
    escrow_id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL,
    requester_agent_id TEXT NOT NULL,
    provider_agent_id TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'local',
    contract_address TEXT,
    amount REAL NOT NULL,
    token_address TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'created',
    tx_create TEXT,
    tx_fund TEXT,
    tx_release TEXT,
    tx_refund TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (offer_id) REFERENCES offers(offer_id),
    FOREIGN KEY (requester_agent_id) REFERENCES agents(agent_id),
    FOREIGN KEY (provider_agent_id) REFERENCES agents(agent_id)
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id TEXT PRIMARY KEY,
    escrow_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    artifact_hash TEXT NOT NULL,
    attestation TEXT,
    delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (escrow_id) REFERENCES escrows(escrow_id),
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
    verification_id TEXT PRIMARY KEY,
    escrow_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL,
    verified_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (escrow_id) REFERENCES escrows(escrow_id),
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    escrow_id TEXT,
    agent_a TEXT,
    agent_b TEXT,
    amount REAL,
    capability TEXT,
    lat_a REAL,
    lon_a REAL,
    lat_b REAL,
    lon_b REAL,
    tx_hash TEXT,
    metadata_json TEXT,
    ts TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Nonces table
CREATE TABLE IF NOT EXISTS nonces (
    wallet TEXT PRIMARY KEY,
    nonce INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_capability ON services(capability);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);
