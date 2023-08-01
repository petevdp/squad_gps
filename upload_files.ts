import {createClient} from "https://cdn.skypack.dev/@supabase/supabase-js?dts";
import {expandGlob} from "https://deno.land/std/fs/mod.ts";
import {join} from "https://deno.land/std/path/mod.ts";

import {Semaphore} from "https://deno.land/x/semaphore@v1.1.2/mod.ts";
import {load} from "https://deno.land/std@0.196.0/dotenv/mod.ts";


const {SUPABASE_URL, SUPABASE_SERVICE_KEY} = await load();
// Create a single supabase client for interacting with your database
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {auth: {persistSession: false}});
const rootDir = "/home/pete/projects/squad_gps/gui/public/maps";

const uploadFile = async (path: string) => {
    const bucketName = "map_tiles";
    const fileData = await Deno.readFile(path);
    const fileName = path.replace(rootDir + "/", "");

    const {error} = await sb.storage.from(bucketName).upload(fileName, fileData);

    if (error) {
        console.error("Error uploading file:", error);
    } else {
        console.log(`uploaded ${fileName}!`);
    }
};


const semaphore = new Semaphore(20);
const main = async () => {
    const tasks = []
    const pathGlob = join(rootDir, `map-tiles/**/*.png`);
    for await (const entry of expandGlob(pathGlob)) {
        tasks.push(semaphore.acquire().then(async (release) => {
            await uploadFile(entry.path);
            release();
        }));
    }
    console.log("a")
    await Promise.all(tasks);
};

main().catch((err) => {
    console.error(err);
});
