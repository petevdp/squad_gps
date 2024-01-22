/* @refresh reload */
import { render } from 'solid-js/web'
import { Router } from '@solidjs/router'
import './index.css'
import 'tailwindcss/tailwind.css'
import { logIn, pb } from './pocketbase'
import App from './components/App'

await logIn('pjvanderpol@gmail.com', 'asdf;lkj')

const users = await pb.collection('users').getFullList()

const root = document.getElementById('root')

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?'
	)
}

render(
	() => (
		<Router>
			<App />
		</Router>
	),
	root!
)
