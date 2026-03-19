export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          profile_image_url: string | null
          bio: string | null
          website_url: string | null
          created_at: string
          updated_at: string
          stripe_customer_id: string | null
          auth_id: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          role?: string
          profile_image_url?: string | null
          bio?: string | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
          stripe_customer_id?: string | null
          auth_id: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          profile_image_url?: string | null
          bio?: string | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
          stripe_customer_id?: string | null
          auth_id?: string
        }
      }
      submissions: {
        Row: {
          id: string
          user_id: string
          title: string
          runtime_seconds: number | null
          genre: string | null
          logline: string | null
          intended_use: string | null
          tools_used: Json | null
          authorship_statement: string | null
          likeness_confirmed: boolean
          ip_confirmed: boolean
          audio_source: string | null
          audio_documentation: string | null
          modification_authorized: boolean
          modification_scope: string | null
          territory: string
          existing_restrictions: string | null
          receipt_urls: Json | null
          process_screenshots_urls: Json | null
          status: string
          reviewer_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          payment_status: string
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          amount_paid: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          runtime_seconds?: number | null
          genre?: string | null
          logline?: string | null
          intended_use?: string | null
          tools_used?: Json | null
          authorship_statement?: string | null
          likeness_confirmed?: boolean
          ip_confirmed?: boolean
          audio_source?: string | null
          audio_documentation?: string | null
          modification_authorized?: boolean
          modification_scope?: string | null
          territory?: string
          existing_restrictions?: string | null
          receipt_urls?: Json | null
          process_screenshots_urls?: Json | null
          status?: string
          reviewer_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          payment_status?: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount_paid?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          runtime_seconds?: number | null
          genre?: string | null
          logline?: string | null
          intended_use?: string | null
          tools_used?: Json | null
          authorship_statement?: string | null
          likeness_confirmed?: boolean
          ip_confirmed?: boolean
          audio_source?: string | null
          audio_documentation?: string | null
          modification_authorized?: boolean
          modification_scope?: string | null
          territory?: string
          existing_restrictions?: string | null
          receipt_urls?: Json | null
          process_screenshots_urls?: Json | null
          status?: string
          reviewer_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          payment_status?: string
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount_paid?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      opt_ins: {
        Row: {
          id: string
          submission_id: string
          user_id: string
          opted_in: boolean
          opted_in_at: string | null
          visible: boolean
          video_url: string
          thumbnail_url: string | null
          catalog_description: string | null
          tags: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          user_id: string
          opted_in?: boolean
          opted_in_at?: string | null
          visible?: boolean
          video_url: string
          thumbnail_url?: string | null
          catalog_description?: string | null
          tags?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          user_id?: string
          opted_in?: boolean
          opted_in_at?: string | null
          visible?: boolean
          video_url?: string
          thumbnail_url?: string | null
          catalog_description?: string | null
          tags?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      rights_packages: {
        Row: {
          id: string
          submission_id: string
          user_id: string
          tool_provenance_log: Json | null
          model_disclosure: string | null
          rights_verified_signoff: Json | null
          commercial_use_authorization: Json | null
          modification_rights_status: Json | null
          category_conflict_log: Json | null
          territory_log: string
          regeneration_rights_status: Json | null
          version_history: Json | null
          pdf_url: string | null
          pdf_generated_at: string | null
          catalog_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          user_id: string
          tool_provenance_log?: Json | null
          model_disclosure?: string | null
          rights_verified_signoff?: Json | null
          commercial_use_authorization?: Json | null
          modification_rights_status?: Json | null
          category_conflict_log?: Json | null
          territory_log?: string
          regeneration_rights_status?: Json | null
          version_history?: Json | null
          pdf_url?: string | null
          pdf_generated_at?: string | null
          catalog_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          user_id?: string
          tool_provenance_log?: Json | null
          model_disclosure?: string | null
          rights_verified_signoff?: Json | null
          commercial_use_authorization?: Json | null
          modification_rights_status?: Json | null
          category_conflict_log?: Json | null
          territory_log?: string
          regeneration_rights_status?: Json | null
          version_history?: Json | null
          pdf_url?: string | null
          pdf_generated_at?: string | null
          catalog_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      licensing_deals: {
        Row: {
          id: string
          submission_id: string
          rights_package_id: string
          creator_id: string
          buyer_id: string | null
          buyer_name: string
          buyer_email: string
          buyer_company: string | null
          license_type: string | null
          territory: string
          duration_months: number | null
          deal_value: number
          si8_commission: number
          creator_payout: number
          payment_status: string
          stripe_payment_intent_id: string | null
          paid_at: string | null
          status: string
          contract_signed_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          link_url: string | null
          read: boolean
          read_at: string | null
          created_at: string
        }
      }
      audit_log: {
        Row: {
          id: string
          admin_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          details: Json | null
          created_at: string
        }
      }
    }
  }
}
