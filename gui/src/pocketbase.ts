import PocketBase from 'pocketbase'
import { createSignal } from 'solid-js'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '/')

const [_loggedIn, setLoggedIn] = createSignal(pb.authStore.isValid)

export const loggedIn = _loggedIn

export async function logIn(emailOrUsername: string, password: string) {
	const authData = await pb.collection('users').authWithPassword(emailOrUsername, password)
	if (pb.authStore.isValid) {
		setLoggedIn(true)
		return true
	} else {
		return false
	}
}

export function logOut() {
	pb.authStore.clear()
	setLoggedIn(false)
}

export function updatePassword() {}
