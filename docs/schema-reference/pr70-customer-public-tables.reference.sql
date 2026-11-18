-- Root Health customer database public table STRUCTURE (catalog-derived)
-- Source: Supabase root-health-v2 / witkwlgldxjwwxmpcyva
-- Date: 2026-11-18. READ-ONLY source catalog extraction. NO CUSTOMER ROWS.
-- REFERENCE ONLY: NOT a pg_dump, not executable migration; review dependencies, policies, sequences, enums, managed functions and object ordering.
-- WARNING: Do not deploy this file directly. See separate security catalog.

CREATE TABLE public."body_signals" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  areas text[],
  signal text,
  depth text,
  system text,
  intensity integer,
  context text,
  what_helped text,
  profile_key text,
  symptoms text[],
  timing_contexts text[],
  duration_patterns text[],
  modifiers text[],
  notes text,
  location_detail text,
  supersedes_id uuid,
  record_state text DEFAULT 'active'::text NOT NULL
);

CREATE TABLE public."coach_signals" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  profile_key text NOT NULL,
  session_key text,
  source text NOT NULL,
  category text NOT NULL,
  theme text NOT NULL,
  valence text NOT NULL,
  intensity integer,
  confidence numeric(4,3),
  change_direction text,
  recommended_mode text,
  intervention text,
  follow_up boolean DEFAULT false NOT NULL,
  include_in_org_insights boolean DEFAULT false NOT NULL
);

CREATE TABLE public."consumer_capacity_leads" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  marketing_consent boolean DEFAULT false NOT NULL,
  consent_text text NOT NULL,
  consented_at timestamp with time zone DEFAULT now() NOT NULL,
  stress_score integer NOT NULL,
  sleep_score integer NOT NULL,
  recovery_score integer NOT NULL,
  energy_score integer NOT NULL,
  mood_score integer NOT NULL,
  focus_score integer NOT NULL,
  burnout_score integer NOT NULL,
  average_load numeric(3,1),
  dominant_signal text,
  dominant_score integer,
  result_band text,
  source text DEFAULT 'direct'::text,
  campaign text,
  medium text,
  referrer text,
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."intervention_outcomes" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_key text DEFAULT 'main'::text,
  organisation_id uuid,
  source text DEFAULT 'mind'::text NOT NULL,
  emotional_state text,
  target text NOT NULL,
  intervention_category text NOT NULL,
  intervention_name text NOT NULL,
  before_score integer NOT NULL,
  after_score integer,
  score_change integer GENERATED ALWAYS AS (
CASE
    WHEN (after_score IS NULL) THEN NULL::integer
    ELSE (after_score - before_score)
END) STORED,
  improvement_points integer GENERATED ALWAYS AS (
CASE
    WHEN (after_score IS NULL) THEN NULL::integer
    ELSE (before_score - after_score)
END) STORED,
  completed boolean DEFAULT false NOT NULL,
  context text,
  user_observation text,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  intervention_id uuid,
  intervention_slug text,
  intervention_version integer
);

CREATE TABLE public."introducer_agreement_acceptances" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  agreement_id uuid NOT NULL,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  evidence jsonb NOT NULL,
  terms_snapshot jsonb NOT NULL,
  terms_hash text NOT NULL,
  review_pdf_sha256 text NOT NULL,
  archive_state text DEFAULT 'pending'::text NOT NULL,
  progress jsonb DEFAULT '{}'::jsonb NOT NULL,
  deliveries jsonb DEFAULT '{}'::jsonb NOT NULL,
  lease_id uuid,
  lease_until timestamp with time zone
);

CREATE TABLE public."introducer_agreement_invitations" (
  token_hash text NOT NULL,
  agreement_id uuid NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '90 days'::interval) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."introducer_agreement_review_copies" (
  agreement_id uuid NOT NULL,
  pdf_base64 text NOT NULL,
  pdf_sha256 text NOT NULL,
  source_revision text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."introducer_google_agreement_operations" (
  id uuid NOT NULL,
  introducer_id uuid NOT NULL,
  agreement_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  payload jsonb NOT NULL,
  progress jsonb DEFAULT '{}'::jsonb NOT NULL,
  state text DEFAULT 'running'::text NOT NULL,
  lease_id uuid,
  lease_until timestamp with time zone,
  result jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE TABLE public."introducer_google_agreement_returns" (
  agreement_id uuid NOT NULL,
  returned_at timestamp with time zone DEFAULT now() NOT NULL,
  notification_state text DEFAULT 'started'::text NOT NULL,
  notification_message_id text
);

CREATE TABLE public."journal_entries" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_key text DEFAULT 'main'::text,
  prompt_type text,
  title text,
  content text,
  emotional_theme text,
  dominant_feeling text,
  recommended_coach_mode text,
  recommended_prompt text,
  created_at timestamp with time zone DEFAULT now(),
  organisation_id uuid
);

CREATE TABLE public."mind_entries" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_key text DEFAULT 'main'::text,
  tool text,
  situation text,
  automatic_thought text,
  emotion text,
  intensity text,
  reframe text,
  next_step text,
  created_at timestamp with time zone DEFAULT now(),
  outcome_score integer,
  outcome_label text,
  thought_theme text,
  thought_notice text,
  thought_question text,
  thought_next_step text,
  organisation_id uuid
);

CREATE TABLE public."organisation_actions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  rationale text,
  evidence_summary text,
  owner text,
  status text DEFAULT 'planned'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  start_date date,
  review_date date,
  completed_date date,
  expected_outcome text,
  success_measure text,
  source text NOT NULL,
  source_reference text,
  outcome_summary text,
  outcome_status text DEFAULT 'not_reviewed'::text NOT NULL,
  created_by uuid DEFAULT auth.uid() NOT NULL,
  human_confirmed boolean NOT NULL
);

CREATE TABLE public."organisation_applications" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  organisation_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  employee_count text,
  industry text,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  admin_email text,
  legal_entity_number text,
  organisation_domain text,
  root_customer_group_id uuid,
  trial_eligibility_status text DEFAULT 'unchecked'::text,
  trial_eligibility_reason text,
  trial_eligibility_checked_at timestamp with time zone,
  trial_override boolean DEFAULT false NOT NULL,
  organisation_type text,
  associated_business_declared boolean DEFAULT false NOT NULL,
  associated_business_name text,
  pilot_decision text DEFAULT 'pending'::text NOT NULL,
  pilot_decision_reason text,
  pilot_decision_note text,
  pilot_decided_at timestamp with time zone,
  pilot_decided_by uuid,
  decline_email_sent_at timestamp with time zone,
  access_path text DEFAULT 'trial'::text NOT NULL,
  payment_status text DEFAULT 'not_started'::text NOT NULL,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  paid_at timestamp with time zone,
  introducer_id uuid,
  introducer_campaign_id uuid,
  referral_code text,
  referral_campaign_code text,
  commission_percent_at_conversion numeric(5,2),
  commission_basis_at_conversion text,
  referral_attributed_at timestamp with time zone,
  commission_structure_at_conversion text,
  introducer_vat_registered_at_conversion boolean,
  introducer_vat_number_at_conversion text,
  introducer_vat_rate_at_conversion numeric(5,2)
);

CREATE TABLE public."organisation_commercial_documents" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  document_number text NOT NULL,
  document_type text NOT NULL,
  introducer_id uuid,
  commission_id uuid,
  application_id uuid,
  organisation_id uuid,
  organisation_name text,
  recipient_name text,
  recipient_email text,
  currency text DEFAULT 'gbp'::text NOT NULL,
  amount numeric DEFAULT 0 NOT NULL,
  commission_percent numeric,
  payment_reference text,
  document_status text DEFAULT 'generated'::text NOT NULL,
  generated_at timestamp with time zone,
  sent_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public."organisation_commissions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  revenue_event_id uuid NOT NULL,
  introducer_id uuid NOT NULL,
  introducer_campaign_id uuid,
  application_id uuid,
  organisation_id uuid,
  organisation_name text NOT NULL,
  referral_code text,
  referral_campaign_code text,
  commission_percent numeric(7,4) NOT NULL,
  commission_basis text NOT NULL,
  commission_structure text NOT NULL,
  commission_event text DEFAULT 'initial_payment'::text NOT NULL,
  currency text DEFAULT 'gbp'::text NOT NULL,
  collected_amount numeric(14,2) NOT NULL,
  qualifying_amount numeric(14,2) NOT NULL,
  commission_amount numeric(14,2) NOT NULL,
  status text DEFAULT 'earned'::text NOT NULL,
  earned_at timestamp with time zone DEFAULT now() NOT NULL,
  clearance_until timestamp with time zone,
  payable_at timestamp with time zone,
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  payout_provider text,
  payout_reference text,
  provider_payout_id text,
  reversal_of_commission_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  invoice_requested_at timestamp with time zone,
  invoice_received_at timestamp with time zone,
  invoice_reference text,
  remittance_document_id uuid,
  vat_registered boolean DEFAULT false NOT NULL,
  vat_rate numeric(5,2) DEFAULT 0 NOT NULL,
  vat_amount numeric(12,2) DEFAULT 0 NOT NULL,
  total_payable numeric(12,2) NOT NULL,
  personal_attribution_id uuid,
  personal_vat_number_at_conversion text
);

CREATE TABLE public."organisation_employee_invites" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  person_id uuid NOT NULL,
  recipient_email text NOT NULL,
  token_hash text NOT NULL,
  request_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  delivery_status text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  accepted_at timestamp with time zone,
  accepted_by uuid,
  provider_message_id text
);

CREATE TABLE public."organisation_hr_activity" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  user_id uuid NOT NULL,
  department text,
  role text,
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  organisation_unit_id uuid
);

CREATE TABLE public."organisation_hr_invites" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'hr_admin'::text NOT NULL,
  token uuid DEFAULT gen_random_uuid() NOT NULL,
  invited_by uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  organisation_unit_id uuid
);

CREATE TABLE public."organisation_introducer_agreements" (
  id uuid NOT NULL,
  introducer_id uuid NOT NULL,
  previous_agreement_id uuid,
  version integer NOT NULL,
  status text NOT NULL,
  document_id text NOT NULL,
  document_url text NOT NULL,
  template_document_id text NOT NULL,
  template_revision text,
  terms_snapshot jsonb NOT NULL,
  terms_hash text NOT NULL,
  sent_terms_snapshot jsonb,
  accepted_terms_snapshot jsonb,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  sent_to text,
  email_message_id text,
  accepted_at timestamp with time zone,
  accepted_by uuid,
  pdf_document_id text,
  pdf_document_url text,
  pdf_sha256 text,
  source_revision text,
  superseded_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisation_introducer_campaigns" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  introducer_id uuid NOT NULL,
  campaign_code text NOT NULL,
  campaign_name text,
  status text DEFAULT 'active'::text NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisation_introducer_policies" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  introducer_id uuid NOT NULL,
  commission_percent numeric(7,4) NOT NULL,
  commission_basis text DEFAULT 'collected_subscription_revenue'::text NOT NULL,
  commission_structure text DEFAULT 'one_off'::text NOT NULL,
  effective_from timestamp with time zone DEFAULT now() NOT NULL,
  effective_until timestamp with time zone,
  change_reason text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisation_introducers" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  referral_code text NOT NULL,
  commission_percent numeric(5,2) DEFAULT 0 NOT NULL,
  commission_basis text DEFAULT 'collected_subscription_revenue'::text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  agreement_start_date date,
  agreement_end_date date,
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  commission_structure text DEFAULT 'one_off'::text NOT NULL,
  payment_document_method text DEFAULT 'introducer_invoice'::text,
  vat_registered boolean DEFAULT false NOT NULL,
  vat_number text,
  introducer_market text DEFAULT 'corporate'::text NOT NULL,
  introducer_type text DEFAULT 'corporate_introducer'::text NOT NULL
);

CREATE TABLE public."organisation_learning_reviews" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  created_by uuid,
  review_date date DEFAULT CURRENT_DATE NOT NULL,
  sickness_days numeric,
  turnover numeric,
  agency_spend numeric,
  overtime_hours numeric,
  vacancies numeric,
  business_events text[] DEFAULT '{}'::text[] NOT NULL,
  business_event_notes text,
  initiatives text[] DEFAULT '{}'::text[] NOT NULL,
  initiative_notes text,
  watch_items text[] DEFAULT '{}'::text[] NOT NULL,
  root_reflection text,
  confidence_label text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisation_members" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid,
  profile_key text NOT NULL,
  email text,
  name text,
  department text,
  role text DEFAULT 'employee'::text,
  invited_at timestamp with time zone DEFAULT now(),
  activated_at timestamp with time zone,
  baseline_completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone,
  user_id uuid,
  organisation_unit_id uuid
);

CREATE TABLE public."organisation_people" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  organisation_member_id uuid,
  organisation_unit_id uuid,
  manager_person_id uuid,
  employee_reference_id text,
  employee_reference_normalized text GENERATED ALWAYS AS (NULLIF(lower(btrim(employee_reference_id)), ''::text)) STORED,
  name text NOT NULL,
  business_email text,
  business_email_normalized text GENERATED ALWAYS AS (NULLIF(lower(btrim(business_email)), ''::text)) STORED,
  job_title text,
  location text,
  workforce_status text DEFAULT 'active'::text NOT NULL,
  status_changed_at timestamp with time zone DEFAULT now() NOT NULL,
  source text DEFAULT 'manual'::text NOT NULL,
  last_confirmed_at timestamp with time zone,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisation_profiles" (
  organisation_id uuid NOT NULL,
  profile jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid
);

CREATE TABLE public."organisation_reports" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid,
  report_type text DEFAULT 'trial_review'::text,
  report_period_start date,
  report_period_end date,
  report_title text,
  executive_summary text,
  root_insight text,
  key_findings jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public."organisation_revenue_events" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid,
  application_id uuid,
  event_type text DEFAULT 'payment_received'::text NOT NULL,
  payment_source text NOT NULL,
  currency text DEFAULT 'gbp'::text NOT NULL,
  gross_amount numeric(14,2) NOT NULL,
  refunded_amount numeric(14,2) DEFAULT 0 NOT NULL,
  net_collected_amount numeric(14,2) NOT NULL,
  received_at timestamp with time zone NOT NULL,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  external_payment_reference text,
  verified_at timestamp with time zone,
  verified_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  personal_attribution_id uuid
);

CREATE TABLE public."organisation_setup_invites" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  application_id uuid NOT NULL,
  intended_email text NOT NULL,
  intended_role text DEFAULT 'organisation_admin'::text NOT NULL,
  token_hash text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  redeemed_at timestamp with time zone,
  redeemed_by_user_id uuid,
  revoked_at timestamp with time zone,
  created_organisation_id uuid,
  redemption_ip text,
  redemption_user_agent text
);

CREATE TABLE public."organisation_trial_registry" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid,
  legal_entity_number text,
  legal_entity_name text NOT NULL,
  normalised_name text NOT NULL,
  organisation_domain text,
  trial_started_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisation_units" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  name text NOT NULL,
  unit_type text DEFAULT 'department'::text NOT NULL,
  parent_unit_id uuid,
  active boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organisations" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  trial_start date,
  trial_end date,
  status text DEFAULT 'trial'::text,
  created_at timestamp with time zone DEFAULT now(),
  contact_name text,
  contact_email text,
  employee_count text,
  industry text,
  organisation_code text,
  subscription_status text DEFAULT 'trial'::text,
  subscription_plan text DEFAULT 'trial'::text,
  subscription_active boolean DEFAULT true,
  renewal_date date,
  workforce_size integer,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_activated_at timestamp with time zone,
  subscription_updated_at timestamp with time zone,
  legal_entity_number text,
  organisation_domain text,
  root_customer_group_id uuid,
  organisation_type text,
  introducer_id uuid,
  introducer_campaign_id uuid,
  referral_code text,
  referral_campaign_code text,
  commission_percent_at_conversion numeric(5,2),
  commission_basis_at_conversion text,
  referral_attributed_at timestamp with time zone,
  commission_structure_at_conversion text
);

CREATE TABLE public."personal_acquisition_events" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_name text NOT NULL,
  acquisition_id uuid,
  campaign_id text,
  asset_id uuid,
  attribution_session_id uuid NOT NULL,
  user_id uuid,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  dedupe_key text NOT NULL,
  source text,
  medium text
);

CREATE TABLE public."personal_referral_attributions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  introducer_id uuid NOT NULL,
  policy_id uuid,
  referral_code text NOT NULL,
  commission_percent numeric NOT NULL,
  commission_basis text NOT NULL,
  commission_structure text NOT NULL,
  vat_registered boolean NOT NULL,
  vat_number text,
  vat_rate numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  first_paid_at timestamp with time zone
);

CREATE TABLE public."personal_subscriptions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  plan text NOT NULL,
  subscription_status text DEFAULT 'pending'::text NOT NULL,
  subscription_active boolean DEFAULT false NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  stripe_price_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  subscription_activated_at timestamp with time zone,
  subscription_cancelled_at timestamp with time zone,
  subscription_updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."playbook_entries" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  title text NOT NULL,
  category text DEFAULT 'General'::text NOT NULL,
  content text NOT NULL,
  source text DEFAULT 'Root'::text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  profile_key text DEFAULT 'main'::text,
  organisation_id uuid,
  item_type text DEFAULT 'static'::text NOT NULL,
  tracker_definition jsonb
);

CREATE TABLE public."playbook_entry_versions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  playbook_entry_id uuid NOT NULL,
  user_id uuid NOT NULL,
  profile_key text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  source text,
  original_created_at timestamp with time zone,
  original_updated_at timestamp with time zone,
  version_created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."playbook_tracker_entries" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tracker_id uuid NOT NULL,
  user_id uuid NOT NULL,
  profile_key text NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."profiles" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  name text,
  age text,
  height text,
  weight text,
  goal text,
  conditions text,
  medications text,
  allergies text,
  diet text,
  created_at timestamp with time zone DEFAULT now(),
  profile_key text,
  department text,
  organisation_id uuid,
  organisation_name text,
  subscription_status text DEFAULT 'organisation'::text,
  last_seen_at timestamp with time zone,
  email text,
  marketing_opt_in boolean DEFAULT false,
  marketing_opt_in_at timestamp with time zone,
  orientation_completed boolean DEFAULT false
);

CREATE TABLE public."proposal_requests" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  initiative text,
  workshop_title text,
  audience text,
  duration text,
  delivery_preference text,
  notes text,
  status text DEFAULT 'pending'::text,
  source text,
  delivery_format text,
  location text,
  estimated_investment text,
  notify_email text
);

CREATE TABLE public."root_customer_groups" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  display_name text NOT NULL,
  complimentary_pilot_used boolean DEFAULT false NOT NULL,
  complimentary_pilot_started_at timestamp with time zone,
  complimentary_pilot_organisation_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."root_interventions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  category text DEFAULT 'other'::text NOT NULL,
  target text,
  description text,
  script text,
  audio_url text,
  video_url text,
  status text DEFAULT 'draft'::text NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  parent_intervention_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."root_measurements" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cycle_id uuid NOT NULL,
  user_id uuid,
  profile_key text,
  organisation_id uuid,
  domain text NOT NULL,
  construct_key text NOT NULL,
  construct_label text NOT NULL,
  measurement_question text,
  phase text NOT NULL,
  score numeric NOT NULL,
  higher_score_means text DEFAULT 'greater_difficulty'::text NOT NULL,
  intervention_key text,
  intervention_label text,
  source_page text,
  change_score numeric,
  improvement_score numeric,
  completed_cycle boolean DEFAULT false NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."voice_sessions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_key text DEFAULT 'main'::text,
  category text DEFAULT 'General'::text NOT NULL,
  topic text,
  summary text,
  user_goal text,
  suggested_action text,
  follow_up_prompt text,
  created_at timestamp with time zone DEFAULT now(),
  outcome_rating integer,
  organisation_id uuid
);

CREATE TABLE public."wellbeing_assessments" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_key text DEFAULT 'main'::text,
  assessment_type text DEFAULT 'checkin'::text,
  stress_score integer,
  sleep_score integer,
  recovery_score integer,
  energy_score integer,
  mood_score integer,
  focus_score integer,
  burnout_score integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  organisation_id uuid
);
