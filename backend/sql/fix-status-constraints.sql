-- Migration: Fix status check constraints to include 'changes_requested'
-- This migration updates the CHECK constraints on approval_requests and approval_actions
-- to properly support the 'changes_requested' status

-- Drop old constraints
ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_actions DROP CONSTRAINT IF EXISTS approval_actions_status_check;

-- Re-create constraints with correct values
ALTER TABLE approval_requests 
ADD CONSTRAINT approval_requests_status_check 
CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'changes_requested'));

ALTER TABLE approval_actions 
ADD CONSTRAINT approval_actions_status_check 
CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'skipped', 'changes_requested'));

-- Clean up invalid data
UPDATE approval_actions SET status = 'pending' WHERE status = 'in_progress';

-- Verify constraints exist
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name IN ('approval_requests_status_check', 'approval_actions_status_check')
ORDER BY constraint_name;
