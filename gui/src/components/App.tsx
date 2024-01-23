import type { Component } from 'solid-js'
import { Navigate, Route, Routes, useSearchParams } from '@solidjs/router'
import { GuardedRouteViewer as RouteViewer } from './RouteViewer'
import { LoginPage } from './Login'
import { ModalContainer } from './Modal'
import { RoutesTableGuarded as RoutesTable } from './RoutesTable'

const App: Component = () => {
	return (
		<>
			<ModalContainer />
			<Routes>
				<Route path="/" component={Home} />
				<Route path="route_viewer" component={RouteViewer} />
				<Route path="/routes" component={RoutesTable} />
				<Route path="/login" component={LoginPage} />
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
			// const { error } = await SB.sb.auth.verifyOtp({
			// 	type: type as 'signup',
			// 	token_hash: tokenHash,
			// })
			// setSearchParams({
			// 	...searchParams,
			// 	token_hash: undefined,
			// 	email: undefined,
			// 	type: undefined,
			// })
			//
			// if (error) {
			// 	alert(error.message)
			// }
		})()
		return <Navigate href={'/update_password'} />
	}
	return <Navigate href={'/route_viewer'} />
}

export default App
