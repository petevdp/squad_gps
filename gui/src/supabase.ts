import {createClient, Session, User} from "@supabase/supabase-js";
import {createSignal} from "solid-js";
import {Database} from "./database.types";


export const client = createClient<Database>(import.meta.env!.VITE_SUPABASE_URL as string, import.meta.env!.VITE_SUPABASE_KEY as string);
export const [session, setSession] = createSignal(null as Session | null);


setInterval(async () => {
    const {data, error} = await client.auth.refreshSession();
    if (error) {
        console.error(error)
        return
    }
    setSession(data.session);
}, 1000 * 60 * 5);


export const logIn = async (email: string, password: string) => {
    const {data, error} = await client.auth.signInWithPassword({email: email, password: password});
    if (error) {
        alert(error)
        return error
    } else {
        setSession(data.session);
        return null;
    }
}

export const logOut = async () => {
    await client.auth.signOut();
    setSession(null);
}
client.auth.getSession().then(async s => {
    setSession(s.data.session)
})
