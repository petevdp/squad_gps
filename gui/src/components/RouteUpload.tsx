import * as TE from 'tw-elements'
import {
    batch,
    Component,
    createEffect,
    createResource,
    createSignal,
    For,
    from,
    getOwner,
    onMount,
    ParentProps,
    Show
} from "solid-js"

import * as SB from "../supabase"
import * as tus from "tus-js-client"
import {A} from "@solidjs/router"
import * as DB from "../database.types"
import {FileInput, SelectInput, TextInput} from "./Input";
import VEHICLES from "../assets/vehicles.json";
import * as Modal from "./Modal"

import * as SF from "solid-forms";
import {createStore} from "solid-js/store";
import {Route} from "./RouteVisualizer";

type FileDetails = {
    path: string;
    bucketName: string;
    file: File;
}

type UploadStatus = {
    type: "init"
} | {
    type: "inProgress"
    bytesUploaded: number;
    bytesTotal: number
} | {
    type: "success"
} | {
    type: "error"
    error: Error
}


type RouteUploadProps = {
    closeModal: () => void
    routeToEdit?: Route
    map?: string
}

type EditStatus = { status: "new" } | { status: "initializing" } | { status: "initialized", route: DbRoute };

const RouteUpload: Component<RouteUploadProps> = (props) => {

    const [selectingFile, setSelectingFile] = createSignal(false);

    const maps = ["Anvil", "Al Basrah", "Belaya Pass", "Black Coast", "Chora", "Fallujah", "Fool's Road", "Goose Bay", "Gorodok", "Harju", "Kamdesh Highlands", "Kohat Toi", "Kokan", "Lashkar Valley", "Logar Valley", "Manicouagan", "Mestia", "Mutaha", "Narva", "Skorpo", "Sumari Bala", "Tallil Outskirts", "Yehorivka"]

    const group = SF.createFormGroup({
        name: SF.createFormControl(""),
        map: SF.createFormControl(props.map || ""),
        category: SF.createFormControl(""),
        newCategory: SF.createFormControl(""),
        video: SF.createFormControl<File | null>(null, {required: !!props.routeToEdit?.id}),
        vehicle: SF.createFormControl(""),
    }, {readonly: props.routeToEdit?.id !== undefined, required: true});

    const {progress, startFileUpload} = useFileUpload();

    let mapSelectElt = null as unknown as HTMLSelectElement;
    //@ts-ignore
    const [categories] = createResource(() => SB.client.from("categories").select("category")
        .then(res => res.data?.map(c => c?.category)?.sort()));
    const categoriesWithNew = () => (categories() ? [ "New Category", ...categories()!] : []) as string[];

    onMount(async () => {
        TE.initTE({Select: TE.Select, Input: TE.Input});
        if (props.routeToEdit) {
            const {data: route, error} = await SB.client.from("routes").select("*").eq("id", props.routeToEdit.id).single();

            if (error || !route) {
                alert(error.message);
                return;
            }

            batch(() => {
                group.controls.name.setValue(route.name);
                group.controls.map.setValue(route.map_name);
                group.controls.category.setValue(route.category);
                group.controls.vehicle.setValue(route.vehicle);
                group.markDisabled(false);
            })
        }
        // if (!group.controls.map.value) {
        //     group.controls.map.setValue(mapSelectElt.value);
        // }
    });

    async function onSubmit(e: Event) {
        e.preventDefault();
        if (group.isDisabled || progress().type !== "init") return;
        group.markDisabled(true);
        console.log({e})
        const _file = group.controls.video.value;
        // check if the file is an mp4
        let id: string;
        let filename: string;
        let filePath: string;

        if (_file) {
            id = crypto.randomUUID();
            filename = `${id}.mp4`
            filePath = `${SB.session()!.user.id}/${filename}`;
            startFileUpload({path: filePath, bucketName: "route_uploads", file: _file});


            if (_file.type !== "video/mp4") {
                alert("File must be an mp4");
                return;
            }
        } else if (props.routeToEdit) {
            id = props.routeToEdit.id;
            filename = `${id}.mp4`
            filePath = `${SB.session()!.user.id}/${filename}`;
        } else {
            alert("Please select a file");
            return;
        }
        const category = group.controls.category.value === "New Category" ? group.controls.newCategory.value : group.controls.category.value;

        if (props.routeToEdit) {
            const {data: route, error} = await SB.client.from("routes").update({
                name: group.controls.name.value,
                map_name: group.controls.map.value,
                category: category,
                vehicle: group.controls.vehicle.value,
            }).eq("id", props.routeToEdit.id);
            if (error) {
                alert(error.message);
                return;
            }
        } else {
            const {error} = await SB.client
                .from('routes')
                .insert([
                    {
                        id: id,
                        name: group.controls.name.value,
                        map_name: group.controls.map.value,
                        author: SB.session()!.user.id,
                        category: category,
                        video_path: filePath,
                        vehicle: group.controls.vehicle.value,
                    },
                ]);


            if (error) {
                alert(error.message)
                return;
            }
        }
    }

    const owner = getOwner()!;
    const deleteRoute = async () => {
        if (!props.routeToEdit) return;
        await Modal.prompt(owner, null, (_props) => <ConfirmUpload routeName={props.routeToEdit!.name}
                                                                   onCompleted={_props.onCompleted}/>);
        const {data, error} = await SB.client.from("routes").delete().eq("id", props.routeToEdit.id);
        if (error) {
            alert(error.message);
            return;
        }
        props.closeModal();
    };

    const uploadPercentage = (): string | undefined => {
        const _progress = progress();
        if (_progress.type === "inProgress") {
            return `${(_progress.bytesUploaded / _progress.bytesTotal) * 100}%`
        }
    }

    const error = (): Error | undefined => {
        const _progress = progress();
        if (_progress.type === "error") {
            return _progress.error;
        }
    }
    const isNewCategory = () => group.controls.category.value === "New Category";


    return (
        <div>
            <Show when={progress().type !== "success"}>

                <form
                    onsubmit={(e) => onSubmit(e)}
                    class="flex flex-col align-end">
                    <div class="grid grid-cols-2 gap-2">
                        <TextInput class="col-span-2" label="Name" control={group.controls.name}/>
                        <SelectInput control={group.controls.vehicle} label="Vehicle"
                                     options={() => [...VEHICLES.map(v => v.name).sort()]}/>
                        <SelectInput control={group.controls.map} label="Map"
                                     options={() => maps.sort()}/>
                        {/* hack to make sure the options are all set initially */}
                        <Show when={categoriesWithNew().length > 0}>
                            <SelectInput control={group.controls.category} label={"Category"}
                                         options={categoriesWithNew}/>
                        </Show>
                        <Show when={isNewCategory()}>
                            <TextInput control={group.controls.newCategory} label="New Category" focus={isNewCategory()}/>
                        </Show>
                        <Show when={!isNewCategory()}>
                            <div></div>
                        </Show>

                        <FileInput label="Video" control={group.controls.video}
                                   class="w-max"
                                   onClose={() => setSelectingFile(false)}
                                   onOpen={() => setSelectingFile(true)}/>
                    </div>
                    <span class="w-min self-end flex flex-row mt-2">
                        <Show when={props.routeToEdit}>
                            <button
                                type="button"
                                class="inline-block rounded bg-danger mr-2 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#dc4c64] transition duration-150 ease-in-out hover:bg-danger-600 hover:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.3),0_4px_18px_0_rgba(220,76,100,0.2)] focus:bg-danger-600 focus:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.3),0_4px_18px_0_rgba(220,76,100,0.2)] focus:outline-none focus:ring-0 active:bg-danger-700 active:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.3),0_4px_18px_0_rgba(220,76,100,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(220,76,100,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.2),0_4px_18px_0_rgba(220,76,100,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.2),0_4px_18px_0_rgba(220,76,100,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.2),0_4px_18px_0_rgba(220,76,100,0.1)]"
                                onclick={deleteRoute}>
                                Delete
                            </button>
                        </Show>
                        <button
                            type="button"
                            class="inline-block mr-2 rounded bg-primary-100 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-primary-700 transition duration-150 ease-in-out hover:bg-primary-accent-100 focus:bg-primary-accent-100 focus:outline-none focus:ring-0 active:bg-primary-accent-200"
                            onclick={() => {
                                props.closeModal()
                            }}>
                          close
                        </button>
                        <input disabled={group.isDisabled} type="submit" value="Submit" name="submit" required
                               class="inline-block rounded bg-primary px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                        />
                    </span>
                </form>
            </Show>
            <Show when={progress().type === "success"}>
                <div class="p-2">Upload completed</div>
            </Show>
            <Show when={progress().type === "inProgress"}>
                <div class="h-1 w-full bg-neutral-200 dark:bg-neutral-600">
                    <div class="h-1 bg-primary" style={`width: ${uploadPercentage()!}`}></div>
                </div>
            </Show>
            <Show when={progress().type === "error"}>
                <div class="p-2">Upload failed: ${error()?.message}</div>
            </Show>
        </div>);
}

type ConfirmUploadProps = {
    routeName: string;
} & Modal.CanPrompt<boolean>
const ConfirmUpload: Component<ConfirmUploadProps> = (props) => {
    return (
        <>
            <p>Are you sure you want to delete route <i>{props.routeName}</i>?</p>
            <button
                class="inline-block mr-2 rounded bg-warning-100 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-warning-700 transition duration-150 ease-in-out hover:bg-warning-accent-100 focus:bg-warning-accent-100 focus:outline-none focus:ring-0 active:bg-warning-accent-200"
                onclick={() => props.onCompleted(true)}
            >
                yes
            </button>
            <button
                class="inline-block mr-2 rounded bg-primary-100 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-primary-700 transition duration-150 ease-in-out hover:bg-primary-accent-100 focus:bg-primary-accent-100 focus:outline-none focus:ring-0 active:bg-primary-accent-200"
                onclick={() => props.onCompleted(false)}
            >no
            </button>
        </>
    )
};


function useFileUpload() {
    const [progress, setProgress] = createSignal<UploadStatus>({type: "init"});
    const [fileDetails, setFileDetails] = createSignal<FileDetails | null>(null)

    createEffect(() => {
        const _fileDetails = fileDetails();
        if (!_fileDetails) return;
        const upload = new tus.Upload(_fileDetails.file, {
            endpoint: `http://localhost:54321/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                authorization: `Bearer ${SB.session()!.access_token}`,
            },
            uploadDataDuringCreation: true,
            metadata: {
                bucketName: _fileDetails.bucketName,
                objectName: _fileDetails.path,
                contentType: 'video/mp4',
                cacheControl: "3600"
            },
            chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
            onError: function (error) {
                console.log('Failed because: ' + error)
                setProgress({type: "error", error: error})
            },
            onProgress: function (bytesUploaded, bytesTotal) {
                const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2)
                setProgress({
                    type: "inProgress",
                    bytesUploaded: bytesUploaded,
                    bytesTotal: bytesTotal
                });
            },
            onSuccess: function () {
                // console.log(upload)
                console.log('Download %s from %s', _fileDetails.path, upload.url)
                setProgress({type: "success"})
            },
        })

        // Check if there are any previous uploads to continue.
        upload.findPreviousUploads().then(function (previousUploads) {
            // Found previous uploads so we select the first one.
            if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0])
            }

            // Start the upload
            upload.start()
        })
    })


    return {progress, startFileUpload: setFileDetails}
}


type DbRoute = DB.Database["public"]["Tables"]["routes"]["Row"]
const RoutesTable: Component = () => {

    const [routes, setRoutes] = createSignal<DbRoute[]>([]);
    onMount(async () => {
        const {data: _routes, error} = await SB.client.from("routes").select("*").eq("author", SB.session()!.user.id);
        if (error) {
            console.error(error);
            return;
        }

        setRoutes(_routes);
    })
    const header = (label: string) => <th scope="col" class="px-6 py-4">{label}</th>

    return (
        <div class="flex flex-col">
            <div class="overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div class="inline-block min-w-full py-2 sm:px-6 lg:px-8">
                    <div class="overflow-hidden">
                        <table class="min-w-full text-left text-sm font-light">
                            <thead class="border-b font-medium dark:border-neutral-500">
                            <tr>
                                {header("name")}
                                {header("map")}
                                {header("category")}
                                {header("vehicle")}
                            </tr>
                            </thead>
                            <tbody>
                            <For each={routes()}>{(route) => {
                                return (
                                    <A href={"/routes/" + route.id}
                                       class="border-b transition duration-300 ease-in-out hover:bg-neutral-100 dark:border-neutral-500 dark:hover:bg-neutral-600">
                                        <td class="whitespace-nowrap px-6 py-4 font-medium">{route.name}</td>
                                        <td class="whitespace-nowrap px-6 py-4">{route.map_name}</td>
                                        <td class="whitespace-nowrap px-6 py-4">{route.category}</td>
                                        <td class="whitespace-nowrap px-6 py-4">{route.vehicle}</td>
                                    </A>
                                );
                            }}
                            </For>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const RoutesTableGuarded: Component = () => {
    return <Guarded><RoutesTable/></Guarded>
}
export const RouteUploadGuarded: Component<RouteUploadProps> = (props) => {
    return <Guarded><RouteUpload {...props} /></Guarded>
}

export function Guarded(props: ParentProps) {
    return <>
        <Show when={SB.session()}>
            {props.children}
        </Show>
        <Show when={!SB.session()}>
            <div class="grid h-screen place-items-center font-bold text-xl">
                <div class="m-auto">
                    <h1>You must be logged in to access this functionality</h1>
                    <A href="/login"
                       class="text-primary transition duration-150 ease-in-out hover:text-primary-600 focus:text-primary-600 active:text-primary-700 dark:text-primary-400 dark:hover:text-primary-500 dark:focus:text-primary-500 dark:active:text-primary-600">Login</A>
                </div>
            </div>
        </Show>
    </>
}
