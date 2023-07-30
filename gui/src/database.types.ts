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
      routes: {
        Row: {
          author: string
          category: string
          created_at: string | null
          id: string
          map_name: string
          name: string
          path: Json | null
          upload_complete: boolean
          vehicle: string
          video_path: string
        }
        Insert: {
          author: string
          category: string
          created_at?: string | null
          id: string
          map_name: string
          name: string
          path?: Json | null
          upload_complete?: boolean
          vehicle: string
          video_path: string
        }
        Update: {
          author?: string
          category?: string
          created_at?: string | null
          id?: string
          map_name?: string
          name?: string
          path?: Json | null
          upload_complete?: boolean
          vehicle?: string
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_author_fkey"
            columns: ["author"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      categories: {
        Row: {
          category: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

