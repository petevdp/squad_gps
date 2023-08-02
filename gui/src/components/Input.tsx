import { createOptions, Select } from '@thisbeyond/solid-select'
import '@thisbeyond/solid-select/style.css'
import {
	Accessor,
	Component,
	createEffect,
	createSignal,
	mergeProps,
	onMount,
} from 'solid-js'
import * as SF from 'solid-forms'
import * as TE from 'tw-elements'

type TextInputProps = {
	control: SF.IFormControl
	label: string
	type?: 'text' | 'password' | 'email' | 'number'
	class?: string
	focus?: boolean
}

export const TextInput: Component<TextInputProps> = (props) => {
	const _props = mergeProps(
		{
			control: SF.createFormControl(''),
			type: 'text' satisfies TextInputProps['type'],
		},
		props
	)
	let ref = null as unknown as HTMLInputElement
	const id = crypto.randomUUID()
	onMount(() => {
		TE.initTE({ Input: TE.Input })
	})
	createEffect(() => {
		if (props.focus) {
			ref.focus()
		}
	})

	return (
		<div class={'relative mb-3 ' + props.class} data-te-input-wrapper-init>
			<input
				type={_props.type || 'text'}
				ref={ref}
				id={id}
				value={_props.control.value}
				onChange={(e) => _props.control.setValue(e.currentTarget.value)}
				class="peer-focus:text-primary dark:peer-focus:text-primary peer block min-h-[auto] w-full rounded border-0 bg-transparent px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear focus:placeholder:opacity-100 data-[te-input-state-active]:placeholder:opacity-100 motion-reduce:transition-none dark:text-neutral-200 dark:placeholder:text-neutral-200 [&:not([data-te-input-placeholder-active])]:placeholder:opacity-0"
				placeholder={_props.label}
				required={_props.control.isRequired}
				disabled={_props.control.isDisabled}
				onblur={() => _props.control.markTouched(true)}
			/>
			<label
				for={id}
				class="peer-focus:text-primary dark:peer-focus:text-primary pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] text-neutral-500 transition-all duration-200 ease-out peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-data-[te-input-state-active]:-translate-y-[0.9rem] peer-data-[te-input-state-active]:scale-[0.8] motion-reduce:transition-none dark:text-neutral-200"
			>
				{_props.label}
			</label>
		</div>
	)
}

type FileInputProps = {
	control: SF.IFormControl<File | null>
	label: string
	class?: string
	accept: HTMLInputElement['accept']
}
export const FileInput: Component<FileInputProps> = (props) => {
	const id = crypto.randomUUID()
	const [focused, setFocused] = createSignal(false)
	return (
		<div class={'flex flex-row items-center ' + (props.class || '')}>
			<label
				for={id}
				class="mr-2 inline-block text-neutral-700 dark:text-neutral-200"
			>
				{props.label}
			</label>
			<input
				placeholder="test"
				class={
					' focus:border-primary focus:shadow-te-primary dark:focus:border-primary relative block flex-auto rounded border border-solid border-neutral-300 bg-clip-padding px-3 py-[0.32rem] text-base font-normal text-neutral-700 transition duration-300 ease-in-out file:-mx-3 file:-my-[0.32rem] file:overflow-hidden file:rounded-none file:border-0 file:border-solid file:border-inherit file:bg-neutral-100 file:px-3 file:py-[0.32rem] file:text-neutral-700 file:transition file:duration-150 file:ease-in-out file:[border-inline-end-width:1px] file:[margin-inline-end:0.75rem] hover:file:bg-neutral-200 focus:text-neutral-700 focus:outline-none dark:border-neutral-600 dark:text-neutral-200 dark:file:bg-neutral-700 dark:file:text-neutral-100'
				}
				type="file"
				accept={props.accept}
				required={props.control.isRequired}
				disabled={props.control.isDisabled}
				onclick={(e) => {
					if (props.control.isDisabled || focused()) {
						e.preventDefault()
						return
					}
					setFocused(true)
				}}
				id={id}
				onchange={(e) => {
					const file = e.currentTarget.files![0] as File
					props.control.setValue(file)
					setFocused(false)
				}}
				onblur={() => {
					props.control.markTouched(true)
					setFocused(false)
				}}
			/>
		</div>
	)
}
type SelectInputProps = {
	control: SF.IFormControl<string | null>
	label: string
	options: Accessor<string[]>
	class?: string
}
export const SelectInput: Component<SelectInputProps> = (props) => {
	const id = crypto.randomUUID()
	const [filteredOptions, setFilteredOptions] = createSignal(props.options())
	onMount(() => {
		TE.initTE({ Select: TE.Select })
	})
	const optionProps = () => createOptions(props.options(), { filterable: true })

	return (
		<Select
			{...optionProps()}
			initialValue={props.control.value}
			onChange={(value) => props.control.setValue(value)}
			disabled={props.control.isDisabled}
			placeholder={props.label}
			class={'bg-white text-black ' + props.class}
		/>
	)
}

type MultiSelectInputProps = {
	control: SF.IFormControl<string[]>
	label: string
	options: Accessor<string[]>
	class?: string
}

export const MultiSelectInput: Component<MultiSelectInputProps> = (props) => {
	const id = crypto.randomUUID()
	const [filteredOptions, setFilteredOptions] = createSignal(props.options())
	onMount(() => {
		TE.initTE({ Select: TE.Select })
	})
	const optionProps = () => createOptions(props.options(), { filterable: true })

	return (
		<Select
			{...optionProps()}
			initialValue={props.control.value}
			onChange={(value) => {
				props.control.setValue(value)
			}}
			disabled={props.control.isDisabled}
			multiple={true}
			placeholder={props.label}
			class={'bg-white text-black ' + props.class}
		/>
	)
}

export const SwitchInput: Component<{
	onChange?: (value: boolean) => void
	control: SF.IFormControl<boolean>
	label: string
}> = (props) => {
	const id = crypto.randomUUID()
	return (
		<span>
			<input
				class="checked:bg-primary checked:after:bg-primary checked:focus:border-primary checked:focus:bg-primary dark:checked:bg-primary dark:checked:after:bg-primary mr-2 mt-[0.3rem] h-3.5 w-8 appearance-none rounded-[0.4375rem] bg-neutral-300 before:pointer-events-none before:absolute before:h-3.5 before:w-3.5 before:rounded-full before:bg-transparent before:content-[''] after:absolute after:z-[2] after:-mt-[0.1875rem] after:h-5 after:w-5 after:rounded-full after:border-none after:bg-neutral-100 after:shadow-[0_0px_3px_0_rgb(0_0_0_/_7%),_0_2px_2px_0_rgb(0_0_0_/_4%)] after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] checked:after:absolute checked:after:z-[2] checked:after:-mt-[3px] checked:after:ml-[1.0625rem] checked:after:h-5 checked:after:w-5 checked:after:rounded-full checked:after:border-none checked:after:shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),_0_2px_2px_0_rgba(0,0,0,0.14),_0_1px_5px_0_rgba(0,0,0,0.12)] checked:after:transition-[background-color_0.2s,transform_0.2s] checked:after:content-[''] hover:cursor-pointer focus:outline-none focus:ring-0 focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[3px_-1px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] focus:after:absolute focus:after:z-[1] focus:after:block focus:after:h-5 focus:after:w-5 focus:after:rounded-full focus:after:content-[''] checked:focus:before:ml-[1.0625rem] checked:focus:before:scale-100 checked:focus:before:shadow-[3px_-1px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] dark:bg-neutral-600 dark:after:bg-neutral-400 dark:focus:before:shadow-[3px_-1px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:before:shadow-[3px_-1px_0px_13px_#3b71ca]"
				type="checkbox"
				role="switch"
				disabled={props.control.isDisabled}
				required={props.control.isRequired}
				checked={props.control.value}
				id={id}
				onchange={(e) => {
					props.control.setValue(e.currentTarget.checked)
					props.onChange?.(e.currentTarget.checked)
				}}
			/>
			<label class="inline-block pl-[0.15rem] hover:cursor-pointer" for={id}>
				{props.label}
			</label>
		</span>
	)
}
