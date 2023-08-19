import type { Component } from 'solid-js'
import { onMount } from 'solid-js'
import { Navigate, Route, Routes, useSearchParams } from '@solidjs/router'
import { DrawTool } from './draw_tool'
import { GuardedRouteViewer as RouteViewer } from './RouteViewer'
import { LoginPage } from './Login'
import { ModalContainer } from './Modal'
import { RoutesTableGuarded as RoutesTable } from './RoutesTable'
import { UpdatePasswordPage } from './UpdatePassword'

import * as SB from '../supabase'
import { ForgotPasswordPage } from './ForgotPassword'
import { OpencvJs } from './OpencvJs'

const App: Component = () => {
	onMount(() => {
		// const productkey = import.meta.env.VITE_HIGHLIGHT_PRODUCT_KEY
		// H.init(productkey, {
		// 	// Get your project ID from https://app.highlight.io/setup
		// 	environment: 'production',
		// 	version: 'commit:' + import.meta.env.VITE_GIT_COMMIT_HASH,
		// 	networkRecording: {
		// 		enabled: true,
		// 		recordHeadersAndBody: true,
		// 		urlBlocklist: [
		// 			// insert full or partial urls that you don't want to record here
		// 			// Out of the box, Highlight will not record these URLs (they can be safely removed):
		// 			'https://www.googleapis.com/identitytoolkit',
		// 			'https://securetoken.googleapis.com',
		// 		],
		// 	},
		// })
	})

	return (
		<>
			<ModalContainer />
			<Routes>
				<Route path="/" component={Home} />
				<Route path="draw_tool" component={DrawTool} />
				<Route path="route_viewer" component={RouteViewer} />
				<Route path="opencvjs" component={OpencvJs} />
				<Route path="/routes" component={RoutesTable} />
				<Route path="/login" component={LoginPage} />
				<Route path="/update_password" component={UpdatePasswordPage} />
				<Route path="/forgot_password" component={ForgotPasswordPage} />
			</Routes>
		</>
	)
}

const Home: Component = () => {
	const [searchParams, setSearchParams] = useSearchParams()

	if (searchParams.token_hash && searchParams.email) {
		const tokenHash = searchParams.token_hash
		const email = searchParams.email
		const type = searchParams.type
		console.log('token', tokenHash, 'email', email)
		;(async () => {
			const { error } = await SB.sb.auth.verifyOtp({
				type: type as 'signup',
				token_hash: tokenHash,
			})
			setSearchParams({
				...searchParams,
				token_hash: undefined,
				email: undefined,
				type: undefined,
			})

			if (error) {
				alert(error.message)
			}
		})()
		return <Navigate href={'/update_password'} />
	}
	return <Navigate href={'/route_viewer'} />
}

export default App
