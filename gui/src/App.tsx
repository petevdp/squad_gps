import type {Component} from 'solid-js';
import {Route, Routes} from "@solidjs/router";
import {DrawTool} from "./draw_tool";
import {Planner} from "./planner";
import {RouteVisualizer} from "./RouteVisualizer";
import {FileUpload} from "./FileUpload";


const App: Component = () => {
	return (<Routes>
		<Route path="/" component={MainMenu}/>
		<Route path="draw_tool" component={DrawTool}/>
		<Route path="route_visualizer" component={RouteVisualizer}/>
		<Route path="file_upload" component={FileUpload}/>
	</Routes>);
}

const MainMenu: Component = () => {
	return (<div class="grid h-screen place-items-center font-bold text-xl">
		<ul class="m-auto h-3/5">
			<li><a href="/draw_tool">Draw Tool</a></li>
			<li><a href="/route_visualizer">Route Visualizer</a></li>
			<li><a href="/file_upload">Upload Files</a></li>
		</ul>
	</div>);
}
export default App;
