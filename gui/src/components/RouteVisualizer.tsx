import {batch, createEffect, createRoot, createSignal, For, getOwner, onMount, Show} from "solid-js";
import * as L from "leaflet";
import * as CSV from "csv-parse/browser/esm/sync";
import tailwindColors from "tailwindcss/colors";
import * as TE from "tw-elements";
import {A} from "@solidjs/router";
import {createStore, produce} from "solid-js/store";
import * as SB from "../supabase";
import {SwitchInput} from "./Input";
import * as SF from "solid-forms";
import * as Modal from "./Modal"
import {RouteUploadGuarded} from "./RouteUpload";
import {ModalState} from "./Modal";
import {Login} from "./Login";

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
    submitDate: string;
    vehicle: string;
}

export type Route = {
    name: string;
    id: string;
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
    "Narva_Flooded",
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

// we need to list full classes here so the tailwind compiler picks them up
const ROUTE_COLORS: ButtonColor[] = [
    {enabled: "border-b-blue-500", disabled: "border-b-blue-200"},
    {enabled: "border-b-green-500", disabled: "border-b-green-200"},
    {enabled: "border-b-red-500", disabled: "border-b-red-200"},
    {enabled: "border-b-purple-500", disabled: "border-b-purple-200"},
    {enabled: "border-b-yellow-500", disabled: "border-b-yellow-200"},
    {enabled: "border-b-pink-500", disabled: "border-b-pink-200"},
    {enabled: "border-b-indigo-500", disabled: "border-b-indigo-200"},
    {enabled: "border-b-fuchsia-500", disabled: "border-b-fuchsia-200"},
]


// primary state, controlled by the UI
const [mapName, setMapName] = createSignal("Yehorivka");

const [routes, setRoutes] = createStore<Route[]>([])
const [comparisonMarker, setComparisonMarker] = createSignal<{
    pathKey: string,
    point: L.Point
} | null>(null, {equals: false});

const [filteredVehicles, setFilteredVehicles] = createStore<string[]>([]);

const [filteredCategories, setFilteredCategories] = createStore<string[]>([]);
const allRoutesEnabled = SF.createFormControl(false);

const categories = () => [...new Set((routes).map(r => r.metadata.category))];
const vehicles = () => [...new Set((routes).map(r => r.metadata.vehicle))];
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


    // onMount(() => {
    //     TE.initTE({Modal: TE.Modal, Ripple: TE.Ripple});
    // })

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
                    updateRouteUI(route.name, route, allRoutesEnabled.value);
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
    });

    const updateRouteModalId = "updateRouteModal";

    const owner = getOwner()!;
    // unfortunately this signal will not directly track with the state of the modal, we just use this to show the modal
    const uploadModal = Modal.addModal({
        title: "Upload new Route", render: (visible, setVisible) => <RouteUploadGuarded
            map={mapName()}
            closeModal={() => setVisible(false)}/>
    }, owner);
    const loginModal = Modal.addModal({
        title: "Log In", render: (visible, setVisible) => <Login onCompleted={() => setVisible(false)}/>
    }, owner);

    return <>
        <div class="absolute top-2 left-14" style="z-index: 500;">
            <Show when={!SB.session()}>
                <button
                    class="mr-2 inline-block rounded bg-primary px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                    onClick={() => loginModal.setVisible(true)}>Log In
                </button>
            </Show>
            <Show when={SB.session()}>
                <button
                    class="mr-2 secondary inline-block rounded bg-primary px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                    onClick={() => {
                        SB.logOut();
                    }}>Log Out
                </button>
                <button
                    type="button"
                    class="mr-2 inline-block rounded bg-primary px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                    style="z-index:500"
                    onclick={async () => {
                        console.log(mapElt);
                        const isLoggedIn = await Modal.ensureLoggedIn(owner, "You need to be logged in to upload a route.");
                        if (isLoggedIn) uploadModal.setVisible(true);
                    }}
                >
                    New
                </button>
            </Show>
        </div>
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

    createEffect(() => {
        setFilteredVehicles(vehicles());
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
        <div class="absolute right-2 top-2 flex flex-col bg-white rounded p-2" style="z-index: 500;">
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
                    <For each={vehicles()}>{(vehicle) =>
                        <option value={vehicle}> {vehicle} </option>}
                    </For>
                </select>
            </div>
            <div class={"flex flex-row"}>
                <SwitchInput control={allRoutesEnabled} label={"Enable All"}/>
            </div>
            <ul class="w-full">

                <For each={filteredRouteEntries()}>{(route) => {
                    if (!filteredVehicles.includes(route.metadata.vehicle)) return null;
                    if (!filteredCategories.includes(route.metadata.category)) return null;
                    const editModal = Modal.addModal({
                        title: "Edit Route", render: (visible, setVisible) => <RouteUploadGuarded
                            routeToEdit={route}
                            map={mapName()}
                            closeModal={() => setVisible(false)}/>
                    }, getOwner()!);
                    console.log({editModal});

                    const enabled = () => allRoutesEnabled.value || route.state.enabled;
                    const borderStyle = () => route.state.enabled || allRoutesEnabled.value ? route.state.color.enabled : route.state.color.disabled;
                    const setEnabled = () => setRoutes(r => r.id === route.id, "state", "enabled", e => !e);
                    const owner = getOwner()!;
                    return (<>
                        <li
                            class="w-full border-b-2  bg-gray-50 inset-2 p-2 hover:bg-gray-100 border-neutral-100 border-opacity-100 dark:border-opacity-50 flex flex-row justify-between"
                            onclick={() => setEnabled()}>
                            <div class={"w-full flex flex-row border-b-2 " + borderStyle()}>
                                {route.name} - <small class="font-light ml-4 mr-4">{route.metadata.category}</small> - <small class="font-light ml-4 mr-4">{route.metadata.vehicle}</small>
                            </div>
                            <button onclick={async (e) => {
                                e.stopPropagation();
                                const isLoggedIn = await Modal.ensureLoggedIn(owner, "You need to be logged in to upload a route.");
                                if (isLoggedIn) editModal.setVisible(true);
                            }} class="justify-end align-center">edit
                            </button>
                        </li>
                    </>);
                }}</For>
            </ul>
        </div>
    </>
}

function secondaryRouteId(route: Route) {
    return route.name + "_" + route.metadata.category + "_" + route.metadata.map;
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
            const color = colorFull.split("-")[2];
            const intensity = parseInt(colorFull.split("-")[3]);

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
    const {data: routeRecords, error} = await SB.client.from("routes")
        .select("*")
        .eq("map_name", mapName)
        .neq("path", null);

    if (error) {
        console.error(error);
        return;
    }

    const routes: Route[] = routeRecords.map((r, i) => ({
        id: r.id,
        name: r.name,
        path: (r.path as Measurement[]),
        state: {enabled: true, color: ROUTE_COLORS[i % ROUTE_COLORS.length], penalty: 0},
        metadata: {
            map: r.map_name,
            name: r.name,
            category: r.category,
            description: "placeholder",
            author: r.author,
            submitDate: r.created_at!,
            vehicle: r.vehicle
        }
    }) satisfies Route);
    console.log("setting routes: ", routes)

    setRoutes(routes);
}
