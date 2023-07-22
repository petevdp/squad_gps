import type {Component} from 'solid-js';
import {Route, Routes} from "@solidjs/router";
import {DrawTool} from "./draw_tool";
import {Planner} from "./planner";


const App: Component = () => {
	return (<Routes>
		<Route path="draw_tool" component={DrawTool}/>
		<Route path="planner" component={Planner}/>
	</Routes>);
}
export default App;
