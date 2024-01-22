export type DbRouteParams = {
	name: string
	map_name: string
	vehicle: string
	category: string
	offset: number
	path?: any
	progress: number
	author: string
	status: string
}

export type DbRoute = {
	id: string
	created: string
	updated: string
} & DbRouteParams

export const MAP_NAMES = [
	'AlBasrah',
	'Anvil',
	'Belaya',
	'Black_Coast',
	'Chora',
	'Fools_Road',
	'GooseBay',
	'Gorodok',
	'Harju',
	'Kamdesh',
	'Kohat',
	'Logar_Valley',
	'Mutaha',
	'Narva',
	'Narva_Flooded',
	'Skorpo',
	'Sumari',
	'Fallujah',
	'Kokan',
	'Lashkar',
	'Manicouagan_Flooded',
	'Manicouagan',
	'Mestia',
	'Tallil_Outskirts',
	'Yehorivka',
] as const

//@ts-ignore
MAP_NAMES.sort()

export type MapName = (typeof MAP_NAMES)[number]
