import { Component, createSignal, getOwner, onMount, Show } from 'solid-js'
import * as SB from '../supabase'
import { useNavigate } from '@solidjs/router'
import { TextInput } from './Input'
import * as TE from 'tw-elements'
import * as SF from 'solid-forms'
import * as Modal from './Modal'

export type ForgotPasswordProps = {
	message?: string
} & Modal.CanPrompt<boolean>


export const ForgotPasswordPage: Component = () => {
	const navigate = useNavigate()
	const modal = Modal.addModal(
		{ title: '', render: () => <p class="">Check your email for a link</p> },
		getOwner()!
	)
	return (
		<section class="grid h-screen place-items-center">
			<div class="g-6 flex h-full min-w-[800px] flex-wrap items-center  justify-center">
				<div class="mb-12 md:mb-0 md:w-8/12 lg:w-5/12 xl:w-5/12">
					<ForgotPassword
						onCompleted={async () => {
							navigate('/login')
						}}
					/>
				</div>
			</div>
		</section>
	)
}

const ForgotPassword: Component<ForgotPasswordProps> = (props) => {
	onMount(() => {
		TE.initTE({ Select: TE.Select, Input: TE.Input })
	})
	const group = SF.createFormGroup({
		email: SF.createFormControl('', { required: true }),
	})

	const [error, setError] = createSignal<null | string>(null)
	const owner = getOwner()!

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault()
		const _email = group.controls.email.value.trim()
		const { data, error } = await SB.sb.auth.resetPasswordForEmail(_email)

		if (!error) {
			await Modal.prompt(
				owner,
				null,
				() => 'Check your email for a password reset link',
				true
			)
			props.onCompleted(true)
		} else {
			setError(error?.message || 'An unknown error occurred')
		}
	}

	return (
		<form class="align-center flex flex-col" onsubmit={onSubmit}>
			<h1 class="text-1xl m-auto mb-8 font-bold">Reset Password</h1>
			<Show when={props.message}>
				<p class="mb-2 text-red-300">{props.message}</p>
			</Show>
			<TextInput control={group.controls.email} label="Email" type="email" />

			<button
				type="submit"
				class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 m-auto inline-block rounded px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
				data-te-ripple-init
				data-te-ripple-color="light"
			>
				Send Reset Email
			</button>

			<Show when={error()}>
				<p class="mb-2 text-red-300">{error()}</p>
			</Show>

			<p class="mb-0 mt-2 pt-1 text-sm font-semibold">Don't have an account?</p>
			<p class="mb-0 mt-2 pt-1 text-sm">
				{' '}
				Email me at <a>greytwosevenfive@gmail.com</a> or reach me on discord to
				gain access
			</p>
		</form>
	)
}
