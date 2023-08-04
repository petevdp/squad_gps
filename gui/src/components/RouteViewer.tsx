import {
	Accessor,
	batch,
	Component,
	createEffect,
	createSignal,
	For,
	getOwner,
	mapArray,
	onMount,
	Show,
} from 'solid-js'
import * as L from 'leaflet'
import tailwindColors from 'tailwindcss/colors'
import { useSearchParams } from '@solidjs/router'
import { createStore } from 'solid-js/store'
import * as SB from '../supabase'
import { MultiSelectInput, SelectInput } from './Input'
import { createFormControl, createFormGroup, IFormControl } from 'solid-forms'
import * as Modal from './Modal'
import { RouteUploadGuarded } from './RouteUpload'
import { Login } from './Login'
import { Guarded } from './Guarded'
import { RealtimeChannel } from '@supabase/supabase-js'
import { DbRoute, MAP_NAMES, MapName } from '../types'

type ButtonColor = {
	enabled: string
	disabled: string
}

type RouteUIState = {
	enabled: boolean
}

type RouteMetadata = {
	name: string
	author: string
	map: string
	category: string
	description: string | null
	submitDate: string
	vehicle: string
	timeOffset: number
}

export type Route = {
	name: string
	id: string
	path: Measurement[] | null
	metadata: RouteMetadata
	state: RouteUIState
}

export type UploadedRoute = Route & { path: Measurement[] }

type Measurement = {
	x: number
	y: number
	time: number
}

// we need to list full classes here so the tailwind compiler picks them up
const ROUTE_COLORS: ButtonColor[] = [
	{ enabled: 'border-b-blue-500', disabled: 'border-b-blue-200' },
	{ enabled: 'border-b-green-500', disabled: 'border-b-green-200' },
	{ enabled: 'border-b-red-500', disabled: 'border-b-red-200' },
	{ enabled: 'border-b-purple-500', disabled: 'border-b-purple-200' },
	{ enabled: 'border-b-yellow-500', disabled: 'border-b-yellow-200' },
	{ enabled: 'border-b-pink-500', disabled: 'border-b-pink-200' },
	{ enabled: 'border-b-indigo-500', disabled: 'border-b-indigo-200' },
	{ enabled: 'border-b-fuchsia-500', disabled: 'border-b-fuchsia-200' },
	{ enabled: 'border-b-rose-500', disabled: 'border-b-rose-200' },
	{ enabled: 'border-b-cyan-500', disabled: 'border-b-cyan-200' },
	{ enabled: 'border-b-lime-500', disabled: 'border-b-lime-200' },
	{ enabled: 'border-b-emerald-500', disabled: 'border-b-emerald-200' },
	{ enabled: 'border-b-teal-500', disabled: 'border-b-teal-200' },
]

function RouteViewer() {
	const mapElt = (
		<div
			id={'app-' + crypto.randomUUID()}
			style="height: 100vh; width: 100vw"
		/>
	) as HTMLDivElement
	const searchGroup = createFormGroup({
		map: createFormControl<MapName | null>(null),
		category: createFormControl<string[]>([]),
		vehicle: createFormControl<string[]>([]),
	})
	useMapName(
		(mapName) => searchGroup.controls.map.setValue(mapName),
		() => searchGroup.controls.map.value
	)
	const mapName = () => searchGroup.controls.map.value

	const { routes, setRouteEnabled } = useRoutes(mapName)
	const { categories, vehicles, filteredRouteEntries } = useMap(
		mapElt.id,
		mapName,
		searchGroup.controls.category,
		searchGroup.controls.vehicle,
		routes
	)

	const owner = getOwner()!
	// unfortunately this signal will not directly track with the state of the modal, we just use this to show the modal
	const uploadModal = Modal.addModal(
		{
			title: 'Upload new Route',
			render: (visible, setVisible) => (
				<RouteUploadGuarded
					map={mapName()!}
					closeModal={() => setVisible(false)}
				/>
			),
		},
		owner
	)
	const loginModal = Modal.addModal(
		{
			title: 'Log In',
			render: (visible, setVisible) => (
				<Login onCompleted={() => setVisible(false)} />
			),
		},
		owner
	)

	const invertEnabled = () => {
		batch(() => {
			for (let route of filteredRouteEntries()) {
				setRouteEnabled(route.id, !route.state.enabled)
			}
		})
	}
	const enableAll = () => {
		batch(() => {
			for (let route of filteredRouteEntries()) {
				setRouteEnabled(route.id, true)
			}
		})
	}

	const disableAll = () => {
		batch(() => {
			for (let route of filteredRouteEntries()) {
				setRouteEnabled(route.id, false)
			}
		})
	}

	return (
		<>
			<div
				class="absolute left-2 top-2 flex max-h-[95vh] w-[350px] flex-col rounded bg-white p-2 text-sm"
				style="z-index: 500;"
			>
				<div class="mb-2 grid  grid-cols-[1fr_1fr] grid-rows-[min-content_min-content_min-content_auto] gap-1">
					<SelectInput
						class="col-span-2"
						control={searchGroup.controls.map}
						label="Map"
						options={() => [...MAP_NAMES]}
					/>
					<MultiSelectInput
						control={searchGroup.controls.category}
						label="Category"
						options={categories}
					/>
					<MultiSelectInput
						control={searchGroup.controls.vehicle}
						label="Vehicle"
						options={vehicles}
					/>
					<div class="col-span-2 flex flex-row justify-start whitespace-nowrap">
						<button
							type="button"
							onclick={invertEnabled}
							class="bg-secondary hover:bg-secondary-600 focus:bg-secondary-600 active:bg-secondary-700 relative col-span-2 mr-1 inline-block w-min rounded px-2 py-1 text-xs font-medium leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						>
							Invert
						</button>
						<button
							type="button"
							class="bg-secondary hover:bg-secondary-600 focus:bg-secondary-600 active:bg-secondary-700 relative col-span-2 mr-1 inline-block w-min rounded px-2 py-1 text-xs font-medium leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
							onclick={enableAll}
						>
							Enable All
						</button>
						<button
							type="button"
							class="bg-secondary hover:bg-secondary-600 focus:bg-secondary-600 active:bg-secondary-700 relative col-span-2 inline-block w-min rounded px-2 py-1 text-xs font-medium leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
							onclick={disableAll}
						>
							Disable All
						</button>
					</div>
				</div>
				<ul class="w-full overflow-y-scroll">
					<For each={filteredRouteEntries()}>
						{(route, idx) => (
							<RouteListItem
								route={route}
								enabled={route.state.enabled}
								buttonColor={ROUTE_COLORS[idx() % ROUTE_COLORS.length]}
								toggleRouteEnabled={() =>
									setRouteEnabled(route.id, !route.state.enabled)
								}
							/>
						)}
					</For>
				</ul>
			</div>
			<div class="absolute right-2 top-2" style="z-index: 500;">
				<Show when={!SB.session()}>
					<button
						class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						onClick={() => loginModal.setVisible(true)}
					>
						Log In
					</button>
				</Show>
				<Show when={SB.session()}>
					<button
						class="secondary bg-secondary hover:bg-secondary-600 focus:bg-secondary-600 active:bg-secondary-700 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						onClick={() => {
							SB.logOut()
						}}
					>
						Log Out
					</button>
					<button
						type="button"
						class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						style="z-index:500"
						onclick={async () => {
							const isLoggedIn = await Modal.ensureLoggedIn(
								owner,
								'You need to be logged in to upload a route.'
							)
							if (isLoggedIn) uploadModal.setVisible(true)
						}}
					>
						New
					</button>
				</Show>
			</div>
			{mapElt}
		</>
	)
}

export const GuardedRouteViewer: Component = () => (
	<Guarded>
		<RouteViewer />
	</Guarded>
)

type RouteListItemProps = {
	route: Route
	enabled: boolean
	buttonColor: ButtonColor
	toggleRouteEnabled: () => void
}
const RouteListItem: Component<RouteListItemProps> = (props) => {
	const editModal = Modal.addModal(
		{
			title: 'Edit Route',
			render: (visible, setVisible) => (
				<RouteUploadGuarded
					routeToEdit={props.route}
					map={props.route.metadata.map}
					closeModal={() => setVisible(false)}
				/>
			),
		},
		getOwner()!
	)
	const borderStyle = () =>
		props.enabled ? props.buttonColor.enabled : props.buttonColor.disabled
	const owner = getOwner()!
	return (
		<li
			class="inset-2 flex w-full cursor-pointer flex-col justify-between border-b-2 border-neutral-100 border-opacity-100 p-2 hover:bg-gray-100 dark:border-opacity-50"
			onclick={() => props.toggleRouteEnabled()}
		>
			<div
				class={
					'flex w-full border-b-2 border-solid font-semibold ' + borderStyle()
				}
			>
				{props.route.name}
			</div>
			<div class="flex w-full flex-row justify-between border-b-2">
				<span>
					<small class="mr-2 font-light">{props.route.metadata.category}</small>
					<small class="ml-2 font-light">{props.route.metadata.vehicle}</small>
				</span>
				<button
					onclick={async (e) => {
						e.stopPropagation()
						const isLoggedIn = await Modal.ensureLoggedIn(
							owner,
							'You need to be logged in to upload a route.'
						)
						if (isLoggedIn) editModal.setVisible(true)
					}}
					class="align-center justify-self-end"
				>
					edit
				</button>
			</div>
		</li>
	)
}

function useMapName(
	setMap: (mapName: MapName) => void,
	map: Accessor<MapName | null>
) {
	const [params, setParams] = useSearchParams()

	onMount(() => {
		// @ts-ignore
		if (!params.map || !MAP_NAMES.includes(params.map)) {
			setMap(MAP_NAMES[0])
		} else {
			setMap(params.map as MapName)
		}
	})
	createEffect(() => {
		if (map()) {
			setParams({ map: map()! })
		}
	})
}

function useRoutes(mapName: Accessor<string | null>) {
	let routeInsertChannel: RealtimeChannel
	const [routesStore, setRoutes] = createStore<UploadedRoute[]>([])
	createEffect(async () => {
		const _mapName = mapName()
		if (mapName === null) return

		const filterRoute = (route: Route): route is UploadedRoute =>
			!!route.path && route.path.length > 0

		{
			const { data: routeRecords, error } = await SB.sb
				.from('routes')
				.select('*')
				.eq('map_name', _mapName)

			if (error) {
				console.error(error)
				return
			}

			const routes = routeRecords
				.map((r, i) => convertDbRoute(r))
				.filter(filterRoute) as UploadedRoute[]
			setRoutes(routes)
		}

		if (routeInsertChannel) await routeInsertChannel.unsubscribe()
		routeInsertChannel = SB.sb
			.channel('routes-update-channel')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'routes',
					filter: 'map_name=eq.' + _mapName,
				},
				(payload) => {
					if (payload.eventType === 'DELETE') {
						setRoutes(routesStore.filter((r) => r.id !== payload.old.id))
						return
					}
					const route = convertDbRoute(payload.new as DbRoute)
					if (!filterRoute(route)) return
					if (payload.eventType === 'INSERT') {
						setRoutes((routes) => [...routes, route])
					}
					if (payload.eventType === 'UPDATE') {
						let routeIdx = routesStore.findIndex((r) => r.id === route.id)
						if (routeIdx === -1) {
							setRoutes((routes) => [...routes, route])
						} else {
							setRoutes((r) => r.id == payload.new.id, route)
						}
					}
				}
			)
			.subscribe()
	})

	const setRouteEnabled = (id: string, enabled: boolean) => {
		setRoutes(
			(r) => r.id === id,
			'state',
			'enabled',
			() => enabled
		)
	}

	return { routes: routesStore, setRouteEnabled }
}

function useMap(
	mapEltId: string,
	mapName: Accessor<MapName | null>,
	categoryFilterControl: IFormControl<string[]>,
	vehicleFilterControl: IFormControl<string[]>,
	routes: UploadedRoute[]
) {
	const [comparisonMarker, setComparisonMarker] = createSignal<{
		clickedRouteId: string
		point: L.Point
	} | null>(null, { equals: false })

	const categories = () => [...new Set(routes.map((r) => r.metadata.category))]
	const vehicles = () => [...new Set(routes.map((r) => r.metadata.vehicle))]

	createEffect(() => {
		categoryFilterControl.setValue(
			categoryFilterControl.value.filter((c) => categories().includes(c))
		)
	})

	createEffect(() => {
		vehicleFilterControl.setValue(
			vehicleFilterControl.value.filter((v) => vehicles().includes(v))
		)
	})

	const filteredRouteEntries = () => {
		return routes
			.map((route) => {
				if (route.path === null) return null
				if (
					!vehicleFilterControl.value.includes(route.metadata.vehicle) &&
					vehicleFilterControl.value.length > 0
				)
					return null
				if (
					!categoryFilterControl.value.includes(route.metadata.category) &&
					categoryFilterControl.value.length > 0
				)
					return null
				return route
			})
			.filter((r) => r !== null) as UploadedRoute[]
	}

	// intermediate state, derived from the primary state. contains the actual map data, and so on
	const S = {
		// map will be initialized immediately so we can assume it's not null
		map: null as unknown as L.Map,
		comparisonMarkerGroup: new L.LayerGroup(),
		routeLayerGroups: new Map<string, L.LayerGroup>(),
	}

	function setupMap(_mapName: string, mapId: string) {
		// remove existing map data
		S.map?.remove()

		const bounds = [
			{ x: 0, y: 0 },
			{ x: 4096, y: 4096 },
		]

		const baseBounds = [
			[bounds[0].y, bounds[0].x],
			[bounds[1].y, bounds[1].x],
		] as [[number, number], [number, number]]

		const width = Math.abs(bounds[0].x - bounds[1].x)
		const height = Math.abs(bounds[0].y - bounds[1].y)

		const up_left_x = Math.min(bounds[0].x, bounds[1].x)
		const up_left_y = Math.min(bounds[0].y, bounds[1].y)

		const x_stretch = 256 / width
		const y_stretch = 256 / height

		const crs = L.extend({}, L.CRS.Simple, {
			// Move origin to upper left corner of map
			// need to do this because TileLayer always puts the left-upper corner on the origin
			transformation: new L.Transformation(
				x_stretch,
				-up_left_x * x_stretch,
				y_stretch,
				-up_left_y * y_stretch
			),
		})

		S.map = L.map(mapId, {
			crs: crs,
			minZoom: 0,
			maxZoom: 6,
			zoomSnap: 0.1,
			zoomDelta: 1.0,
			dragging: true,
			boxZoom: true,
			scrollWheelZoom: true,
			touchZoom: true,
			zoomControl: false,
			doubleClickZoom: false,
			attributionControl: false,
		})

		S.map.fitBounds(baseBounds)
		S.map.createPane('routes')
		S.map.getPane('routes')!.style.zIndex = '10'
		S.map.createPane('routeMarkers')
		S.map.getPane('routeMarkers')!.style.zIndex = '11'

		S.map.createPane('background')
		S.map.getPane('background')!.style.zIndex = '0'

		// https://zxyydvtjfwtliqnhfrtt.supabase.co/storage/v1/object/public/map_tiles/map-tiles/Fools_Road_Minimap/0/0/0.png
		new L.TileLayer(
			`${'https://zxyydvtjfwtliqnhfrtt.supabase.co'}/storage/v1/object/public/map_tiles/map-tiles/${_mapName}_Minimap/{z}/{x}/{y}.png`,
			{
				tms: false,
				maxNativeZoom: 4,
				zoomOffset: 0,
				// scale tiles to match minimap width and height
				tileSize: 256,
				pane: 'background',
				// @ts-ignore
				bounds: baseBounds,
			}
		).addTo(S.map)
		S.comparisonMarkerGroup = new L.LayerGroup()
		S.routeLayerGroups = new Map<string, L.LayerGroup>()
	}

	function updateRouteLeafletElements(
		route: UploadedRoute,
		filtered: boolean,
		color: string
	) {
		const INTERVAL = 1000 * 10
		let routeLayerGroup = S.routeLayerGroups.get(route.id)
		routeLayerGroup?.remove()
		if (route.state.enabled && !filtered) {
			routeLayerGroup = new L.LayerGroup()
			for (let i = 0; i < route.path.length - 1; i++) {
				const a = route.path[i]
				const b = route.path[i + 1]
				const line = L.polyline(
					[
						{ lng: a.x, lat: a.y },
						{ lng: b.x, lat: b.y },
					],
					{
						color: color,
						pane: 'routes',
						weight: 6,
					}
				)
				line.on('click', (e) => {
					setComparisonMarker({
						clickedRouteId: route.id,
						point: new L.Point(e.latlng.lng, e.latlng.lat),
					})
				})
				routeLayerGroup.addLayer(line).addTo(S.map)
				const intervalsSinceA = Math.floor(a.time / INTERVAL)
				const intervalsSinceB = Math.floor(b.time / INTERVAL)
				if (intervalsSinceA === intervalsSinceB) continue

				const diffX = b.x - a.x
				const diffY = b.y - a.y
				const diffTime = b.time - a.time

				for (let i = 1; i <= intervalsSinceB - intervalsSinceA; i++) {
					const intervalDiffTime = INTERVAL * (intervalsSinceA + i) - a.time
					const interpolatedX = a.x + diffX * (intervalDiffTime / diffTime)
					const interpolatedY = a.y + diffY * (intervalDiffTime / diffTime)
					let marker = L.circleMarker(
						{ lng: interpolatedX, lat: interpolatedY },
						{
							radius: 2,
							color: 'black',
							fill: true,
							fillColor: 'black',
							pane: 'routeMarkers',
						}
					)
					routeLayerGroup.addLayer(marker)
					const time = Math.round(INTERVAL * (intervalsSinceA + i))
					marker.bindTooltip(`T=${Math.round(time / 1000)}s`, {
						direction: 'right',
					})
				}
				S.routeLayerGroups.set(route.id, routeLayerGroup)
			}
		} else {
			S.routeLayerGroups.delete(route.id)
		}
	}

	function renderComparisonMarkers(
		clickedRouteid: string,
		point: L.Point,
		routes: Route[]
	) {
		S.comparisonMarkerGroup.eachLayer((l) => {
			l.remove()
		})

		const clickedRoutePath = routes.find((r) => r.id === clickedRouteid)?.path
		if (!clickedRoutePath) return
		const time = pointToInterpolatedTime(clickedRoutePath, point)
		if (!time) throw new Error('point not on path')

		// add the point to the map for all paths
		mapArray(
			() => routes,
			(route) => {
				createEffect(() => {
					if (route.state.enabled) {
						const point = timeToInterpolatedPoint(route.path!, time)
						if (!point) return

						let marker = L.marker(
							{ lng: point.x, lat: point.y },
							{
								// pane: "routeMarkers",
							}
						)
						marker.bindTooltip(`T=${Math.round(time / 1000)}s`, {
							direction: 'right',
						})
						let routeGroup = S.routeLayerGroups.get(route.id)
						if (!routeGroup) {
							routeGroup = new L.LayerGroup()
							S.routeLayerGroups.set(route.id, routeGroup)
						}
						routeGroup!.addLayer(marker)
						S.comparisonMarkerGroup.addLayer(marker)
					}
				})
			}
		)()
	}

	createEffect(() => {
		if (mapName() !== null) {
			setupMap(mapName()!, mapEltId)
		}
	})

	createEffect(async () => {
		routes.map((route, idx) => {
			createEffect(() => {
				const filtered = !filteredRouteEntries().find((r) => r.id === route.id)
				const colorFull = ROUTE_COLORS[idx % ROUTE_COLORS.length]
				const color = colorFull.enabled.split('-')[2]
				const intensity = parseInt(colorFull.enabled.split('-')[3])
				//@ts-ignore
				const hexColor = tailwindColors[color][intensity]

				updateRouteLeafletElements(route as UploadedRoute, filtered, hexColor)
			})
		})
	})

	createEffect(() => {
		if (comparisonMarker())
			renderComparisonMarkers(
				comparisonMarker()!.clickedRouteId,
				comparisonMarker()!.point,
				filteredRouteEntries()
			)
	})

	return { categories, vehicles, filteredRouteEntries }
}

function convertDbRoute(dbRoute: DbRoute) {
	const paths = (dbRoute.path as Measurement[] | null)?.map(
		(m) =>
			({
				x: m.x,
				y: m.y,
				time: m.time + dbRoute.offset * 1000,
			}) satisfies Measurement
	)
	return {
		id: dbRoute.id,
		name: dbRoute.name,
		path: paths || null,
		state: {
			enabled: true,
		},
		metadata: {
			map: dbRoute.map_name,
			name: dbRoute.name,
			category: dbRoute.category,
			description: 'placeholder',
			author: dbRoute.author,
			submitDate: dbRoute.created_at!,
			vehicle: dbRoute.vehicle,
			timeOffset: dbRoute.offset,
		},
	} satisfies Route
}

/*
 * assumes time is between the p0 and p1 for every point in the path
 */
function timeToInterpolatedPoint(
	path: Measurement[],
	time: number
): L.Point | null {
	for (let i = 0; i < path.length - 1; i++) {
		const p0 = path[i]
		const p1 = path[i + 1]
		if (time < p0.time || time > p1.time) continue
		const diffX = p1.x - p0.x
		const diffY = p1.y - p0.y
		const diffTime = p1.time - p0.time
		const timeDiff = time - p0.time
		const interpolatedX = p0.x + diffX * (timeDiff / diffTime)
		const interpolatedY = p0.y + diffY * (timeDiff / diffTime)
		return new L.Point(interpolatedX, interpolatedY)
	}
	return null
}

function pointToInterpolatedTime(
	path: Measurement[],
	point: L.Point
): number | null {
	let closestPoint: L.Point | null = null
	let segmentStart: Measurement | null = null
	let segmentEnd: Measurement | null = null
	let closestDistance = Infinity
	for (let i = 0; i < path.length - 1; i++) {
		const a = path[i]
		const b = path[i + 1]

		const distance = L.LineUtil.pointToSegmentDistance(
			point,
			new L.Point(a.x, a.y),
			new L.Point(b.x, b.y)
		)
		if (distance > closestDistance) continue

		closestDistance = distance
		closestPoint = L.LineUtil.closestPointOnSegment(
			point,
			new L.Point(a.x, a.y),
			new L.Point(b.x, b.y)
		)
		segmentStart = a
		segmentEnd = b
	}
	if (!closestPoint || !segmentStart || !segmentEnd) return null

	// estimate the time at the point
	const diffX = segmentEnd.x - segmentStart.x
	const diffY = segmentEnd.y - segmentStart.y
	const diffTime = segmentEnd.time - segmentStart.time
	const diffMagnitude = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2))
	const pointDiffMagnitude = Math.sqrt(
		Math.pow(closestPoint.x - segmentStart.x, 2) +
			Math.pow(closestPoint.y - segmentStart.y, 2)
	)
	return Math.round(
		segmentStart.time + diffTime * (pointDiffMagnitude / diffMagnitude)
	)
}
