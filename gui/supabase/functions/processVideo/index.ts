// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { load } from 'https://deno.land/std@0.196.0/dotenv/mod.ts'
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js?dts'

const { SHARED_SECRET_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL } = await load()

serve(async (req) => {
	// const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	// 	auth: { persistSession: false },
	// })
	const data: any = { test: true }

	// const { data: signedUrl, error } = await sb.storage.createSignedUrl(
	// 	req.data.name,
	// 	30
	// )
	console.log({ data })

	return new Response(JSON.stringify(data), {
		headers: { 'Content-Type': 'application/json' },
	})
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
