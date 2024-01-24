import { Component, createSignal, onMount, Show } from 'solid-js'
import { A, useNavigate } from '@solidjs/router'
import { TextInput } from './Input'
import * as TE from 'tw-elements'
import * as PB from '../pocketbase'
import * as SF from 'solid-forms'
import { CanPrompt } from './Modal'

export type LoginProps = {
	message?: string
} & CanPrompt<boolean>

export const LoginPage: Component = () => {
	const navigate = useNavigate()
	return (
		<section class="grid h-screen place-items-center">
			<div class="g-6 flex h-full min-w-[800px] flex-wrap items-center  justify-center">
				<div class="mb-12 md:mb-0 md:w-8/12 lg:w-5/12 xl:w-5/12">
					<Login onCompleted={() => navigate('/')} />
				</div>
			</div>
		</section>
	)
}

export const Login: Component<LoginProps> = (props) => {
	onMount(() => {
		TE.initTE({ Select: TE.Select, Input: TE.Input })
	})
	const group = SF.createFormGroup({
		emailOrUsername: SF.createFormControl('', { required: true }),
		password: SF.createFormControl('', { required: true }),
	})

	const [error, setError] = createSignal<null | string>(null)

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault()
		const _emailOrUsername = group.controls.emailOrUsername.value.trim()
		const _password = group.controls.password.value.trim()
		const success = await PB.logIn(_emailOrUsername, _password)

		if (success) {
			props.onCompleted(true)
		} else {
			setError('email or password incorrect')
		}
	}

	return (
		<form class="align-center flex flex-col" onsubmit={onSubmit}>
			<Show when={props.message}>
				<p class="mb-2 text-red-300">{props.message}</p>
			</Show>
			<TextInput control={group.controls.emailOrUsername} label="Email/Username" type="text" />
			<TextInput control={group.controls.password} label="Password" type="password" />
			<A href="/forgot_password" class="text-primary mb-2 self-end text-sm hover:underline">
				Forgot password?
			</A>

			<button
				type="submit"
				class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 m-auto inline-block rounded px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
				data-te-ripple-init
				data-te-ripple-color="light"
			>
				Login
			</button>

			<Show when={error()}>
				<p class="mb-2 text-red-300">{error()}</p>
			</Show>

			<p class="mb-0 mt-2 pt-1 text-sm font-semibold">Don't have an account?</p>
			<p class="mb-0 mt-2 pt-1 text-sm">
				{' '}
				Email me at <a>greytwosevenfive@gmail.com</a> or reach me on discord to gain access
			</p>
		</form>
	)
}
