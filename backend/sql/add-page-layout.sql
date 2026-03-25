-- Migration: Add page_layout column to approval_types table
-- This migration adds support for saving page layout (portrait/landscape) for approval types

-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'approval_types' AND column_name = 'page_layout'
  ) THEN
    ALTER TABLE approval_types ADD COLUMN page_layout VARCHAR(20) DEFAULT 'portrait';
  END IF;
END
$$;
