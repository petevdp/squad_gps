export const config = {
	matcher: '/:path',
}

export default function middleware(request: Request) {
	const url = new URL(request.url)
	if (url.pathname !== '/') {
		return Response.redirect(new URL('/', request.url))
	}
}
