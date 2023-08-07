import { Component, createEffect, createResource, createSignal, getOwner, on, onCleanup, Show } from 'solid-js'

import * as SB from '../supabase'
import { FileInput, SelectInput, TextInput } from './Input'
import VEHICLES from '../assets/vehicles.json'
import * as Modal from './Modal'

import * as SF from 'solid-forms'
import { Route } from './RouteViewer'
import { Guarded } from './Guarded'
import { DbRoute, MAP_NAMES } from '../types'
import { RealtimeChannel } from '@supabase/supabase-js'

export type RouteParams = Omit<DbRoute, 'created_at' | 'updated_at' | 'path'>

type FileUploadDetails = {
	file: File
	route: DbRoute
}

type ProcessingStatus =
	| {
			type: 'init'
	  }
	| {
			type: 'inProgress'
			routeUpload: RouteParams
			file: File | null
	  }
	| {
			type: 'uploaded'
			routeUpload: DbRoute
	  }
	| {
			type: 'success'
			message: string
			routeUpload: RouteParams
	  }
	| {
			type: 'error'
			error: string
	  }

type RouteUploadProps = {
	closeModal: () => void
	routeToEdit?: Route
	map: string
}

const RouteUpload: Component<RouteUploadProps> = (props) => {
	const { progress, group, deleteRoute, onSubmit } = useRouteUpload(props.map, props.closeModal, props.routeToEdit)

	const [categories] = createResource(
		() =>
			SB.sb
				.from('categories')
				.select('category')
				.then((res) => res.data?.map((c) => c?.category)?.sort()) as Promise<string[] | null>
	)
	const categoriesWithNew = () => (categories() ? ['New Category', ...categories()!] : []) as string[]

	const error = (): string | undefined => {
		const _progress = progress()
		if (_progress.type === 'error') {
			return _progress.error
		}
	}
	const isNewCategory = () => group.value.name === 'New Category'
	const [focusNameinput, setFocusNameInput] = createSignal(false)

	createEffect(() => {
		if (!group.value.name && group.value.video) {
			group.controls.name.setValue(group.value.video.name!.replace(/.mp4$/, ''))
			setFocusNameInput(true)
		}
	})

	return (
		<div>
			<Show when={['init', 'error'].includes(progress().type)}>
				<form
					onsubmit={(e) => {
						e.preventDefault()
						onSubmit()
					}}
					class="align-end flex flex-col"
				>
					<div class="grid grid-cols-2 gap-2">
						<FileInput label="Video" control={group.controls.video} class="w-max" accept={'video/mp4'} />
						<span class="col-span-2 flex">
							<TextInput class="flex-1" label="Name" control={group.controls.name} focus={focusNameinput()} />
							<TextInput control={group.controls.timeOffset} label="Offset(s)" type="number" class="w-28" />
						</span>
						<SelectInput
							control={group.controls.vehicle}
							label="Vehicle"
							options={() => [...VEHICLES.map((v) => v.name).sort()]}
						/>
						<SelectInput control={group.controls.map} label="Map" options={() => [...MAP_NAMES]} />
						{/* hack to make sure the options are all set initially */}
						<Show when={categoriesWithNew().length > 0}>
							<SelectInput control={group.controls.category} label={'Category'} options={categoriesWithNew} />
						</Show>
						<Show when={isNewCategory()}>
							<TextInput
								class={isNewCategory() ? '' : 'col-span-2'}
								control={group.controls.newCategory}
								label="New Category"
								focus={isNewCategory()}
							/>
						</Show>
					</div>
					<span class="mt-2 flex w-min flex-row self-end">
						<Show when={props.routeToEdit}>
							<button
								type="button"
								class="bg-danger hover:bg-danger-600  focus:bg-danger-600 active:bg-danger-700 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#dc4c64] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.3),0_4px_18px_0_rgba(220,76,100,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.3),0_4px_18px_0_rgba(220,76,100,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.3),0_4px_18px_0_rgba(220,76,100,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(220,76,100,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.2),0_4px_18px_0_rgba(220,76,100,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.2),0_4px_18px_0_rgba(220,76,100,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(220,76,100,0.2),0_4px_18px_0_rgba(220,76,100,0.1)]"
								onclick={deleteRoute}
							>
								Delete
							</button>
						</Show>
						<button
							type="button"
							class="bg-primary-100 text-primary-700 hover:bg-primary-accent-100 focus:bg-primary-accent-100 active:bg-primary-accent-200 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal transition duration-150 ease-in-out focus:outline-none focus:ring-0"
							onclick={() => {
								props.closeModal()
							}}
						>
							close
						</button>
						<input
							disabled={group.isDisabled}
							type="submit"
							value="Submit"
							name="submit"
							required
							class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						/>
					</span>
				</form>
			</Show>
			<Show when={progress().type === 'inProgress'}>
				<div class="flex flex-row items-center">
					<span
						class="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
						role="status"
					>
						<span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
							Uploading {group.controls.name.value}
							...
						</span>
					</span>
					<div class="p-2 font-light">Uploading {group.controls.name.value}...</div>
				</div>
			</Show>
			<Show when={progress().type === 'uploaded'}>
				<span class="p-2">Upload completed</span>
				<div class="flex flex-row items-center">
					<span
						class="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
						role="status"
					>
						<span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
							Processing...
						</span>
					</span>
					<div class="p-2 font-light">Extracting Route...</div>
				</div>
			</Show>
			<Show when={progress().type === 'success'}>
				<span class="flex flex-row justify-between">
					<div class="p-2">{(progress() as { message: string }).message}</div>
					<button
						type="button"
						class="bg-primary-100 text-primary-700 hover:bg-primary-accent-100 focus:bg-primary-accent-100 active:bg-primary-accent-200 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal transition duration-150 ease-in-out focus:outline-none focus:ring-0"
						onclick={() => {
							props.closeModal()
						}}
					>
						Close
					</button>
				</span>
			</Show>
			<Show when={progress().type === 'error'}>
				<div class="text-warning-700 p-2">Upload failed: ${error()}</div>
			</Show>
		</div>
	)
}

type ConfirmUploadProps = {
	routeName: string
} & Modal.CanPrompt<boolean>
const ConfirmDelete: Component<ConfirmUploadProps> = (props) => {
	return (
		<>
			<p>
				Are you sure you want to delete route <i>{props.routeName}</i>?
			</p>
			<button
				class="bg-warning-100 text-warning-700 hover:bg-warning-accent-100 focus:bg-warning-accent-100 active:bg-warning-accent-200 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal transition duration-150 ease-in-out focus:outline-none focus:ring-0"
				onclick={() => props.onCompleted(true)}
			>
				yes
			</button>
			<button
				class="bg-primary-100 text-primary-700 hover:bg-primary-accent-100 focus:bg-primary-accent-100 active:bg-primary-accent-200 mr-2 inline-block rounded px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal transition duration-150 ease-in-out focus:outline-none focus:ring-0"
				onclick={() => props.onCompleted(false)}
			>
				no
			</button>
		</>
	)
}

export const RouteUploadGuarded: Component<RouteUploadProps> = (props) => {
	return (
		<Guarded>
			<RouteUpload {...props} />
		</Guarded>
	)
}

function useRouteUpload(map: string, finish: () => void, routeToEdit?: Route) {
	const [progress, setProgress] = createSignal<ProcessingStatus>({
		type: 'init',
	})

	let routeInsertChannel: RealtimeChannel | null = null
	const owner = getOwner()

	const group = SF.createFormGroup(
		{
			name: SF.createFormControl(routeToEdit?.name || ''),
			map: SF.createFormControl(routeToEdit?.metadata?.map || map),
			category: SF.createFormControl(routeToEdit?.metadata.category || ''),
			newCategory: SF.createFormControl(''),
			video: SF.createFormControl<File | null>(null, {
				required: !routeToEdit,
			}),
			vehicle: SF.createFormControl(routeToEdit?.metadata.vehicle || ''),
			timeOffset: SF.createFormControl(routeToEdit?.metadata.timeOffset || 0),
		},
		{ required: true }
	)

	createEffect(
		on(progress, async (progress) => {
			console.log('progress status changed', progress.type)
			if (progress.type == 'inProgress') {
				const uploadPath = `${progress.routeUpload.id}.mp4`
				{
					const { error, data: route } = await SB.sb.from('routes').upsert(progress.routeUpload).select().single()

					if (progress.file) {
						const uploaded = SB.sb.storage.from('route_uploads').upload(uploadPath, progress.file, {
							upsert: true,
							contentType: progress.file.type,
						})
						const { error } = await uploaded

						if (error) {
							setProgress({ type: 'error', error: error.message })
							return
						} else {
							setProgress({
								type: 'uploaded',
								routeUpload: route as DbRoute,
							})
						}
					} else {
					}
				}
			}
			if (progress.type === 'uploaded') {
				console.log('subscribing to route extraction channel')
				// we're assuming that the route extraction will not have completed by the time this channel is active
				routeInsertChannel = SB.sb
					.channel('route-extraction-channel-' + progress.routeUpload.id)
					.on(
						'postgres_changes',
						{
							event: 'UPDATE',
							schema: 'public',
							table: 'routes',
							filter: 'id=eq.' + progress.routeUpload.id,
						},
						(payload) => {
							if (payload.new.path) {
								setProgress({
									type: 'success',
									message: 'Video processing completed',
									routeUpload: payload.new as DbRoute,
								})
							}
							if (payload.new.status === 'error') {
								setProgress({
									type: 'error',
									error: 'something went wrong while processing this upload',
								})
							}
						}
					)
					.subscribe()
			}

			if (progress.type === 'init' || progress.type === 'error') {
				routeInsertChannel?.unsubscribe()
				group.markReadonly(false)
			} else {
				group.markReadonly(true)
			}
		})
	)

	onCleanup(() => {
		routeInsertChannel?.unsubscribe()
	})

	async function onSubmit() {
		if (!group.isValid) return
		group.markReadonly(true)
		const _file = group.controls.video.value
		// check if the file is an mp4

		const category =
			group.controls.category.value === 'New Category'
				? group.controls.newCategory.value
				: group.controls.category.value

		const routeUpdateParams = {
			name: group.value.name!,
			map_name: group.value.map!,
			category: category!,
			vehicle: group.value.vehicle!,
			offset: group.value.timeOffset!,
		}

		let author: string
		// we opnly want to take ownership in the case that we're uploading a file, or this is a new route
		if (!routeToEdit || _file) {
			author = SB.session()!.user!.id
		} else {
			author = routeToEdit.metadata.author
		}

		const routeParams = {
			...routeUpdateParams,
			id: routeToEdit?.id || crypto.randomUUID(),
			author,
		} satisfies RouteParams

		setProgress({
			type: 'inProgress',
			file: _file,
			routeUpload: routeParams,
		})
	}

	async function deleteRoute() {
		if (!routeToEdit || progress().type !== 'init' || progress().type !== 'error') return
		await Modal.prompt(
			owner!,
			null,
			(_props) => <ConfirmDelete routeName={routeToEdit!.name} onCompleted={_props.onCompleted} />,
			false
		)
		const { data, error } = await SB.sb.from('routes').delete().eq('id', routeToEdit.id)
		if (error) {
			alert(error.message)
			return
		}
		finish()
	}

	return { progress, group, onSubmit, deleteRoute }
}
