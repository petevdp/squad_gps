import {
	Component,
	createEffect,
	createResource,
	createSignal,
	getOwner,
	onCleanup,
	onMount,
	Show,
} from 'solid-js'

import * as SB from '../supabase'
import { FileInput, SelectInput, TextInput } from './Input'
import VEHICLES from '../assets/vehicles.json'
import * as Modal from './Modal'

import * as SF from 'solid-forms'
import { Route } from './RouteViewer'
import { Guarded } from './Guarded'
import { DbRoute, MAP_NAMES } from '../types'
import { RealtimeChannel } from '@supabase/supabase-js'

type FileUploadDetails = {
	routeId: string
	file: File
	userId: string
}

type ProcessingStatus =
	| {
			type: 'init'
	  }
	| {
			type: 'inProgress'
			bytesUploaded: number
			bytesTotal: number
	  }
	| {
			type: 'uploaded'
	  }
	| {
			type: 'success'
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

type EditStatus =
	| { status: 'new' }
	| { status: 'initializing' }
	| { status: 'initialized'; route: DbRoute }

const RouteUpload: Component<RouteUploadProps> = (props) => {
	const { progress, startFileUpload, group, deleteRoute, onSubmit } =
		useRouteUpload(props.routeToEdit, props.map, props.closeModal)

	//@ts-ignore
	const [categories] = createResource(
		() =>
			SB.sb
				.from('categories')
				.select('category')
				.then((res) => res.data?.map((c) => c?.category)?.sort()) as Promise<
				string[] | null
			>
	)
	const categoriesWithNew = () =>
		(categories() ? ['New Category', ...categories()!] : []) as string[]

	const uploadPercentage = (): string | undefined => {
		const _progress = progress()
		if (_progress.type === 'inProgress') {
			return `${(_progress.bytesUploaded / _progress.bytesTotal) * 100}%`
		}
	}

	const error = (): string | undefined => {
		const _progress = progress()
		if (_progress.type === 'error') {
			return _progress.error
		}
	}
	const isNewCategory = () => group.controls.category.value === 'New Category'

	createEffect(() => {
		if (!group.controls.name.value && group.controls.video.value) {
			group.controls.name.setValue(
				group.controls.video.value.name.replace(/.mp4$/, '')
			)
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
						<FileInput
							label="Video"
							control={group.controls.video}
							class="w-max"
						/>
						<TextInput
							class="col-span-2"
							label="Name"
							control={group.controls.name}
						/>
						<SelectInput
							control={group.controls.vehicle}
							label="Vehicle"
							options={() => [...VEHICLES.map((v) => v.name).sort()]}
						/>
						<SelectInput
							control={group.controls.map}
							label="Map"
							options={() => [...MAP_NAMES]}
						/>
						{/* hack to make sure the options are all set initially */}
						<Show when={categoriesWithNew().length > 0}>
							<SelectInput
								control={group.controls.category}
								label={'Category'}
								options={categoriesWithNew}
							/>
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
				<div class="h-1 w-full bg-neutral-200 dark:bg-neutral-600">
					<div
						class="bg-primary h-1"
						style={`width: ${uploadPercentage()!}`}
					></div>
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
				<div class="p-2">Processing done for {group.controls.name.value}</div>
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

function useRouteUpload(
	routeToEdit: Route | undefined,
	map: string,
	finish: () => void
) {
	const [progress, setProgress] = createSignal<ProcessingStatus>({
		type: 'init',
	})
	const [fileDetails, startFileUpload] = createSignal<FileUploadDetails | null>(
		null
	)
	const uploadId = crypto.randomUUID()
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
		},
		{ required: true }
	)

	onMount(async () => {
		routeInsertChannel = SB.sb
			.channel('route-upload-channel')
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'route_upload_details',
					filter: 'upload_id=eq.' + uploadId,
				},
				(payload) => {
					if (payload.new.status === 'success') {
						setProgress({ type: 'success' })
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
	})

	createEffect(async () => {
		const _fileDetails = fileDetails()
		if (!_fileDetails) return
		const uploadPath = `${uploadId}.mp4`
		{
			const { data, error } = await SB.sb.from('route_upload_details').insert({
				route_id: _fileDetails.routeId,
				upload_id: uploadId,
				original_filename: _fileDetails.file.name,
			})
			if (error) {
				setProgress({ type: 'error', error: error.message })
				return
			}
		}

		{
			const uploaded = SB.sb.storage
				.from('route_uploads')
				.upload(uploadPath, _fileDetails.file)
			setProgress({
				type: 'inProgress',
				bytesUploaded: 0,
				bytesTotal: _fileDetails.file.size,
			})
			const { error } = await uploaded
			if (error) {
				setProgress({ type: 'error', error: error.message })
				return
			} else {
				setProgress({ type: 'uploaded' })
			}
		}
	})

	createEffect(() => {
		if (progress().type === 'init' || progress().type === 'error') {
			group.markReadonly(false)
		} else {
			group.markReadonly(true)
		}
	})

	onCleanup(() => {
		routeInsertChannel?.unsubscribe()
	})

	async function onSubmit() {
		if (!['init', 'error'].includes(progress().type)) return
		group.markReadonly(true)
		const _file = group.controls.video.value
		// check if the file is an mp4
		const routeId = routeToEdit?.id || crypto.randomUUID()

		const category =
			group.controls.category.value === 'New Category'
				? group.controls.newCategory.value
				: group.controls.category.value

		if (routeToEdit) {
			const { data: route, error } = await SB.sb
				.from('routes')
				.update({
					name: group.controls.name.value,
					map_name: group.controls.map.value,
					category: category,
					vehicle: group.controls.vehicle.value,
				})
				.eq('id', routeToEdit.id)
			if (error) {
				alert(error.message)
				return
			}
		} else {
			const { error } = await SB.sb.from('routes').insert([
				{
					id: routeId,
					name: group.controls.name.value,
					map_name: group.controls.map.value,
					author: SB.session()!.user.id,
					category: category,
					vehicle: group.controls.vehicle.value,
				},
			])

			if (error) {
				console.error(error)
				setProgress({ type: 'error', error: error.message })
				return
			}
		}

		if (_file) {
			if (_file.type !== 'video/mp4') {
				setProgress({ type: 'error', error: 'Only mp4 files are supported' })
				return
			}
			startFileUpload({ routeId, userId: SB.session()!.user.id, file: _file })
		} else if (!routeToEdit) {
			setProgress({ type: 'error', error: 'No file selected' })
			return
		}
	}

	async function deleteRoute() {
		if (!routeToEdit) return
		await Modal.prompt(
			owner!,
			null,
			(_props) => (
				<ConfirmDelete
					routeName={routeToEdit!.name}
					onCompleted={_props.onCompleted}
				/>
			),
			false
		)
		const { data, error } = await SB.sb
			.from('routes')
			.delete()
			.eq('id', routeToEdit.id)
		if (error) {
			alert(error.message)
			return
		}
		finish()
	}

	return { progress, startFileUpload, group, onSubmit, deleteRoute }
}
