-- Add website/URL field to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(500);
