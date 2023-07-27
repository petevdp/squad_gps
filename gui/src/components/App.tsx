import type {Component} from 'solid-js';
import {A, Route, Routes} from "@solidjs/router";
import {DrawTool} from "./draw_tool";
import {RouteVisualizer} from "./RouteVisualizer";
import {FileUpload} from "./FileUpload";
import {Login} from "./Login";
import {NavBar} from "./NavBar";


const App: Component = () => {
	return (<>
			<NavBar />
			<Routes>
				<Route path="/" component={MainMenu}/>
				<Route path="login" component={Login}/>
				<Route path="draw_tool" component={DrawTool}/>
				<Route path="route_visualizer" component={RouteVisualizer}/>
				<Route path="file_upload" component={FileUpload}/>
			</Routes>
		</>
	);
}

const MainMenu: Component = () => {
	return (<>
		<div class="grid place-items-center font-bold text-xl">
			<ul class="m-auto h-3/5">
				<li><A href="/login">Login</A></li>
				<li><A href="/draw_tool">Draw Tool</A></li>
				<li><A href="/route_visualizer">Route Visualizer</A></li>
				<li><A href="/file_upload">Upload Files</A></li>
			</ul>
		</div>
	</>);
}
export default App;
