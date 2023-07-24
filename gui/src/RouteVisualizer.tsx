import {createEffect, createSignal, For} from "solid-js";
import * as L from "leaflet";
import * as CSV from "csv-parse/browser/esm/sync";
import tailwindColors from "tailwindcss/colors";
//@ts-ignore

type ButtonColor = {
	enabled: string;
	disabled: string;
}

type RouteUIState = {
	enabled: boolean,
	color: ButtonColor;
	penalty: number
}

type Measurement = {
	x: number;
	y: number;
	time: number;
}

const MapNames = [
	"AlBasrah",
	"Anvil",
	"Belaya",
	"Black_Coast",
	"Chora",
	"Fools_Road",
	"GooseBay",
	"Gorodok_minimap",
	"Gorodok",
	"Harju",
	"Kamdesh",
	"Kohat_minimap",
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
const [routes, setRoutes] = createSignal<Map<string, Measurement[]> | null>(null, {equals: false});
const [routeUIState, setRouteUIState] = createSignal<Map<string, RouteUIState> | null>(null, {equals: false});
const [comparisonMarker, setComparisonMarker] = createSignal<{
	pathKey: string,
	point: L.Point
} | null>(null, {equals: false});

// intermediate state, derived from the primary state. contains the actual map data, and so on
const S = {
	// map will be initialized immediately so we can assume it's not null
	map: null as unknown as L.Map,
	comparisonMarkerGroup: new L.LayerGroup(),
	routeLayerGroups: new Map<string, L.LayerGroup>(),
}

export function RouteVisualizer() {

	const mapElt = <div id="map" style="height: 4096px; width: 4096px"/> as HTMLDivElement;

	// run this effect synchronously before anything that references the map, otherwise it might be null
	createEffect(async () => {
		setupMap(mapName(), mapElt.id);
		await loadRoutes(mapName());
	})

	createEffect(async () => {
		if (routeUIState() && routes()) updateRoutesUI(routeUIState()!, routes()!)
	});

	createEffect(() => {
		if (comparisonMarker() && routes()) renderComparisonMarkers(comparisonMarker()!.pathKey, comparisonMarker()!.point, routes()!);
	})


	return <>
		{mapElt}
		<Toolbar/>
	</>
}

function Toolbar() {
	const _routeUIState = () => routeUIState() ?? new Map<string, RouteUIState>();

	return <>
		<div class="fixed left-0 bottom-0" style="z-index: 500;">
			<a href="/">
				<button class="rounded m-1 font-bold p-2 bg-gray-500">Home</button>
			</a>
		</div>
		<div class="fixed right-0 top-0 flex-col" style="z-index: 500;">
			<For each={[..._routeUIState().entries()]}>{([name, state], i) => {
				// put all buttons in a row
				return (
					<button
						type="button"
						onclick={() => {
							_routeUIState().get(name)!.enabled = !state.enabled;
							setRouteUIState(routeUIState());
						}}
						class={`rounded m-1 font-bold p-2 ${state.enabled ? state.color.enabled : state.color.disabled}`}>
						{name}
					</button>
				);
			}}</For>
		</div>
	</>
}


function setupMap(_mapName: string, mapId: string) {
	// remove existing map data
	S.map?.remove();
	setRouteUIState(null)
	setRoutes(null);

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
}


function updateRoutesUI(routeUIState: Map<string, RouteUIState>, routes: Map<string, Measurement[]>) {
	const routeKeys = [...routes.keys()];
	const INTERVAL = 1000 * 10;
	for (let routeKey of routeKeys) {
		if (routeUIState.get(routeKey)!.enabled) {
			let routeLayerGroup = S.routeLayerGroups.get(routeKey);
			if (routeLayerGroup === undefined) {
				routeLayerGroup = new L.LayerGroup();
				const start = routes.get(routeKey)![0];
				for (let i = 0; i < routes.get(routeKey)!.length - 1; i++) {
					const a = routes.get(routeKey)![i];
					const b = routes.get(routeKey)![i + 1];
					const colorFull = routeUIState.get(routeKey)!.color.enabled;
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


				}

				S.routeLayerGroups.set(routeKey, routeLayerGroup);
			}

		} else {
			S.routeLayerGroups.get(routeKey)?.remove();
			S.routeLayerGroups.delete(routeKey);
		}
	}
}

// add a comparison point to all routes on the map, keeping time constant
function renderComparisonMarkers(pathKey: string, point: L.Point, routes: Map<string, Measurement[]>) {
	S.comparisonMarkerGroup.eachLayer(l => {
		l.remove();
	})

	const path = routes.get(pathKey)!;
	const time = pointToInterpolatedTime(path, point);
	if (!time) throw new Error("point not on path");

	// add the point to the map for all paths
	for (let [key, path] of routes) {
		if (!routeUIState()!.get(key)!.enabled) continue;
		const point = timeToInterpolatedPoint(path, time);
		if (!point) continue;

		let marker = L.marker({lng: point.x, lat: point.y}, {
			// pane: "routeMarkers",
		});
		marker.bindTooltip(`T=${time / 1000}`, {direction: "right"});
		S.routeLayerGroups.get(key)!.addLayer(marker);
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
 * assumtes time is between the times from p0 and p1
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
	const index = await fetch(`/data/routes/${mapName}/index.json`).then(d => d.json());
	const _routes = new Map<string, Measurement[]>();
	for (let routePath of index) {
		const raw = await fetch(`/data/routes/${mapName}/${routePath}`).then(d => d.text());
		// get list of objects from csv
		let path = CSV.parse(raw, {columns: true})
			.map((m: any) => ({x: parseInt(m.x), y: parseInt(m.y), time: parseInt(m.time)})) as Measurement[];

		path = preprocessPaths(path);

		const pathKey = routePath.split(".")[0]
		if (pathKey === "pla_airfield_rush") {
			for (let m of path) {
				m.time += 14 * 1000;
			}
		}
		_routes.set(pathKey, path)
	}
	setRoutes(_routes);
	const pathKeys = [..._routes.keys()];
	const _routeUIState = new Map<string, RouteUIState>();
	for (let i = 0; i < pathKeys.length; i++) {
		const key = pathKeys[i];
		_routeUIState.set(key, {enabled: true, color: COLORS[i % COLORS.length], penalty: 0});
	}
	setRouteUIState(_routeUIState)
}

