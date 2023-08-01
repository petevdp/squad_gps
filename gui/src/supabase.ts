import {createClient, Session, User} from "@supabase/supabase-js";
import {createEffect, createRoot, createSignal} from "solid-js";
import {Database} from "./database.types";
import {H} from 'highlight.run';


export const sb = createClient<Database>(import.meta.env!.VITE_SUPABASE_URL as string, import.meta.env!.VITE_SUPABASE_KEY as string);
export const [session, setSession] = createSignal(null as Session | null);

sb.auth.onAuthStateChange((event, session) => {
	if (session) {
		setSession(session);
	}
});

createRoot(() => {
	createEffect(() => {
		if (session() && session()?.user) {
			H.identify(session()!.user.email || session()!.user.id, {
				id: session()!.user.id,
			});
		}
	})
})


export const logIn = async (email: string, password: string) => {
    const {data, error} = await sb.auth.signInWithPassword({email: email, password: password});
    if (error) {
        return error
    } else {
        setSession(data.session);
        return null;
    }
}

export const updatePassword = async (password: string) => {
	const {error, data} = await sb.auth.updateUser({password: password});
	setSession((await sb.auth.getSession()).data.session);
	if (error) {
		return error;
	}
}

export const logOut = async () => {
    await sb.auth.signOut();
    setSession(null);
}
