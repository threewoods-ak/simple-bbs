-- Add original_message column for censored content
ALTER TABLE comments ADD COLUMN original_message TEXT;
