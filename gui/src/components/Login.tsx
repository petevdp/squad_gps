import {Component, createSignal, JSXElement, mergeProps, onMount, ParentProps, Show} from "solid-js";
import * as SB from "../supabase";
import {logIn, setSession} from "../supabase";
import {A, useNavigate} from "@solidjs/router";
import {TextInput} from "./Input";
import * as TE from "tw-elements";
import * as SF from "solid-forms";
import {CanPrompt} from "./Modal";


export type LoginProps = {
    message?: string
} & CanPrompt<boolean>;


export const LoginPage: Component  = () => {
    const navigate = useNavigate();
    return (<section class="h-screen grid place-items-center">
        <div class="g-6 flex h-full flex-wrap items-center justify-center  min-w-[800px]">
            <div class="mb-12 md:mb-0 md:w-8/12 lg:w-5/12 xl:w-5/12">
                <Login onCompleted={() => navigate("/")} />
            </div>
        </div>
    </section>);
};

export const Login: Component<LoginProps> = (props) => {
    onMount(() => {
        TE.initTE({Select: TE.Select, Input: TE.Input})
    })
    const group = SF.createFormGroup({
        email: SF.createFormControl("", {required: true}),
        password: SF.createFormControl("", {required: true})
    });

    const [error, setError] = createSignal<null | string>(null);

    async function onSubmit(e: SubmitEvent) {
        e.preventDefault();
        const _email = group.controls.email.value.trim();
        const _password = group.controls.password.value.trim();
        const error = await logIn(_email, _password);

        if (!error) {
            props.onCompleted(true);
        } else {
            setError(error?.message || "An unknown error occurred")
        }
    }

    return (
        <form class="flex flex-col align-center" onsubmit={onSubmit}>
            <Show when={props.message}>
                <p class="mb-2 text-red-300">{props.message}</p>
            </Show>
            <TextInput control={group.controls.email} label="Email" type="email"/>
            <TextInput control={group.controls.password} label="Password" type="password"/>
						<A href="/forgot_password" class="mb-2 self-end text-sm text-primary hover:underline">Forgot password?</A>

            <button
                type="submit"
                class="m-auto inline-block rounded bg-primary px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                data-te-ripple-init
                data-te-ripple-color="light">
                Login
            </button>

            <Show when={error()}>
                <p class="mb-2 text-red-300">{error()}</p>
            </Show>

            <p class="mb-0 mt-2 pt-1 text-sm font-semibold">
                Don't have an account?
            </p>
            <p class="mb-0 mt-2 pt-1 text-sm"> Email me at <a>greytwosevenfive@gmail.com</a> or reach me on discord to
                gain access</p>
        </form>
    );
}
