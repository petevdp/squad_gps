import { ParentProps, Show } from 'solid-js'
import { A } from '@solidjs/router'
import * as PB from '../pocketbase'

export function Guarded(props: ParentProps) {
	return (
		<>
			<Show when={PB.loggedIn()} fallback={<NotLoggedIn />}>
				{props.children}
			</Show>
		</>
	)
}

function NotLoggedIn() {
	return (
		<div class="grid h-screen place-items-center text-xl font-bold">
			<div class="m-auto">
				<h1>You must be logged in.</h1>
				<A
					href="/login"
					class="text-primary hover:text-primary-600 focus:text-primary-600 active:text-primary-700 dark:text-primary-400 dark:hover:text-primary-500 dark:focus:text-primary-500 dark:active:text-primary-600 transition duration-150 ease-in-out"
				>
					Login
				</A>
			</div>
		</div>
	)
}
