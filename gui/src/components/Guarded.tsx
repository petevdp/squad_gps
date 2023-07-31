import {ParentProps, Show} from "solid-js";
import * as SB from "../supabase";
import {A} from "@solidjs/router";

export function Guarded(props: ParentProps) {
    return <>
        <Show when={SB.session()}>
            {props.children}
        </Show>
        <Show when={!SB.session()}>
            <div class="grid h-screen place-items-center font-bold text-xl">
                <div class="m-auto">
                    <h1>You must be logged in.</h1>
                    <A href="/login"
                       class="text-primary transition duration-150 ease-in-out hover:text-primary-600 focus:text-primary-600 active:text-primary-700 dark:text-primary-400 dark:hover:text-primary-500 dark:focus:text-primary-500 dark:active:text-primary-600">Login</A>
                </div>
            </div>
        </Show>
    </>
}
