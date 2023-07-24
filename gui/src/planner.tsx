import * as csv from 'csv';
import type {Component, Accessor} from "solid-js";
import {createEffect, createSignal, For, JSX, onMount} from "solid-js";
import {parse} from "csv-parse/browser/esm/sync";
import {MapNode, measurementsToNodes} from "./MapNode";


type ButtonColor = {
	enabled: string;
	disabled: string;
}

type RouteState = {
	enabled: boolean,
	color: ButtonColor;
}

const COLORS: ButtonColor[] = [
	// "emerald"
	// "green",
	// "slate",
	// "fuchsia",
	// "amber"

	{enabled: "bg-blue-500", disabled: "bg-blue-200"},
	{enabled: "bg-green-500", disabled: "bg-green-200"},
	{enabled: "bg-red-500", disabled: "bg-red-200"},
	{enabled: "bg-purple-500", disabled: "bg-purple-200"},
	{enabled: "bg-yellow-500", disabled: "bg-yellow-200"},
]

const [routeEnabledState, setRouteEnabledState] = createSignal(new Map<string, RouteState>(), {equals: false});

const currentMap = "Yehorivka";

export const Planner: Component = () => {
	const canvas: HTMLCanvasElement = <canvas width="1500"
																						height="1500"
																						style="border:1px solid #000000;"></canvas> as HTMLCanvasElement;
	const context = canvas.getContext('2d')!;
	const image = new Image();
	const [paths, setPaths] = createSignal(new Map<string, MapNode[]>(), {equals: false});

	onMount(async () => {
		console.log("wtf")
		image.src = `/maps/${currentMap}.png`;
		image.onload = function () {
			context!.drawImage(image, 0, 0);
		};
		// set canvas width and height to match image
		canvas.width = image.width;
		canvas.height = image.height;
		const index = await fetch(`/data/routes/${currentMap}/index.json`).then(d => d.json());
		for (let routePath of index) {
			const raw = await fetch(`/data/routes/${currentMap}/${routePath}`).then(d => d.text());
			// get list of objects from csv
			const records = parse(raw, {columns: true})
			const nodes = measurementsToNodes(records);
			paths().set(routePath.split(".")[0], nodes)
		}
		console.log("setting paths")
		const keys = [...paths().keys()];
		console.log({keys})

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			routeEnabledState().set(key, {enabled: true, color: COLORS[i % COLORS.length]});
			console.log("set ", key)
		}
		setRouteEnabledState(routeEnabledState())
		setPaths(paths());

	});

	createEffect(() => {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(image, 0, 0);
		for (let [key, nodes] of paths().entries()) {
			console.log({key,nodes})
			if (!routeEnabledState().get(key)!.enabled) continue;
			for (let [a, b] of nodes[0].traverseGraphEdges()) {
				console.log({a, b})
				context.beginPath();
				context.strokeStyle = routeEnabledState().get(key)!.color.enabled.split("-")[1];
				context.lineWidth = 2;
				context.moveTo(a.x, a.y);
				context.lineTo(b.x, b.y);
				context.stroke();
			}

			for (let node of nodes) {
				// draw black dot at each node
				context.beginPath();
				context.fillStyle = 'black';
				context.arc(node.x, node.y, 3, 0, 2 * Math.PI);
				context.fill();
			}
			const lastNode = nodes[nodes.length - 1];
			// draw arrow at end of route a
			context.beginPath();
			context.fillStyle = routeEnabledState().get(key)!.color.enabled.split("-")[1];

		}
	});


	return <div class="flex flex-cols">
		{canvas}
		<Toolbar/>
	</div>
}

function Toolbar() {
	createEffect(() => {
		routeEnabledState();
	})
	createEffect(() => {
		const s = routeEnabledState()
		console.log("entries: ", [...s.entries()]);
	})
	return <>
		<div class="fixed">
			<For each={[...routeEnabledState().entries()]}>{([name, state], i) => {
				console.log({name, ...state});
				// put all buttons in a row
				return (
					<button
						type="button"
						onclick={() => {
							console.log("click")
							routeEnabledState().get(name)!.enabled = !state.enabled;
							setRouteEnabledState(routeEnabledState());
						}}
						class={`rounded m-1 font-bold p-2 ${state.enabled ? state.color.enabled : state.color.disabled}`}>
						{name}
					</button>
				);
			}}</For>
		</div>
	</>
}
