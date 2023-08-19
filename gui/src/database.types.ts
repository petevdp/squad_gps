export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
					offset: number
					path: Json | null
					progress: number | null
					status: string | null
					vehicle: string
				}
				Insert: {
					author: string
					category: string
					created_at?: string | null
					id: string
					map_name: string
					name: string
					offset?: number
					path?: Json | null
					progress?: number | null
					status?: string | null
					vehicle: string
				}
				Update: {
					author?: string
					category?: string
					created_at?: string | null
					id?: string
					map_name?: string
					name?: string
					offset?: number
					path?: Json | null
					progress?: number | null
					status?: string | null
					vehicle?: string
				}
				Relationships: [
					{
						foreignKeyName: 'routes_author_fkey'
						columns: ['author']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
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
