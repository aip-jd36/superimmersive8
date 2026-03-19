-- SI8 CaaS Platform - Initial Database Schema
-- Created: March 19, 2026
-- Run this in Supabase SQL Editor after project creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Filmmaker Profile (Section 1)
  filmmaker_name TEXT NOT NULL,
  filmmaker_location TEXT,
  filmmaker_contact TEXT,
  filmmaker_portfolio_links TEXT,

  -- Production Overview (Section 2)
  title TEXT NOT NULL,
  runtime INTEGER, -- in seconds
  genre TEXT,
  logline TEXT,
  intended_use TEXT,

  -- Tool Disclosure (Section 3)
  tools_used JSONB NOT NULL, -- Array of {tool, version, plan_type, dates, receipt_url}

  -- Human Authorship Declaration (Section 4)
  authorship_statement TEXT NOT NULL, -- Min 150 words

  -- Likeness & Identity Confirmation (Section 5)
  likeness_confirmation JSONB NOT NULL, -- Checkbox confirmations

  -- IP & Brand Confirmation (Section 6)
  ip_confirmation JSONB NOT NULL, -- Checkbox confirmations

  -- Audio & Music Disclosure (Section 7)
  audio_disclosure JSONB NOT NULL, -- {source_type, documentation}

  -- Modification Rights Authorization (Section 8)
  modification_authorized BOOLEAN DEFAULT FALSE,
  modification_scope TEXT, -- "full" or "scene-level" or specific scenes

  -- Territory & Exclusivity Preferences (Section 9)
  territory_preferences TEXT DEFAULT 'Global',

  -- Supporting Materials (Section 10)
  supporting_materials JSONB, -- Array of file URLs

  -- Submission metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'info_requested', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.users(id),

  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount_paid INTEGER, -- in cents (49900 = $499.00)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opt-ins table (for Showcase Marketplace)
CREATE TABLE public.opt_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  catalog_id TEXT UNIQUE, -- SI8-2026-0001 format

  opted_in BOOLEAN DEFAULT FALSE,
  video_url TEXT, -- Vimeo/YouTube embed or direct URL
  thumbnail_url TEXT,
  public_description TEXT,
  genre TEXT[],
  style TEXT[],

  visible BOOLEAN DEFAULT TRUE, -- Admin can hide from catalog

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rights Packages table (9-field Chain of Title)
CREATE TABLE public.rights_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  catalog_id TEXT UNIQUE NOT NULL, -- SI8-2026-0001 format

  -- 9-Field Schema
  tool_provenance_log JSONB NOT NULL,
  model_disclosure TEXT,
  rights_verified_signoff JSONB NOT NULL, -- {reviewer, date, tier}
  commercial_use_authorization JSONB NOT NULL,
  modification_rights_status JSONB NOT NULL,
  category_conflict_log TEXT[],
  territory_log TEXT DEFAULT 'Global',
  regeneration_rights_status JSONB,
  version_history JSONB NOT NULL,

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Licensing Deals table
CREATE TABLE public.licensing_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,

  -- Buyer info
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_company TEXT,

  -- Deal details
  intended_use TEXT,
  territory TEXT,
  budget_range TEXT,
  deal_value INTEGER, -- in cents, actual negotiated price

  -- Status
  status TEXT DEFAULT 'negotiating' CHECK (status IN ('negotiating', 'closed', 'cancelled')),

  -- Payouts
  creator_payout INTEGER, -- 80% of deal_value
  si8_commission INTEGER, -- 20% of deal_value
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  type TEXT NOT NULL, -- 'submission_received', 'submission_approved', 'submission_rejected', 'licensing_request', 'deal_closed'
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Optional reference to related record
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.licensing_deals(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  action TEXT NOT NULL, -- 'submission_created', 'submission_approved', 'opt_in_toggled', 'deal_created', etc.
  entity_type TEXT NOT NULL, -- 'submission', 'opt_in', 'deal', etc.
  entity_id UUID NOT NULL,

  changes JSONB, -- What changed (old_value, new_value)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_payment_status ON public.submissions(payment_status);
CREATE INDEX idx_opt_ins_submission_id ON public.opt_ins(submission_id);
CREATE INDEX idx_opt_ins_visible ON public.opt_ins(visible);
CREATE INDEX idx_rights_packages_submission_id ON public.rights_packages(submission_id);
CREATE INDEX idx_licensing_deals_submission_id ON public.licensing_deals(submission_id);
CREATE INDEX idx_licensing_deals_status ON public.licensing_deals(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Submissions policies
CREATE POLICY "Users can view own submissions" ON public.submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update all submissions" ON public.submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Opt-ins policies
CREATE POLICY "Users can view own opt-ins" ON public.opt_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      WHERE submissions.id = opt_ins.submission_id
      AND submissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view visible opt-ins" ON public.opt_ins
  FOR SELECT USING (visible = true);

CREATE POLICY "Users can create opt-ins for own submissions" ON public.opt_ins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions
      WHERE submissions.id = opt_ins.submission_id
      AND submissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all opt-ins" ON public.opt_ins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Rights Packages policies
CREATE POLICY "Users can view own rights packages" ON public.rights_packages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      WHERE submissions.id = rights_packages.submission_id
      AND submissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all rights packages" ON public.rights_packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Licensing Deals policies
CREATE POLICY "Users can view deals for own submissions" ON public.licensing_deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      WHERE submissions.id = licensing_deals.submission_id
      AND submissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all deals" ON public.licensing_deals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Audit log policies
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opt_ins_updated_at BEFORE UPDATE ON public.opt_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rights_packages_updated_at BEFORE UPDATE ON public.rights_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licensing_deals_updated_at BEFORE UPDATE ON public.licensing_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate catalog ID
CREATE OR REPLACE FUNCTION generate_catalog_id()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  sequence_num INTEGER;
  catalog_id TEXT;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.rights_packages
  WHERE catalog_id LIKE 'SI8-' || year || '-%';

  catalog_id := 'SI8-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN catalog_id;
END;
$$ LANGUAGE plpgsql;

-- Initial admin user will be created after auth signup
-- Run this SQL after you create your first user account:
-- UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';
