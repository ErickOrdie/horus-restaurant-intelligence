export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_engine_config: {
        Row: {
          base_url: string | null
          default_model_id: string | null
          last_health_at: string | null
          last_health_latency_ms: number | null
          last_health_status: string | null
          min_confidence: number
          organization_id: string
          sync_interval_s: number
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          default_model_id?: string | null
          last_health_at?: string | null
          last_health_latency_ms?: number | null
          last_health_status?: string | null
          min_confidence?: number
          organization_id: string
          sync_interval_s?: number
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          default_model_id?: string | null
          last_health_at?: string | null
          last_health_latency_ms?: number | null
          last_health_status?: string | null
          min_confidence?: number
          organization_id?: string
          sync_interval_s?: number
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_engine_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          architecture: string
          classes: string[]
          created_at: string
          endpoint: string
          id: string
          image_input: string
          license: string | null
          license_notes: string | null
          metrics: Json | null
          metrics_source: string | null
          min_confidence: number
          name: string
          organization_id: string
          output_key: string
          price_per_inference: number | null
          provider: string
          purpose: string | null
          requirements: string | null
          roboflow_model_id: string | null
          slug: string
          source_repo: string | null
          status: string
          task: string
          version: string
          weights_status: string
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          architecture: string
          classes?: string[]
          created_at?: string
          endpoint: string
          id?: string
          image_input?: string
          license?: string | null
          license_notes?: string | null
          metrics?: Json | null
          metrics_source?: string | null
          min_confidence?: number
          name: string
          organization_id: string
          output_key?: string
          price_per_inference?: number | null
          provider?: string
          purpose?: string | null
          requirements?: string | null
          roboflow_model_id?: string | null
          slug: string
          source_repo?: string | null
          status?: string
          task: string
          version?: string
          weights_status?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          architecture?: string
          classes?: string[]
          created_at?: string
          endpoint?: string
          id?: string
          image_input?: string
          license?: string | null
          license_notes?: string | null
          metrics?: Json | null
          metrics_source?: string | null
          min_confidence?: number
          name?: string
          organization_id?: string
          output_key?: string
          price_per_inference?: number | null
          provider?: string
          purpose?: string | null
          requirements?: string | null
          roboflow_model_id?: string | null
          slug?: string
          source_repo?: string | null
          status?: string
          task?: string
          version?: string
          weights_status?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          type: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          type: string
          unit_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          code: string
          connection_type: string
          created_at: string
          enabled: boolean
          fps: number | null
          id: string
          last_error: string | null
          last_event_at: string | null
          last_latency_ms: number | null
          model_id: string | null
          name: string
          resolution: string | null
          schedule: string | null
          sector: string
          status: string
          stream_ref: string | null
          unit_id: string
        }
        Insert: {
          code: string
          connection_type: string
          created_at?: string
          enabled?: boolean
          fps?: number | null
          id?: string
          last_error?: string | null
          last_event_at?: string | null
          last_latency_ms?: number | null
          model_id?: string | null
          name: string
          resolution?: string | null
          schedule?: string | null
          sector: string
          status?: string
          stream_ref?: string | null
          unit_id: string
        }
        Update: {
          code?: string
          connection_type?: string
          created_at?: string
          enabled?: boolean
          fps?: number | null
          id?: string
          last_error?: string | null
          last_event_at?: string | null
          last_latency_ms?: number | null
          model_id?: string | null
          name?: string
          resolution?: string | null
          schedule?: string | null
          sector?: string
          status?: string
          stream_ref?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cameras_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_events: {
        Row: {
          confirmed: boolean
          duration_seconds: number
          id: string
          started_at: string
          table_id: string | null
          unit_id: string
        }
        Insert: {
          confirmed?: boolean
          duration_seconds: number
          id?: string
          started_at: string
          table_id?: string | null
          unit_id: string
        }
        Update: {
          confirmed?: boolean
          duration_seconds?: number
          id?: string
          started_at?: string
          table_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_events_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      dining_tables: {
        Row: {
          area: string
          code: string
          id: string
          seats: number
          status: string
          status_since: string
          unit_id: string
        }
        Insert: {
          area?: string
          code: string
          id?: string
          seats?: number
          status?: string
          status_since?: string
          unit_id: string
        }
        Update: {
          area?: string
          code?: string
          id?: string
          seats?: number
          status?: string
          status_since?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dining_tables_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          active: boolean
          category: string
          cost_per_kg: number
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          category: string
          cost_per_kg?: number
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          category?: string
          cost_per_kg?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inference_runs: {
        Row: {
          camera_id: string | null
          created_at: string
          created_by: string | null
          detections: Json | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          image_path: string | null
          model_id: string | null
          organization_id: string
          processing_ms: number | null
          source: string
          status: string
          summary: Json | null
          task: string
          unit_id: string | null
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          created_by?: string | null
          detections?: Json | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          image_path?: string | null
          model_id?: string | null
          organization_id: string
          processing_ms?: number | null
          source?: string
          status: string
          summary?: Json | null
          task: string
          unit_id?: string | null
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          created_by?: string | null
          detections?: Json | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          image_path?: string | null
          model_id?: string | null
          organization_id?: string
          processing_ms?: number | null
          source?: string
          status?: string
          summary?: Json | null
          task?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inference_runs_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inference_runs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inference_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inference_runs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      occupancy_metrics: {
        Row: {
          available_count: number
          awaiting_count: number
          camera_id: string | null
          created_at: string
          id: string
          occupancy_percent: number | null
          occupied_count: number
          organization_id: string
          people_count: number | null
          processing_ms: number | null
          run_id: string
          table_count: number | null
          unit_id: string
          unknown_count: number | null
        }
        Insert: {
          available_count?: number
          awaiting_count?: number
          camera_id?: string | null
          created_at?: string
          id?: string
          occupancy_percent?: number | null
          occupied_count?: number
          organization_id: string
          people_count?: number | null
          processing_ms?: number | null
          run_id: string
          table_count?: number | null
          unit_id: string
          unknown_count?: number | null
        }
        Update: {
          available_count?: number
          awaiting_count?: number
          camera_id?: string | null
          created_at?: string
          id?: string
          occupancy_percent?: number | null
          occupied_count?: number
          organization_id?: string
          people_count?: number | null
          processing_ms?: number | null
          run_id?: string
          table_count?: number | null
          unit_id?: string
          unknown_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "occupancy_metrics_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_metrics_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "inference_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_metrics_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      plate_analyses: {
        Row: {
          analyzed_at: string
          composition: Json
          estimated_cost: number
          id: string
          price_charged: number
          unit_id: string
          weight_g: number
        }
        Insert: {
          analyzed_at: string
          composition?: Json
          estimated_cost: number
          id?: string
          price_charged: number
          unit_id: string
          weight_g: number
        }
        Update: {
          analyzed_at?: string
          composition?: Json
          estimated_cost?: number
          id?: string
          price_charged?: number
          unit_id?: string
          weight_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "plate_analyses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roboflow_config: {
        Row: {
          cleaning_goal_s: number
          currency: string
          daily_limit: number
          enabled: boolean
          endpoint: string
          last_error: string | null
          last_latency_ms: number | null
          last_status: string | null
          last_test_at: string | null
          min_frame_interval_s: number
          model_id: string
          model_version: string
          monthly_limit: number
          organization_id: string
          price_per_inference: number | null
          requests_per_minute: number
          timeout_ms: number
          updated_at: string
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          cleaning_goal_s?: number
          currency?: string
          daily_limit?: number
          enabled?: boolean
          endpoint?: string
          last_error?: string | null
          last_latency_ms?: number | null
          last_status?: string | null
          last_test_at?: string | null
          min_frame_interval_s?: number
          model_id?: string
          model_version?: string
          monthly_limit?: number
          organization_id: string
          price_per_inference?: number | null
          requests_per_minute?: number
          timeout_ms?: number
          updated_at?: string
          workflow_id?: string
          workspace_id?: string
        }
        Update: {
          cleaning_goal_s?: number
          currency?: string
          daily_limit?: number
          enabled?: boolean
          endpoint?: string
          last_error?: string | null
          last_latency_ms?: number | null
          last_status?: string | null
          last_test_at?: string | null
          min_frame_interval_s?: number
          model_id?: string
          model_version?: string
          monthly_limit?: number
          organization_id?: string
          price_per_inference?: number | null
          requests_per_minute?: number
          timeout_ms?: number
          updated_at?: string
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roboflow_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roboflow_requests: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          error_message: string | null
          estimated_cost: number | null
          http_status: number | null
          id: string
          idempotency_key: string
          model_id: string
          organization_id: string
          processing_ms: number | null
          result: Json | null
          run_id: string | null
          status: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          error_message?: string | null
          estimated_cost?: number | null
          http_status?: number | null
          id?: string
          idempotency_key: string
          model_id: string
          organization_id: string
          processing_ms?: number | null
          result?: Json | null
          run_id?: string | null
          status?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          error_message?: string | null
          estimated_cost?: number | null
          http_status?: number | null
          id?: string
          idempotency_key?: string
          model_id?: string
          organization_id?: string
          processing_ms?: number | null
          result?: Json | null
          run_id?: string | null
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roboflow_requests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roboflow_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roboflow_requests_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "inference_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roboflow_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_responses: {
        Row: {
          comment: string | null
          id: string
          responded_at: string
          score: number
          unit_id: string
        }
        Insert: {
          comment?: string | null
          id?: string
          responded_at: string
          score: number
          unit_id: string
        }
        Update: {
          comment?: string | null
          id?: string
          responded_at?: string
          score?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_responses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      service_visits: {
        Row: {
          arrived_at: string
          id: string
          party_size: number
          sector: string
          unit_id: string
          wait_seconds: number
        }
        Insert: {
          arrived_at: string
          id?: string
          party_size?: number
          sector: string
          unit_id: string
          wait_seconds: number
        }
        Update: {
          arrived_at?: string
          id?: string
          party_size?: number
          sector?: string
          unit_id?: string
          wait_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      table_regions: {
        Row: {
          camera_id: string
          id: string
          organization_id: string
          points: Json
          table_id: string
        }
        Insert: {
          camera_id: string
          id?: string
          organization_id: string
          points: Json
          table_id: string
        }
        Update: {
          camera_id?: string
          id?: string
          organization_id?: string
          points?: Json
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_regions_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_regions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_regions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_state_events: {
        Row: {
          camera_id: string | null
          created_at: string
          id: string
          organization_id: string
          run_id: string | null
          source: string
          state: string
          table_id: string
          unit_id: string
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          run_id?: string | null
          source: string
          state: string
          table_id: string
          unit_id: string
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          run_id?: string | null
          source?: string
          state?: string
          table_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_state_events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_state_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_state_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "inference_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_state_events_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_state_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          total_tables: number
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          total_tables?: number
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          total_tables?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_records: {
        Row: {
          estimated_cost: number
          food_id: string | null
          id: string
          recorded_at: string
          unit_id: string
          waste_g: number
        }
        Insert: {
          estimated_cost: number
          food_id?: string | null
          id?: string
          recorded_at: string
          unit_id: string
          waste_g: number
        }
        Update: {
          estimated_cost?: number
          food_id?: string | null
          id?: string
          recorded_at?: string
          unit_id?: string
          waste_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_records_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_unit: { Args: { _unit: string }; Returns: boolean }
      can_manage: { Args: never; Returns: boolean }
      current_org: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reserve_roboflow_request: {
        Args: { p_key: string; p_model: string; p_unit: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "supervisor" | "operador" | "analista"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "supervisor", "operador", "analista"],
    },
  },
} as const
