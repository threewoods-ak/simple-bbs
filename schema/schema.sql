-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    ip_hash TEXT NOT NULL
);

-- Create index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
