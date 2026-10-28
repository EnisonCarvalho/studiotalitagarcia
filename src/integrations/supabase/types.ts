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
      addons: {
        Row: {
          active: boolean
          duration_min: number
          id: string
          name: string
          price_cents: number
          range_note: string | null
          sort: number
        }
        Insert: {
          active?: boolean
          duration_min: number
          id?: string
          name: string
          price_cents: number
          range_note?: string | null
          sort?: number
        }
        Update: {
          active?: boolean
          duration_min?: number
          id?: string
          name?: string
          price_cents?: number
          range_note?: string | null
          sort?: number
        }
        Relationships: []
      }
      booking_events: {
        Row: {
          booking_id: string
          created_at: string
          data: Json | null
          id: string
          kind: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          data?: Json | null
          id?: string
          kind: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons: Json
          balance_cents: number
          block_end: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deposit_cents: number
          duration_min: number
          ends_at: string
          hold_expires_at: string | null
          id: string
          mp_payment_id: string | null
          paid_at: string | null
          payment_status: string
          period: unknown
          pix_qr_base64: string | null
          pix_qr_code: string | null
          service_id: string | null
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_cents: number
        }
        Insert: {
          addons?: Json
          balance_cents: number
          block_end: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deposit_cents: number
          duration_min: number
          ends_at: string
          hold_expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          payment_status?: string
          period?: unknown
          pix_qr_base64?: string | null
          pix_qr_code?: string | null
          service_id?: string | null
          service_name: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_cents: number
        }
        Update: {
          addons?: Json
          balance_cents?: number
          block_end?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          deposit_cents?: number
          duration_min?: number
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          payment_status?: string
          period?: unknown
          pix_qr_base64?: string | null
          pix_qr_code?: string | null
          service_id?: string | null
          service_name?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          break_end: string | null
          break_start: string | null
          close_time: string
          closed: boolean
          open_time: string
          weekday: number
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          close_time?: string
          closed?: boolean
          open_time?: string
          weekday: number
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          close_time?: string
          closed?: boolean
          open_time?: string
          weekday?: number
        }
        Relationships: []
      }
      calendar_blocks: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      calendar_exceptions: {
        Row: {
          close_time: string | null
          closed: boolean
          day: string
          note: string | null
          open_time: string | null
        }
        Insert: {
          close_time?: string | null
          closed?: boolean
          day: string
          note?: string | null
          open_time?: string | null
        }
        Update: {
          close_time?: string | null
          closed?: boolean
          day?: string
          note?: string | null
          open_time?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          allows_addons: boolean
          category: string
          created_at: string
          description: string | null
          duration_min: number
          id: string
          name: string
          price_cents: number
          sort: number
        }
        Insert: {
          active?: boolean
          allows_addons?: boolean
          category: string
          created_at?: string
          description?: string | null
          duration_min: number
          id?: string
          name: string
          price_cents: number
          sort?: number
        }
        Update: {
          active?: boolean
          allows_addons?: boolean
          category?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          price_cents?: number
          sort?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          buffer_min: number
          deposit_percent: number
          hold_minutes: number
          id: number
          slot_step_min: number
        }
        Insert: {
          buffer_min?: number
          deposit_percent?: number
          hold_minutes?: number
          id?: number
          slot_step_min?: number
        }
        Update: {
          buffer_min?: number
          deposit_percent?: number
          hold_minutes?: number
          id?: number
          slot_step_min?: number
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_payment_status: {
        Args: { _booking_id: string; _mp_status: string; _payment_id: string }
        Returns: Database["public"]["Enums"]["booking_status"]
      }
      available_slots: {
        Args: { _addon_ids: string[]; _day: string; _service_id: string }
        Returns: string[]
      }
      booking_quote: {
        Args: { _addon_ids: string[]; _service_id: string }
        Returns: {
          addons: Json
          balance_cents: number
          deposit_cents: number
          duration_min: number
          service_name: string
          total_cents: number
        }[]
      }
      create_booking: {
        Args: {
          _addon_ids: string[]
          _email: string
          _name: string
          _phone: string
          _service_id: string
          _starts_at: string
        }
        Returns: string
      }
      get_booking_public: {
        Args: { _id: string }
        Returns: {
          addons: Json
          balance_cents: number
          customer_name: string
          deposit_cents: number
          duration_min: number
          has_payment: boolean
          hold_expires_at: string
          id: string
          payment_status: string
          pix_qr_base64: string
          pix_qr_code: string
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_cents: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      booking_status: "pending" | "confirmed" | "cancelled" | "expired"
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
      app_role: ["admin", "user"],
      booking_status: ["pending", "confirmed", "cancelled", "expired"],
    },
  },
} as const
