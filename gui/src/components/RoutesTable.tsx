import {Component, createSignal, For, onMount} from "solid-js";
import {DbRoute} from "../types";
import * as SB from "../supabase";
import {A} from "@solidjs/router";
import {Guarded} from "./Guarded";

const RoutesTable: Component = () => {

	const [routes, setRoutes] = createSignal<DbRoute[]>([]);
	onMount(async () => {
		const {data: _routes, error} = await SB.client.from("routes").select("*").eq("author", SB.session()!.user.id);
		if (error) {
			console.error(error);
			return;
		}

		setRoutes(_routes);
	})
	const header = (label: string) => <th scope="col" class="px-6 py-4">{label}</th>

	return (
		<div class="flex flex-col">
			<div class="overflow-x-auto sm:-mx-6 lg:-mx-8">
				<div class="inline-block min-w-full py-2 sm:px-6 lg:px-8">
					<div class="overflow-hidden">
						<table class="min-w-full text-left text-sm font-light">
							<thead class="border-b font-medium dark:border-neutral-500">
							<tr>
								{header("name")}
								{header("map")}
								{header("category")}
								{header("vehicle")}
							</tr>
							</thead>
							<tbody>
							<For each={routes()}>{(route) => {
								return (
									<A href={"/routes/" + route.id}
										 class="border-b transition duration-300 ease-in-out hover:bg-neutral-100 dark:border-neutral-500 dark:hover:bg-neutral-600">
										<td class="whitespace-nowrap px-6 py-4 font-medium">{route.name}</td>
										<td class="whitespace-nowrap px-6 py-4">{route.map_name}</td>
										<td class="whitespace-nowrap px-6 py-4">{route.category}</td>
										<td class="whitespace-nowrap px-6 py-4">{route.vehicle}</td>
									</A>
								);
							}}
							</For>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	)
}
export const RoutesTableGuarded: Component = () => {
	return <Guarded><RoutesTable/></Guarded>
}
