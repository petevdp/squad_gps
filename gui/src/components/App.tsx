import type {Component} from 'solid-js';
import {A, Route, Routes} from "@solidjs/router";
import {DrawTool} from "./draw_tool";
import {RouteVisualizer} from "./RouteVisualizer";
import {RoutesTableGuarded as RoutesTable, RouteUploadGuarded as RouteUpload} from "./RouteUpload";
import {Login} from "./Login";
import {NavBar} from "./NavBar";
import {ModalContainer} from "./Modal";


const App: Component = () => {
    return (<>
            <ModalContainer/>
            <Routes>
                <Route path="/" component={MainMenu}/>
                <Route path="draw_tool" component={DrawTool}/>
                <Route path="route_visualizer" component={RouteVisualizer}/>
                <Route path="/routes" component={RoutesTable}/>
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
                <li><A href="/routes"/>Your Routes</li>
                <li><A href="/routes/new">New Route</A></li>
            </ul>
        </div>
    </>);
}
export default App;
