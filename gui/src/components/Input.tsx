import {createOptions, createSelect, fuzzySearch, fuzzySort, Select} from "@thisbeyond/solid-select";
import "@thisbeyond/solid-select/style.css";
import {
    Accessor, Component, createEffect,
    createSignal, For, mergeProps, onCleanup, onMount, Signal
} from "solid-js";
import * as SF from "solid-forms";
import * as TE from "tw-elements";
import {createFilter} from "vite";

type TextInputProps = {
    control: SF.IFormControl
    label: string
    type?: "text" | "password" | "email"
    class?: string
    onRef?: (ref: HTMLInputElement) => void
    focus?: boolean
}


export const TextInput: Component<TextInputProps> = (props) => {
    const _props = mergeProps({control: SF.createFormControl(""), type: "text" satisfies TextInputProps["type"]}, props);
    let ref = null as unknown as HTMLInputElement;
    const id = crypto.randomUUID();
    onMount(() => {
        TE.initTE({Input: TE.Input});
    });
    createEffect(() => {
        if (props.focus) {
            ref.focus();
        }
    })

    return (
        <div class={"relative mb-3 " + props.class} data-te-input-wrapper-init>
            <input
                type={_props.type || "text"}
                ref={(r) => {
                    ref = r;
                    props.onRef && props.onRef(r);
                }}
                id={id}
                value={_props.control.value}
                onChange={(e) => _props.control.setValue(e.currentTarget.value)}
                class="peer block min-h-[auto] w-full rounded border-0 bg-transparent px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear focus:placeholder:opacity-100 peer-focus:text-primary data-[te-input-state-active]:placeholder:opacity-100 motion-reduce:transition-none dark:text-neutral-200 dark:placeholder:text-neutral-200 dark:peer-focus:text-primary [&:not([data-te-input-placeholder-active])]:placeholder:opacity-0"
                placeholder={_props.label}
                required={_props.control.isRequired}
                disabled={_props.control.isDisabled}
                onblur={() => _props.control.markTouched(true)}
            />
        </div>
    );
}


type FileInputProps = {
    control: SF.IFormControl<File | null>
    onClose: () => void
    onOpen: () => void
    label: string
    class?: string
}
export const FileInput: Component<FileInputProps> = (props) => {
    const id = crypto.randomUUID();
    const [focused, setFocused] = createSignal(false);
    return (
        <div class={"flex flex-row items-center " + (props.class || "")}>
            <label
                for={id}
                class="inline-block text-neutral-700 dark:text-neutral-200 mr-2"
            >{props.label}</label>
            <input
                placeholder="test"
                class={" relative block flex-auto rounded border border-solid border-neutral-300 bg-clip-padding px-3 py-[0.32rem] text-base font-normal text-neutral-700 transition duration-300 ease-in-out file:-mx-3 file:-my-[0.32rem] file:overflow-hidden file:rounded-none file:border-0 file:border-solid file:border-inherit file:bg-neutral-100 file:px-3 file:py-[0.32rem] file:text-neutral-700 file:transition file:duration-150 file:ease-in-out file:[border-inline-end-width:1px] file:[margin-inline-end:0.75rem] hover:file:bg-neutral-200 focus:border-primary focus:text-neutral-700 focus:shadow-te-primary focus:outline-none dark:border-neutral-600 dark:text-neutral-200 dark:file:bg-neutral-700 dark:file:text-neutral-100 dark:focus:border-primary"}
                type="file"
                required={props.control.isRequired}
                onblur={() => setFocused(false)}
                disabled={props.control.isDisabled}
                onclick={e => {
                    if (props.control.isDisabled || focused()) {
                        e.preventDefault();
                        return;
                    }
                    setFocused(true);

                    props.onOpen()
                }}
                id={id}
                onchange={e => {
                    const file = e.currentTarget.files![0] as File;
                    props.control.setValue(file);
                    props.onClose();
                }}
                onblur={() => {
                    props.control.markTouched(true)
                    props.onClose();
                }}
            />
        </div>
    )
}
type SelectInputProps = { control: SF.IFormControl<string>, label: string, options: Accessor<string[]>, class?: string }
export const SelectInput: Component<SelectInputProps> = (props) => {
    const id = crypto.randomUUID();
    const [filteredOptions, setFilteredOptions] = createSignal(props.options());
    onMount(() => {
        TE.initTE({Select: TE.Select});
    });
    const optionProps = createOptions(props.options(), {filterable: true})

    return (
        <Select {...optionProps} initialValue={props.control.value}
                onChange={value => props.control.setValue(value)} disabled={props.control.isDisabled}
                placeholder={props.label} class={"bg-white text-black" + props.class}/>
    )

    // return (
    //     <select
    //         id={id}
    //         onchange={e => props.control.setValue(e.currentTarget.value)}
    //         class="mb-3"
    //         data-te-select-init
    //         onkeydown={e => {
    //             if (e.key === "Enter" && ) {
    //                 e.preventDefault();
    //                 e.currentTarget.blur();
    //             }
    //         }}
    //         data-te-select-filter="true"
    //         required={props.control.isRequired}
    //         disabled={props.control.isDisabled}
    //     >
    //         <For each={props.options()}>{option => (
    //             <option value={option}>{option}</option>
    //         )}</For>
    //     </select>
    // )
}

export const SwitchInput: Component<{ onChange?: (value: boolean) => void, control: SF.IFormControl<boolean>, label: string, }> = (props) => {
    return (
        <>
            <input
                class="mr-2 mt-[0.3rem] h-3.5 w-8 appearance-none rounded-[0.4375rem] bg-neutral-300 before:pointer-events-none before:absolute before:h-3.5 before:w-3.5 before:rounded-full before:bg-transparent before:content-[''] after:absolute after:z-[2] after:-mt-[0.1875rem] after:h-5 after:w-5 after:rounded-full after:border-none after:bg-neutral-100 after:shadow-[0_0px_3px_0_rgb(0_0_0_/_7%),_0_2px_2px_0_rgb(0_0_0_/_4%)] after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] checked:bg-primary checked:after:absolute checked:after:z-[2] checked:after:-mt-[3px] checked:after:ml-[1.0625rem] checked:after:h-5 checked:after:w-5 checked:after:rounded-full checked:after:border-none checked:after:bg-primary checked:after:shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),_0_2px_2px_0_rgba(0,0,0,0.14),_0_1px_5px_0_rgba(0,0,0,0.12)] checked:after:transition-[background-color_0.2s,transform_0.2s] checked:after:content-[''] hover:cursor-pointer focus:outline-none focus:ring-0 focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[3px_-1px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] focus:after:absolute focus:after:z-[1] focus:after:block focus:after:h-5 focus:after:w-5 focus:after:rounded-full focus:after:content-[''] checked:focus:border-primary checked:focus:bg-primary checked:focus:before:ml-[1.0625rem] checked:focus:before:scale-100 checked:focus:before:shadow-[3px_-1px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] dark:bg-neutral-600 dark:after:bg-neutral-400 dark:checked:bg-primary dark:checked:after:bg-primary dark:focus:before:shadow-[3px_-1px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:before:shadow-[3px_-1px_0px_13px_#3b71ca]"
                type="checkbox"
                role="switch"
                disabled={props.control.isDisabled}
                required={props.control.isRequired}
                checked={props.control.value}
                onchange={e => {
                    props.control.setValue(e.currentTarget.checked)
                    props.onChange?.(e.currentTarget.checked)
                }}
            />
            <label
                class="inline-block pl-[0.15rem] hover:cursor-pointer"
                for="flexSwitchCheckDefault"
            >{props.label}</label>
        </>)
};