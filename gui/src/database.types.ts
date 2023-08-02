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
			route_uploads: {
				Row: {
					created_at: string | null
					original_filename: string
					route_id: string
					status: string
					upload_id: string
				}
				Insert: {
					created_at?: string | null
					original_filename: string
					route_id: string
					status?: string
					upload_id: string
				}
				Update: {
					created_at?: string | null
					original_filename?: string
					route_id?: string
					status?: string
					upload_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'route_uploads_route_id_fkey'
						columns: ['route_id']
						referencedRelation: 'routes'
						referencedColumns: ['id']
					},
				]
			}
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
