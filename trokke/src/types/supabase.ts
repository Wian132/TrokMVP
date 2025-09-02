export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          liters: number
          price_per_liter: number
          purchase_date: string
        }
        Insert: {
          id?: number
          liters: number
          price_per_liter: number
          purchase_date?: string
        }
        Update: {
          id?: number
          liters?: number
          price_per_liter?: number
          purchase_date?: string
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
          brakes_ok: boolean
          center_mirror_ok: boolean
          checked_at: string
          driver_mirror_ok: boolean
          driver_window_ok: boolean
          fridge_ok: boolean
          hooter_ok: boolean
          id: number
          issues_resolved: boolean
          lights_ok: boolean
          oil_level_ok: boolean
          other_issues: string | null
          passenger_mirror_ok: boolean
          passenger_window_ok: boolean
          tires_ok: Json | null
          truck_id: number
          water_level_ok: boolean
          windshield_ok: boolean
          worker_id: number
        }
        Insert: {
          brakes_ok?: boolean
          center_mirror_ok?: boolean
          checked_at?: string
          driver_mirror_ok?: boolean
          driver_window_ok?: boolean
          fridge_ok?: boolean
          hooter_ok?: boolean
          id?: never
          issues_resolved?: boolean
          lights_ok?: boolean
          oil_level_ok?: boolean
          other_issues?: string | null
          passenger_mirror_ok?: boolean
          passenger_window_ok?: boolean
          tires_ok?: Json | null
          truck_id: number
          water_level_ok?: boolean
          windshield_ok?: boolean
          worker_id: number
        }
        Update: {
          brakes_ok?: boolean
          center_mirror_ok?: boolean
          checked_at?: string
          driver_mirror_ok?: boolean
          driver_window_ok?: boolean
          fridge_ok?: boolean
          hooter_ok?: boolean
          id?: never
          issues_resolved?: boolean
          lights_ok?: boolean
          oil_level_ok?: boolean
          other_issues?: string | null
          passenger_mirror_ok?: boolean
          passenger_window_ok?: boolean
          tires_ok?: Json | null
          truck_id?: number
          water_level_ok?: boolean
          windshield_ok?: boolean
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pre_trip_checks_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_trip_checks_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
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
      refueler_logs: {
        Row: {
          id: number
          liters_filled: number
          notes: string | null
          odo_reading: number
          refuel_date: string
          tank_id: number | null
          truck_id: number
          worker_id: number
        }
        Insert: {
          id?: never
          liters_filled: number
          notes?: string | null
          odo_reading: number
          refuel_date?: string
          tank_id?: number | null
          truck_id: number
          worker_id: number
        }
        Update: {
          id?: never
          liters_filled?: number
          notes?: string | null
          odo_reading?: number
          refuel_date?: string
          tank_id?: number | null
          truck_id?: number
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "refueler_logs_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "diesel_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refueler_logs_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refueler_logs_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
          {
            foreignKeyName: "refueler_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
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
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
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
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_locations_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "monthly_truck_analytics"
            referencedColumns: ["truck_id"]
          },
        ]
      }
      truck_trips: {
        Row: {
          comments: string | null
          created_at: string
          expense_amount: number | null
          expense_date: string | null
          id: number
          is_hours_based: boolean | null
          km_per_liter: number | null
          liters_filled: number | null
          next_service_km: number | null
          notes: string | null
          opening_km: number | null
          supplier: string | null
          total_km: number | null
          trip_date: string | null
          truck_id: number
          worker_id: number | null
          worker_name: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          expense_amount?: number | null
          expense_date?: string | null
          id?: number
          is_hours_based?: boolean | null
          km_per_liter?: number | null
          liters_filled?: number | null
          next_service_km?: number | null
          notes?: string | null
          opening_km?: number | null
          supplier?: string | null
          total_km?: number | null
          trip_date?: string | null
          truck_id: number
          worker_id?: number | null
          worker_name?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          expense_amount?: number | null
          expense_date?: string | null
          id?: number
          is_hours_based?: boolean | null
          km_per_liter?: number | null
          liters_filled?: number | null
          next_service_km?: number | null
          notes?: string | null
          opening_km?: number | null
          supplier?: string | null
          total_km?: number | null
          trip_date?: string | null
          truck_id?: number
          worker_id?: number | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "truck_trips_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
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
          status?: Database["public"]["Enums"]["truck_status"]
          type?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_active_driver_id_fkey"
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
            isOneToOne: false
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
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          truck_id: number
          latest_reading: number
          first_odo: number
          last_odo: number
          first_odo_date: string
          last_odo_date: string
          total_km: number
          total_liters: number
          avg_kml: number
          odo_rows_included: number
          liters_rows_included: number
        }[]
      }
      delete_user: {
        Args: {
          user_id: string
        }
        Returns: undefined
      }
      get_all_map_markers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_all_truck_trip_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          truck_id: number
          total_trips: number
        }[]
      }
      get_all_worker_analytics: {
        Args: {
          start_date?: string
          end_date?: string
        }
        Returns: {
          worker_id: number
          worker_name: string
          total_trips: number
          total_km: number
          total_liters: number
          total_preday_checks: number
        }[]
      }
      get_client_truck_and_store_locations: {
        Args: {
          client_profile_id: string
        }
        Returns: Json
      }
      get_fleet_analytics: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          truck_id: number
          license_plate: string
          make: string
          model: string
          assigned_worker_name: string
          total_km: number
          total_liters: number
          total_fuel_cost: number
          total_service_cost: number
          avg_kml: number
          cost_per_km: number
          current_odo: number
          next_service_km: number
        }[]
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_truck_details_with_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          license_plate: string
          make: string
          model: string
          year: number
          category: string
          status: string
          notes: string
          worker_name: string
          latest_odometer: number
          latest_km_per_liter: number
          total_trips: number
          is_hours_based: boolean
          missing_fields: string[]
          next_service_km: number
          has_pre_trip_issues: boolean
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][PublicEnumNameOrOptions]
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

