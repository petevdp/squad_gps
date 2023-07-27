import {batch, createEffect, createRoot, createSignal, For, onMount} from "solid-js";
import * as L from "leaflet";
import * as CSV from "csv-parse/browser/esm/sync";
import tailwindColors from "tailwindcss/colors";
import * as TE from "tw-elements";
import VEHICLES from "../assets/vehicles.json"
import {A} from "@solidjs/router";
import {createStore} from "solid-js/store";

type ButtonColor = {
	enabled: string;
	disabled: string;
}

type RouteUIState = {
	enabled: boolean,
	color: ButtonColor;
	penalty: number
}

type RouteMetadata = {
	name: string;
	author: string;
	map: string;
	category: string;
	description: string | null;
	submitDate: Date;
	vehicle: string;
}

type Route = {
	name: string;
	path: Measurement[];
	metadata: RouteMetadata;
	state: RouteUIState;
}

type Measurement = {
	x: number;
	y: number;
	time: number;
}

const MAP_NAMES = [
	"AlBasrah",
	"Anvil",
	"Belaya",
	"Black_Coast",
	"Chora",
	"Fools_Road",
	"GooseBay",
	"Gorodok",
	"Harju",
	"Kamdesh",
	"Kohat",
	"Logar_Valley",
	"Mutaha",
	"Narva",
	"Narva",
	"Skorpo",
	"Sumari",
	"Fallujah",
	"Kokan",
	"Lashkar",
	"Manicouagan_Flooded",
	"Manicouagan",
	"Mestia",
	"Tallil_Outskirts",
	"Yehorivka",
] as const;


const COLORS: ButtonColor[] = [
	{enabled: "bg-blue-500", disabled: "bg-blue-200"},
	{enabled: "bg-green-500", disabled: "bg-green-200"},
	{enabled: "bg-red-500", disabled: "bg-red-200"},
	{enabled: "bg-purple-500", disabled: "bg-purple-200"},
	{enabled: "bg-yellow-500", disabled: "bg-yellow-200"},
	{enabled: "bg-pink-500", disabled: "bg-pink-200"},
	{enabled: "bg-indigo-500", disabled: "bg-indigo-200"},
	{enabled: "bg-fuchsia-500", disabled: "bg-fuchsia-200"},
]


// primary state, controlled by the UI
const [mapName, setMapName] = createSignal("Yehorivka");

// const [routes, setRoutes] = createSignal<Map<string, Route> | null>(null, {equals: false});
const [routes, setRoutes] = createStore<Route[]>([])
const [comparisonMarker, setComparisonMarker] = createSignal<{
	pathKey: string,
	point: L.Point
} | null>(null, {equals: false});
const [filteredVehicles, setFilteredVehicles] = createStore<string[]>(VEHICLES.map(v => v.name));
const [filteredCategories, setFilteredCategories] = createStore<string[]>([]);
const [allRoutesEnabled, setAllRoutesEnabled] = createSignal(false);
const categories = () => [...new Set((routes || []).map(r => r.metadata.category))];
const filteredRouteEntries = () => {
	const filteredRouteEntries: Route[] = []
	for (let route of routes) {
		if (!filteredVehicles.includes(route.metadata.vehicle)) continue;
		if (!filteredCategories.includes(route.metadata.category)) continue;
		filteredRouteEntries.push(route);
	}
	return filteredRouteEntries;
}

// intermediate state, derived from the primary state. contains the actual map data, and so on
const S = {
	// map will be initialized immediately so we can assume it's not null
	map: null as unknown as L.Map,
	comparisonMarkerGroup: new L.LayerGroup(),
	routeLayerGroups: new Map<string, L.LayerGroup>(),
}

export function RouteVisualizer() {

	const mapElt = <div id="map" style="height: 100vh; width: 100vw"/> as HTMLDivElement;

	// run this effect synchronously before anything that references the map, otherwise it might be null
	createEffect(() => {
		setupMap(mapName(), mapElt.id);
		loadRoutes(mapName());
	})

	createEffect(async () => {
		if (!routes) return;
		for (let route of routes) {
			createRoot(dispose => {
				createEffect(() => {
					updateRouteUI(route.name, route, allRoutesEnabled());
				})

				createEffect(() => {
					if (!routes.find(r => r.name === route.name)) {
						dispose()
					}
				})
			});
		}
	});

	createEffect(() => {
		if (comparisonMarker() && routes) renderComparisonMarkers(comparisonMarker()!.pathKey, comparisonMarker()!.point, routes);
	})


	return <>
		{mapElt}
		<Toolbar/>
	</>
}

function Toolbar() {
	let mapSelect: HTMLSelectElement = null as unknown as HTMLSelectElement;
	let categorySelect: HTMLSelectElement = null as unknown as HTMLSelectElement;
	let vehicleSelect: HTMLSelectElement = null as unknown as HTMLSelectElement;
	createEffect(() => {
		setFilteredCategories(categories());
	})

	onMount(() => {
		TE.initTE({Select: TE.Select})
	})

	createEffect(() => {
		console.log({fv: filteredVehicles, fc: filteredCategories, frk: filteredRouteEntries(), r: routes});
	})

	return <>
		<div class="absolute left-0 bottom-0 m-4" style="z-index: 500;">
			<A
				href="/"
				class=" inline-block rounded bg-primary-100 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-primary-700 transition duration-150 ease-in-out hover:bg-primary-accent-100 focus:bg-primary-accent-100 focus:outline-none focus:ring-0 active:bg-primary-accent-200">
				Back
			</A>
		</div>
		<div class="absolute right-0 top-14 flex flex-col bg-white rounded p-2" style="z-index: 500;">
			<select value={mapName()} onchange={(e) => setMapName(e.currentTarget.value)} ref={mapSelect}
							data-te-select-init
							data-te-select-filter="true">
				<For each={MAP_NAMES}>{(mapName) => <option value={mapName}>{mapName}</option>}</For>
			</select>
			<div class="flex flex-row">
				<select onchange={(e) => {
					setFilteredCategories([...e.currentTarget.selectedOptions].map(o => o.value))
				}} ref={categorySelect} data-te-select-init multiple
								data-te-select-placeholder="Category" data-te-select-filter="true">
					<For each={categories()}>{(category) => <option value={category}>{category}</option>}</For>
				</select>
				<select value={mapName()} onchange={e => {
					setFilteredVehicles([...e.currentTarget.selectedOptions].map(o => o.value))
				}} ref={vehicleSelect}
								data-te-select-placeholder="Vehicle"
								data-te-select-init multiple data-te-select-filter="true">
					<For each={VEHICLES}>{(vehicle) =>
						<option value={vehicle.name}> {vehicle.name} </option>}
					</For>
				</select>
			</div>
			<div class={"flex flex-row"}>
				<input
					class="mr-2 mt-[0.3rem] h-3.5 w-8 appearance-none rounded-[0.4375rem] bg-neutral-300 before:pointer-events-none before:absolute before:h-3.5 before:w-3.5 before:rounded-full before:bg-transparent before:content-[''] after:absolute after:z-[2] after:-mt-[0.1875rem] after:h-5 after:w-5 after:rounded-full after:border-none after:bg-neutral-100 after:shadow-[0_0px_3px_0_rgb(0_0_0_/_7%),_0_2px_2px_0_rgb(0_0_0_/_4%)] after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] checked:bg-primary checked:after:absolute checked:after:z-[2] checked:after:-mt-[3px] checked:after:ml-[1.0625rem] checked:after:h-5 checked:after:w-5 checked:after:rounded-full checked:after:border-none checked:after:bg-primary checked:after:shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),_0_2px_2px_0_rgba(0,0,0,0.14),_0_1px_5px_0_rgba(0,0,0,0.12)] checked:after:transition-[background-color_0.2s,transform_0.2s] checked:after:content-[''] hover:cursor-pointer focus:outline-none focus:ring-0 focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[3px_-1px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] focus:after:absolute focus:after:z-[1] focus:after:block focus:after:h-5 focus:after:w-5 focus:after:rounded-full focus:after:content-[''] checked:focus:border-primary checked:focus:bg-primary checked:focus:before:ml-[1.0625rem] checked:focus:before:scale-100 checked:focus:before:shadow-[3px_-1px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] dark:bg-neutral-600 dark:after:bg-neutral-400 dark:checked:bg-primary dark:checked:after:bg-primary dark:focus:before:shadow-[3px_-1px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:before:shadow-[3px_-1px_0px_13px_#3b71ca]"
					type="checkbox"
					role="switch"
					checked={allRoutesEnabled()}
					onchange={e => setAllRoutesEnabled(!allRoutesEnabled())}
				/>
				<label
					class="inline-block pl-[0.15rem] hover:cursor-pointer"
					for="flexSwitchCheckDefault"
				>enable all</label
				>
			</div>
			<For each={filteredRouteEntries()}>{(route) => {
				if (!filteredVehicles.includes(route.metadata.vehicle)) return null;
				if (!filteredCategories.includes(route.metadata.category)) return null;
				// a bit hacky but we indirectly depend on updates from routeUIState in the createEffect above
				const enabled = () => allRoutesEnabled() || route.state.enabled
				return (
					<button
						type="button"
						onclick={() => {
							setRoutes(r => r.name === route.name, "state", "enabled", enabled => !enabled);
						}}
						class={`rounded mt-2 font-bold p-2 ${enabled() ? route.state.color.enabled : route.state.color.disabled}`}>
						{route.name}
					</button>
				);
			}}</For>
		</div>
	</>
}


function setupMap(_mapName: string, mapId: string) {
	// remove existing map data
	S.map?.remove();
	setRoutes([]);


	const bounds = [{x: 0, y: 0}, {x: 4096, y: 4096}];

	const baseBounds = [
		[bounds[0].y, bounds[0].x],
		[bounds[1].y, bounds[1].x],
	] as [[number, number], [number, number]];

	const width = Math.abs(bounds[0].x - bounds[1].x);
	const height = Math.abs(bounds[0].y - bounds[1].y);

	const up_left_x = Math.min(bounds[0].x, bounds[1].x);
	const up_left_y = Math.min(bounds[0].y, bounds[1].y);

	const zoomOffset = 0;
	let tileSize = 256;

	const x_stretch = tileSize / width;
	const y_stretch = tileSize / height;

	const crs = L.extend({}, L.CRS.Simple, {
		// Move origin to upper left corner of map
		// need to do this because TileLayer always puts the left-upper corner on the origin
		transformation: new L.Transformation(
			x_stretch,
			-up_left_x * x_stretch,
			y_stretch,
			-up_left_y * y_stretch
		),
	});

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
		zoomControl: true,
		doubleClickZoom: false,
		attributionControl: false,
	});

	S.map.fitBounds(baseBounds);
	S.map.createPane("routes");
	S.map.getPane("routes")!.style.zIndex = "10";
	S.map.createPane("routeMarkers");
	S.map.getPane("routeMarkers")!.style.zIndex = "11";


	S.map.createPane("background");
	S.map.getPane("background")!.style.zIndex = "0";

	new L.TileLayer(
		`/maps/map-tiles/${_mapName}_Minimap/{z}/{x}/{y}.png`,
		{
			tms: false,
			maxNativeZoom: 4,
			zoomOffset: zoomOffset,
			// scale tiles to match minimap width and height
			tileSize: tileSize,
			pane: "background",
			// @ts-ignore
			bounds: baseBounds,
		}
	).addTo(S.map);
	S.comparisonMarkerGroup = new L.LayerGroup();
	S.routeLayerGroups = new Map<string, L.LayerGroup>();
}


const INTERVAL = 1000 * 10;

function updateRouteUI(routeKey: string, route: Route, allEnabled: boolean) {
	let routeLayerGroup = S.routeLayerGroups.get(routeKey);
	if ((route.state.enabled || allEnabled) && routeLayerGroup === undefined) {
		routeLayerGroup = new L.LayerGroup();
		const start = route.path[0];
		for (let i = 0; i < route.path.length - 1; i++) {
			const a = route.path[i];
			const b = route.path[i + 1];
			const colorFull = route.state.color.enabled
			const color = colorFull.split("-")[1];
			const intensity = parseInt(colorFull.split("-")[2]);

			//@ts-ignore
			const hexColor = tailwindColors[color][intensity];
			const line = L.polyline([{lng: a.x, lat: a.y}, {lng: b.x, lat: b.y}], {
				color: hexColor,
				pane: "routes"
			});
			line.on("click", (e) => {
				setComparisonMarker({pathKey: routeKey, point: new L.Point(e.latlng.lng, e.latlng.lat)});
			})
			routeLayerGroup.addLayer(line).addTo(S.map);
			const intervalsSinceA = Math.floor((a.time - start.time) / INTERVAL);
			const intervalsSinceB = Math.floor((b.time - start.time) / INTERVAL);
			if (intervalsSinceA === intervalsSinceB) continue;

			const diffX = b.x - a.x;
			const diffY = b.y - a.y;
			const diffTime = b.time - a.time;

			for (let i = 1; i <= (intervalsSinceB - intervalsSinceA); i++) {
				const intervalDiffTime = (INTERVAL * (intervalsSinceA + i)) - (a.time - start.time);
				const interpolatedX = a.x + (diffX * (intervalDiffTime / diffTime))
				const interpolatedY = a.y + (diffY * (intervalDiffTime / diffTime))
				let marker = L.circleMarker({lng: interpolatedX, lat: interpolatedY}, {
					radius: 2,
					color: "black",
					fill: true,
					fillColor: "black",
					pane: "routeMarkers"
				});
				routeLayerGroup.addLayer(marker);
				marker.bindTooltip(`T=${INTERVAL * (intervalsSinceA + i) / 1000}`, {direction: "right"});
			}
			S.routeLayerGroups.set(routeKey, routeLayerGroup);
		}

	} else if (!route.state.enabled && !allEnabled) {
		routeLayerGroup?.remove();
		S.routeLayerGroups.delete(routeKey);
	}
}

// add a comparison point to all routes on the map which keeps time constant
function renderComparisonMarkers(pathKey: string, point: L.Point, routes: Route[]) {
	S.comparisonMarkerGroup.eachLayer(l => {
		l.remove();
	})

	const path = routes.find(r => r.name === pathKey)!.path;
	const time = pointToInterpolatedTime(path, point);
	if (!time) throw new Error("point not on path");

	// add the point to the map for all paths
	for (let route of routes) {
		if (!route.state.enabled) continue;
		const point = timeToInterpolatedPoint(route.path, time);
		if (!point) continue;

		let marker = L.marker({lng: point.x, lat: point.y}, {
			// pane: "routeMarkers",
		});
		marker.bindTooltip(`T=${time / 1000}`, {direction: "right"});
		S.routeLayerGroups.get(route.name)!.addLayer(marker);
		S.comparisonMarkerGroup.addLayer(marker);
	}
}


function preprocessPaths(path: Measurement[]): Measurement[] {
	const trimmedPaths = [];
	let start = path[0];
	let end = path[path.length - 1];
	const THRESHOLD = 15;
	trimmedPaths.push(start);
	if (path.length <= 1) return trimmedPaths;
	for (let i = 1; i < path.length - 1; i++) {
		const p = path[i];
		const startMagnitude = Math.sqrt(Math.pow(p.x - start.x, 2) + Math.pow(p.y - start.y, 2));
		if (startMagnitude < THRESHOLD) continue;

		const endMagnitude = Math.sqrt(Math.pow(p.x - end.x, 2) + Math.pow(p.y - end.y, 2));
		if (endMagnitude < THRESHOLD) continue;

		trimmedPaths.push({...p, time: p.time - start.time});
	}
	trimmedPaths.push({...end, time: end.time - start.time});
	trimmedPaths[0] = {...start, time: 0};
	return trimmedPaths;
}


/**
 * assumes time is between the p0 and p1 for every point in the path
 */
function timeToInterpolatedPoint(path: Measurement[], time: number): L.Point | null {

	for (let i = 0; i < path.length - 1; i++) {
		const p0 = path[i];
		const p1 = path[i + 1];
		if (time < p0.time || time > p1.time) continue;
		const diffX = p1.x - p0.x;
		const diffY = p1.y - p0.y;
		const diffTime = p1.time - p0.time;
		const timeDiff = time - p0.time;
		const interpolatedX = p0.x + (diffX * (timeDiff / diffTime))
		const interpolatedY = p0.y + (diffY * (timeDiff / diffTime))
		return new L.Point(interpolatedX, interpolatedY);
	}
	return null;
}

function pointToInterpolatedTime(path: Measurement[], point: L.Point): number | null {
	let closestPoint: L.Point | null = null;
	let segmentStart: Measurement | null = null;
	let segmentEnd: Measurement | null = null;
	let closestDistance = Infinity;
	for (let i = 0; i < path.length - 1; i++) {
		const a = path[i];
		const b = path[i + 1];

		const distance = L.LineUtil.pointToSegmentDistance(point, new L.Point(a.x, a.y), new L.Point(b.x, b.y));
		if (distance > closestDistance) continue;

		closestDistance = distance;
		closestPoint = L.LineUtil.closestPointOnSegment(point, new L.Point(a.x, a.y), new L.Point(b.x, b.y));
		segmentStart = a;
		segmentEnd = b;
	}
	if (!closestPoint || !segmentStart || !segmentEnd) return null;

	// estimate the time at the point
	const diffX = segmentEnd.x - segmentStart.x;
	const diffY = segmentEnd.y - segmentStart.y;
	const diffTime = segmentEnd.time - segmentStart.time;
	const diffMagnitude = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
	const pointDiffMagnitude = Math.sqrt(Math.pow(closestPoint.x - segmentStart.x, 2) + Math.pow(closestPoint.y - segmentStart.y, 2));
	return Math.round(segmentStart.time + (diffTime * (pointDiffMagnitude / diffMagnitude)));
}

async function loadRoutes(mapName: string) {
	const routeFilenames = await fetch(`/data/routes/${mapName}/index.json`).then(d => d.json()) as string[];
	for (let i = 0; i < routeFilenames.length; i++) {
		const filePath = `/data/routes/${mapName}/${routeFilenames[i]}`;
		const fetchingRaw = fetch(`${filePath}.csv`).then(d => d.text());
		const fetchingMetadata = fetch(`${filePath}.metadata.json`).then(d => d.json());

		const metadata = await fetchingMetadata as RouteMetadata;

		// get list of objects from csv
		let path = CSV.parse(await fetchingRaw, {columns: true})
			.map((m: any) => ({x: parseInt(m.x), y: parseInt(m.y), time: parseInt(m.time)})) as Measurement[];
		path = preprocessPaths(path);

		if (metadata.name === "pla_airfield_rush") {
			for (let m of path) {
				m.time += 14 * 1000;
			}
		}

		batch(() => {
			const state = {enabled: true, color: COLORS[i % COLORS.length], penalty: 0} satisfies  RouteUIState;
			setRoutes([...routes, {metadata, path, state, name: metadata.name}])
		});
	}
}

