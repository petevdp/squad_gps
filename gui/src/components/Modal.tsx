import {
    Accessor,
    batch, Component,
    createEffect,
    createMemo,
    createSignal,
    getOwner,
    JSXElement, onCleanup, Owner,
    runWithOwner,
    Show
} from "solid-js";
import * as TE from "tw-elements";
import * as SB from "../supabase";
import {Login, LoginProps} from "./Login";


let modalContainer:  HTMLDivElement | null = null;
// for some reason checking for reference equality on the JSXElement itself isn't working, so we're wrapp it in an object as a workaround
let [activeElement, setActiveElement] = createSignal<null | { elt: JSXElement }>(null);

const [title, setTitle] = createSignal<string>("");

export function ModalContainer() {
    modalContainer?.remove();
    createEffect(() => {
        console.log({elt: activeElement()})
        TE.initTE({Select: TE.Select, Input: TE.Input});
    })
    onCleanup(() => {
        modalContainer?.remove();
        modalContainer = null;
    })
    return <div
        ref={modalContainer!}
        class={"left-0 top-0 z-[1000] h-full w-full overflow-y-auto outline-none " + (activeElement() ? "absolute" : "hidden")}
        id="modal-container"
        tabindex="-1"
        aria-labelledby="modalLabel"
        onclick={e => setActiveElement(null)}
        aria-hidden={!activeElement()}>
        <div
            class="pointer-events-none relative flex min-h-[calc(100%-1rem)] w-auto translate-y-[-50px] items-center duration-300 ease-in-out min-[576px]:mx-auto min-[576px]:mt-7 min-[576px]:min-h-[calc(100%-3.5rem)] min-[576px]:max-w-[500px]"
            onclick={e => e.stopPropagation()}
        >

            <div
                class="min-[576px]:shadow-[0_0.5rem_1rem_rgba(#000, 0.15)] pointer-events-auto relative flex w-full flex-col rounded-md border-none bg-white  text-current shadow-lg outline-none dark:bg-neutral-600">
                <div
                    class={"flex flex-row flex-shrink-0 items-center rounded-t-md border-b-2 border-neutral-100 border-opacity-100 p-4 dark:border-opacity-50 " + (title() ? "justify-between" : "justify-end")}>
                    <Show when={title()}>
                        <h5
                            class="text-xl font-medium leading-normal text-neutral-800 dark:text-neutral-200"
                            id="modalLabel">
                            {title()}
                        </h5>
                    </Show>
                    <button
                        type="button"
                        class="box-content rounded-none border-none hover:no-underline hover:opacity-75 focus:opacity-100 focus:shadow-none focus:outline-none"
                        onclick={e => setActiveElement(null)}
                        aria-label="Close">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="h-6 w-6">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="p-4">
                    <Show when={activeElement() !== null}>
                        {activeElement()?.elt}
                    </Show>
                </div>
            </div>
        </div>
    </div>
}


type ModalProps = {
    title: string | null
    render: (modalState: Accessor<boolean>, setActive: (isActive: boolean) => void) => JSXElement

}


export type ModalState = {
    visible: Accessor<boolean>
    setVisible: (visible: boolean) => void
}

export function addModal<T = boolean>(props: ModalProps, owner: Owner | undefined): ModalState {
    let current: { elt: JSXElement } | null = null;
    const isActive = createMemo(() => activeElement() !== null && current === activeElement());
    const _owner = owner || getOwner();
    const setCurrentElementActive = (_active: boolean) => {
        console.log({modal: current})
        if (!isActive() && _active) {
            const element = runWithOwner(_owner, () => props.render(isActive, setCurrentElementActive));
            current = {elt: element}
            batch(() => {
                props.title && setTitle(props.title);
                setActiveElement(current);
            });
        } else if (isActive() && !_active) {
            setActiveElement(null);
        }
    }

    return {visible: isActive, setVisible: setCurrentElementActive};
}


export type CanPrompt<T> = { onCompleted: (result: T) => void };

export async function prompt<T>(owner: Owner, title: string | null, component: (props: CanPrompt<T>) => JSXElement) {
    return new Promise<T>((resolve, reject) => {
        const {visible, setVisible} = addModal({
            title: title,
            render: (visible, setVisible) => component({
                onCompleted: (result) => {
                    setVisible(false);
                    resolve(result)
                }
            })
        }, owner);
        setVisible(true);
    });
};

export function ensureLoggedIn(owner: Owner, message: string) {
    if (SB.session()) return Promise.resolve(true);
    return prompt(
        owner,
        "Log In",
        (props: CanPrompt<boolean>) => <Login onCompleted={props.onCompleted} message={message}/>
    );
}
