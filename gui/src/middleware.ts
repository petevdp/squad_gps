import { rewrite } from '@vercel/edge'

export default function middleware(request: any) {
	const url = new URL(request.url)
	if (url.pathname !== '/') {
		return rewrite('/', request.url)
	}
}
