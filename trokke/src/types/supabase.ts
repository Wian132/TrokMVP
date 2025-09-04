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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      business_stores: {
        Row: {
          address: string | null
          created_at: string
          id: number
          location: unknown | null
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: number
          location?: unknown | null
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: number
          location?: unknown | null
          name?: string
        }
        Relationships: []
      }
      client_stores: {
        Row: {
          address: string | null
          client_id: number
          created_at: string
          id: number
          location: unknown | null
          name: string
        }
        Insert: {
          address?: string | null
          client_id: number
          created_at?: string
          id?: number
          location?: unknown | null
          name: string
        }
        Update: {
          address?: string | null
          client_id?: number
          created_at?: string
          id?: number
          location?: unknown | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_stores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string | null
          id: number
          profile_id: string
        }
        Insert: {
          company_name?: string | null
          id?: number
          profile_id: string
        }
        Update: {
          company_name?: string | null
          id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diesel_purchases: {
        Row: {
          id: number
          is_active: boolean | null
          is_empty: boolean | null
          liters: number
          price_per_liter: number
          purchase_date: string
          spillage_liters: number | null
        }
        Insert: {
          id?: number
          is_active?: boolean | null
          is_empty?: boolean | null
          liters: number
          price_per_liter: number
          purchase_date?: string
          spillage_liters?: number | null
        }
        Update: {
          id?: number
          is_active?: boolean | null
          is_empty?: boolean | null
          liters?: number
          price_per_liter?: number
          purchase_date?: string
          spillage_liters?: number | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      pre_trip_checks: {
        Row: {
          battery_secure_and_clean: boolean
          brake_fluid_level_ok: boolean
          brakes_ok: boolean
          checked_at: string
          coolant_level_ok: boolean
          fridge_ok: boolean
          hooter_ok: boolean
          id: number
          issues_resolved: boolean
          lights_ok: boolean
          mirrors_ok: boolean
          oil_level_ok: boolean
          other_issues: string | null
          tires_ok: boolean
          truck_id: number
          tyre_pressure_correct: boolean
          tyre_pressure_images: string[] | null
          tyre_surface_condition: string | null
          tyre_surface_images: string[] | null
          windows_ok: boolean
          windshield_ok: boolean
          worker_id: number
        }
        Insert: {
          battery_secure_and_clean?: boolean
          brake_fluid_level_ok?: boolean
          brakes_ok?: boolean
          checked_at?: string
          coolant_level_ok?: boolean
          fridge_ok?: boolean
          hooter_ok?: boolean
          id?: never
          issues_resolved?: boolean
          lights_ok?: boolean
          mirrors_ok?: boolean
          oil_level_ok?: boolean
          other_issues?: string | null
          tires_ok?: boolean
          truck_id: number
          tyre_pressure_correct?: boolean
          tyre_pressure_images?: string[] | null
          tyre_surface_condition?: string | null
          tyre_surface_images?: string[] | null
          windows_ok?: boolean
          windshield_ok?: boolean
          worker_id: number
        }
        Update: {
          battery_secure_and_clean?: boolean
          brake_fluid_level_ok?: boolean
          brakes_ok?: boolean
          checked_at?: string
          coolant_level_ok?: boolean
          fridge_ok?: boolean
          hooter_ok?: boolean
          id?: never
          issues_resolved?: boolean
          lights_ok?: boolean
          mirrors_ok?: boolean
          oil_level_ok?: boolean
          other_issues?: string | null
          tires_ok?: boolean
          truck_id?: number
          tyre_pressure_correct?: boolean
          tyre_pressure_images?: string[] | null
          tyre_surface_condition?: string | null
          tyre_surface_images?: string[] | null
          windows_ok?: boolean
          windshield_ok?: boolean
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pre_trip_checks_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
          {
            foreignKeyName: "pre_trip_checks_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_trip_checks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_phone: string | null
          full_name: string | null
          id: string
          role_id: number | null
        }
        Insert: {
          contact_phone?: string | null
          full_name?: string | null
          id: string
          role_id?: number | null
        }
        Update: {
          contact_phone?: string | null
          full_name?: string | null
          id?: string
          role_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: number
          permission_id: number | null
          role_id: number | null
        }
        Insert: {
          id?: number
          permission_id?: number | null
          role_id?: number | null
        }
        Update: {
          id?: number
          permission_id?: number | null
          role_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          air_filter: boolean | null
          brakes: boolean | null
          comments: string | null
          created_at: string
          diesel_filter: boolean | null
          expense_amount: number | null
          id: number
          odo_reading: number | null
          oil_filter: boolean | null
          service_date: string | null
          supplier: string | null
          tires: boolean | null
          truck_id: number
        }
        Insert: {
          air_filter?: boolean | null
          brakes?: boolean | null
          comments?: string | null
          created_at?: string
          diesel_filter?: boolean | null
          expense_amount?: number | null
          id?: never
          odo_reading?: number | null
          oil_filter?: boolean | null
          service_date?: string | null
          supplier?: string | null
          tires?: boolean | null
          truck_id: number
        }
        Update: {
          air_filter?: boolean | null
          brakes?: boolean | null
          comments?: string | null
          created_at?: string
          diesel_filter?: boolean | null
          expense_amount?: number | null
          id?: never
          odo_reading?: number | null
          oil_filter?: boolean | null
          service_date?: string | null
          supplier?: string | null
          tires?: boolean | null
          truck_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_locations: {
        Row: {
          id: number
          location: unknown | null
          recorded_at: string
          truck_id: number
        }
        Insert: {
          id?: number
          location?: unknown | null
          recorded_at?: string
          truck_id: number
        }
        Update: {
          id?: number
          location?: unknown | null
          recorded_at?: string
          truck_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "truck_locations_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
          {
            foreignKeyName: "truck_locations_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_trips: {
        Row: {
          comments: string | null
          created_at: string
          dispensed_by_profile_id: string | null
          expense_amount: number | null
          expense_date: string | null
          fuel_pump_image_url: string | null
          id: number
          is_hours_based: boolean | null
          km_per_liter: number | null
          liters_filled: number | null
          next_service_km: number | null
          notes: string | null
          odometer_image_url: string | null
          opening_km: number | null
          refueler_profile_id: string | null
          route: string | null
          supplier: string | null
          tank_id: number | null
          total_km: number | null
          trip_date: string | null
          truck_id: number
          vehicle_reg_no_image_url: string | null
          worker_id: number | null
          worker_name: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          dispensed_by_profile_id?: string | null
          expense_amount?: number | null
          expense_date?: string | null
          fuel_pump_image_url?: string | null
          id?: number
          is_hours_based?: boolean | null
          km_per_liter?: number | null
          liters_filled?: number | null
          next_service_km?: number | null
          notes?: string | null
          odometer_image_url?: string | null
          opening_km?: number | null
          refueler_profile_id?: string | null
          route?: string | null
          supplier?: string | null
          tank_id?: number | null
          total_km?: number | null
          trip_date?: string | null
          truck_id: number
          vehicle_reg_no_image_url?: string | null
          worker_id?: number | null
          worker_name?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          dispensed_by_profile_id?: string | null
          expense_amount?: number | null
          expense_date?: string | null
          fuel_pump_image_url?: string | null
          id?: number
          is_hours_based?: boolean | null
          km_per_liter?: number | null
          liters_filled?: number | null
          next_service_km?: number | null
          notes?: string | null
          odometer_image_url?: string | null
          opening_km?: number | null
          refueler_profile_id?: string | null
          route?: string | null
          supplier?: string | null
          tank_id?: number | null
          total_km?: number | null
          trip_date?: string | null
          truck_id?: number
          vehicle_reg_no_image_url?: string | null
          worker_id?: number | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_trips_dispensed_by_profile_id_fkey"
            columns: ["dispensed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_trips_refueler_profile_id_fkey"
            columns: ["refueler_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_trips_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "diesel_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_trips_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
          {
            foreignKeyName: "truck_trips_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_trips_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          active_driver_id: number | null
          category: string | null
          created_at: string
          current_odo: number | null
          id: number
          is_hours_based: boolean
          last_calculated_avg_km_l: number | null
          license_plate: string
          make: string | null
          model: string | null
          next_service_km: number | null
          notes: string | null
          primary_driver_id: number | null
          service_interval_km: number | null
          service_warning_threshold: number | null
          status: Database["public"]["Enums"]["truck_status"]
          type: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          active_driver_id?: number | null
          category?: string | null
          created_at?: string
          current_odo?: number | null
          id?: number
          is_hours_based?: boolean
          last_calculated_avg_km_l?: number | null
          license_plate: string
          make?: string | null
          model?: string | null
          next_service_km?: number | null
          notes?: string | null
          primary_driver_id?: number | null
          service_interval_km?: number | null
          service_warning_threshold?: number | null
          status?: Database["public"]["Enums"]["truck_status"]
          type?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          active_driver_id?: number | null
          category?: string | null
          created_at?: string
          current_odo?: number | null
          id?: number
          is_hours_based?: boolean
          last_calculated_avg_km_l?: number | null
          license_plate?: string
          make?: string | null
          model?: string | null
          next_service_km?: number | null
          notes?: string | null
          primary_driver_id?: number | null
          service_interval_km?: number | null
          service_warning_threshold?: number | null
          status?: Database["public"]["Enums"]["truck_status"]
          type?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_assigned_worker_id_fkey"
            columns: ["active_driver_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_primary_driver_id_fkey"
            columns: ["primary_driver_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_assignment_assistants: {
        Row: {
          assignment_id: number
          worker_id: number
        }
        Insert: {
          assignment_id: number
          worker_id: number
        }
        Update: {
          assignment_id?: number
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_assignment_assistants_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "weekly_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_assignment_assistants_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_assignments: {
        Row: {
          activity_type: Database["public"]["Enums"]["assignment_activity_type"]
          assignment_date: string
          created_at: string
          destination: string | null
          driver_id: number | null
          end_hour: number | null
          id: number
          notes: string | null
          start_hour: number | null
          trip_name: string | null
          truck_id: number
          updated_at: string
          week_start_date: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["assignment_activity_type"]
          assignment_date: string
          created_at?: string
          destination?: string | null
          driver_id?: number | null
          end_hour?: number | null
          id?: number
          notes?: string | null
          start_hour?: number | null
          trip_name?: string | null
          truck_id: number
          updated_at?: string
          week_start_date: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["assignment_activity_type"]
          assignment_date?: string
          created_at?: string
          destination?: string | null
          driver_id?: number | null
          end_hour?: number | null
          id?: number
          notes?: string | null
          start_hour?: number | null
          trip_name?: string | null
          truck_id?: number
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_assignments_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
          {
            foreignKeyName: "weekly_assignments_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_name_aliases: {
        Row: {
          alias_name: string
          created_at: string
          id: number
          worker_id: number
        }
        Insert: {
          alias_name: string
          created_at?: string
          id?: never
          worker_id: number
        }
        Update: {
          alias_name?: string
          created_at?: string
          id?: never
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "worker_name_aliases_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          id: number
          profile_id: string
        }
        Insert: {
          id?: number
          profile_id: string
        }
        Update: {
          id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_truck_analytics: {
        Row: {
          avg_monthly_km_l: number | null
          category: string | null
          last_odometer_of_month: number | null
          license_plate: string | null
          month: string | null
          total_monthly_km: number | null
          total_monthly_liters: number | null
          truck_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_kml_for_period: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_kml: number
          first_odo: number
          first_odo_date: string
          last_odo: number
          last_odo_date: string
          latest_reading: number
          liters_rows_included: number
          odo_rows_included: number
          total_km: number
          total_liters: number
          truck_id: number
        }[]
      }
      delete_user: {
        Args: { user_id: string }
        Returns: undefined
      }
      get_all_map_markers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_all_truck_trip_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_trips: number
          truck_id: number
        }[]
      }
      get_all_worker_analytics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          total_km: number
          total_liters: number
          total_preday_checks: number
          total_trips: number
          worker_id: number
          worker_name: string
        }[]
      }
      get_client_truck_and_store_locations: {
        Args: { client_profile_id: string }
        Returns: Json
      }
      get_fleet_analytics: {
        Args:
          | Record<PropertyKey, never>
          | { end_date: string; start_date: string }
        Returns: {
          assigned_worker_name: string
          avg_kml: number
          cost_per_km: number
          current_odo: number
          license_plate: string
          make: string
          model: string
          next_service_km: number
          total_fuel_cost: number
          total_km: number
          total_liters: number
          total_service_cost: number
          truck_id: number
        }[]
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_superadmin_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_trucks: number
          avg_cost_per_km: number
          inactive_trucks: number
          overall_kml: number
          role_breakdown: Json
          total_checks: number
          total_diesel_cost: number
          total_km_traveled: number
          total_liters_fueled: number
          total_refuels: number
          total_service_cost: number
          total_spillage: number
          total_trips: number
          total_trucks: number
          total_workers: number
        }[]
      }
      get_truck_details_with_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          has_pre_trip_issues: boolean
          id: number
          is_hours_based: boolean
          latest_km_per_liter: number
          latest_odometer: number
          license_plate: string
          make: string
          missing_fields: string[]
          model: string
          next_service_km: number
          notes: string
          status: string
          total_trips: number
          worker_name: string
          year: number
        }[]
      }
      link_unmapped_trips: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_trucks_needs_attention: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      assignment_activity_type:
        | "Delivery"
        | "Collection"
        | "Service"
        | "Out of Action"
        | "Relocation"
        | "Other"
      truck_status: "active" | "inactive" | "under_service" | "decommissioned"
      user_role:
        | "admin"
        | "worker"
        | "client"
        | "refueler"
        | "SuperAdmin"
        | "floormanager"
        | "checker"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      assignment_activity_type: [
        "Delivery",
        "Collection",
        "Service",
        "Out of Action",
        "Relocation",
        "Other",
      ],
      truck_status: ["active", "inactive", "under_service", "decommissioned"],
      user_role: [
        "admin",
        "worker",
        "client",
        "refueler",
        "SuperAdmin",
        "floormanager",
        "checker",
      ],
    },
  },
} as const
