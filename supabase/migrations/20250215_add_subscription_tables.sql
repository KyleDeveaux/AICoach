-- Migration: Add Subscription System Tables
-- Description: Creates tables for subscription management, usage tracking, custom workouts, and Stripe event handling

-- ============================================
-- 1. SUBSCRIPTIONS TABLE
-- Primary subscription tracking, synced with Stripe
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe fields
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Subscription state
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'grandfathered')),
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),

  -- Important dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(profile_id),
  UNIQUE(stripe_customer_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- ============================================
-- 2. USAGE TRACKING TABLE
-- Tracks metered usage for AI features per billing period
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  -- Usage period (monthly billing cycle)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metered features
  ai_photo_analyses_used INT NOT NULL DEFAULT 0,
  ai_summaries_generated INT NOT NULL DEFAULT 0,
  ai_workout_feedback_used INT NOT NULL DEFAULT 0,
  ai_plan_regenerations_used INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(profile_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_profile_period ON usage_tracking(profile_id, period_start);

-- ============================================
-- 3. CUSTOM WORKOUTS TABLE
-- User-created workout templates
-- ============================================
CREATE TABLE IF NOT EXISTS custom_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',

  is_template BOOLEAN NOT NULL DEFAULT false,
  estimated_duration_minutes INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_workouts_profile ON custom_workouts(profile_id);

-- ============================================
-- 4. STRIPE EVENTS TABLE
-- Webhook event tracking for idempotency
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type);

-- ============================================
-- 5. MODIFY CLIENT_PROFILES TABLE
-- Add subscription-related columns
-- ============================================
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_client_profiles_subscription_tier ON client_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_client_profiles_stripe_customer ON client_profiles(stripe_customer_id);

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can only view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Usage tracking: Users can only view their own usage
CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Custom workouts: Full CRUD for own workouts
CREATE POLICY "Users can view own custom workouts"
  ON custom_workouts FOR SELECT
  USING (profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create own custom workouts"
  ON custom_workouts FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own custom workouts"
  ON custom_workouts FOR UPDATE
  USING (profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own custom workouts"
  ON custom_workouts FOR DELETE
  USING (profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Stripe events: Only service role can access (for webhooks)
-- No user-facing policy needed

-- ============================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to new tables
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_workouts_updated_at ON custom_workouts;
CREATE TRIGGER update_custom_workouts_updated_at
  BEFORE UPDATE ON custom_workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
