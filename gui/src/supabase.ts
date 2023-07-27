import {createClient, Session, User} from "@supabase/supabase-js";
import {createSignal} from "solid-js";


export const client =  createClient("http://localhost:54321", "public-anon-key")


export const [user, setUser] = createSignal(null as User | null);
export const [session, setSession] = createSignal(null as Session | null);

