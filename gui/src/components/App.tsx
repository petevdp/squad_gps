import type {Component} from 'solid-js';
import {A, Navigate, Route, Routes} from "@solidjs/router";
import {DrawTool} from "./draw_tool";
import {GuardedRouteViewer as RouteViewer} from "./RouteViewer";
import {LoginPage} from "./Login";
import {ModalContainer} from "./Modal";
import {RoutesTableGuarded as RoutesTable} from "./RoutesTable";
import {H} from 'highlight.run';
import {onMount} from "solid-js";

const App: Component = () => {
	const productkey = import.meta.env.VITE_HIGHLIGHT_PRODUCT_KEY;
	onMount(() => {
		H.init(productkey, { // Get your project ID from https://app.highlight.io/setup
			environment: 'production',
			version: 'commit:' + import.meta.env.VITE_GIT_COMMIT_HASH,
			networkRecording: {
				enabled: true,
				recordHeadersAndBody: true,
				urlBlocklist: [
					// insert full or partial urls that you don't want to record here
					// Out of the box, Highlight will not record these URLs (they can be safely removed):
					"https://www.googleapis.com/identitytoolkit",
					"https://securetoken.googleapis.com",
				],
			},
		});
	});
	return (<>
			<ModalContainer/>
			<Routes>
				<Route path="/" element={<Navigate href={'route_viewer'}/>}/>
				<Route path="draw_tool" component={DrawTool}/>
				<Route path="route_viewer" component={RouteViewer}/>
				<Route path="/routes" component={RoutesTable}/>
				<Route path="/login" component={() => <LoginPage/>}/>
			</Routes>
		</>
	);
}
export default App;
