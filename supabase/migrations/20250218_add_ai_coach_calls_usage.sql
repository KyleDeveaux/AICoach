-- Migration: Add AI Coach Calls Usage Tracking
-- Description: Adds column for tracking AI coach calls usage for Elite tier

-- Add ai_coach_calls_used column to usage_tracking table
ALTER TABLE usage_tracking
  ADD COLUMN IF NOT EXISTS ai_coach_calls_used INT NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN usage_tracking.ai_coach_calls_used IS 'Number of AI coach calls used this billing period (Elite tier: 2/month)';
