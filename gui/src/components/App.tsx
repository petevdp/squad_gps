import type {Component} from 'solid-js';
import {A, Navigate, Route, Routes} from "@solidjs/router";
import {DrawTool} from "./draw_tool";
import {GuardedRouteViewer as RouteViewer} from "./RouteViewer";
import {LoginPage} from "./Login";
import {ModalContainer} from "./Modal";
import {RoutesTableGuarded as RoutesTable} from "./RoutesTable";


const App: Component = () => {
    return (<>
            <ModalContainer/>
            <Routes>
                <Route path="/" element={<Navigate href={'route_viewer'}/>}/>
                <Route path="draw_tool" component={DrawTool}/>
                <Route path="route_viewer" component={RouteViewer}/>
                <Route path="/routes" component={RoutesTable}/>
                <Route path="/login" component={() => <LoginPage />}/>
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
                <li><A href="/route_viewer">Route Visualizer</A></li>
                <li><A href="/routes"/>Your Routes</li>
                <li><A href="/routes/new">New Route</A></li>
            </ul>
        </div>
    </>);
}
export default App;
