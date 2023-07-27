import {Select, initTE} from 'tw-elements'
import {createSignal, For, onMount} from "solid-js"
import * as SU from "../supabase"
import * as tus from "tus-js-client"
import {useNavigate} from "@solidjs/router"

export const FileUpload = () => {

	const navigate = useNavigate();
	if (!SU.client.auth.getSession()) {
	}



	const maps = ["Anvil", "Al Basrah", "Belaya Pass", "Black Coast", "Chora", "Fallujah", "Fool's Road", "Goose Bay", "Gorodok", "Harju", "Kamdesh Highlands", "Kohat Toi", "Kokan", "Lashkar Valley", "Logar Valley", "Manicouagan", "Mestia", "Mutaha", "Narva", "Skorpo", "Sumari Bala", "Tallil Outskirts", "Yehorivka"]
	let inputRef: HTMLInputElement = null as unknown as HTMLInputElement;
	let mapSelect: HTMLSelectElement = null as unknown as HTMLSelectElement;

	onMount(() => {
		initTE({Select})
	});

	async function onSubmit(e: Event) {
		e.preventDefault();
		console.log({e})
		// check if the file is an mp4
		if (inputRef.files === null) {
			alert("No file selected");
			e.preventDefault();
			return;
		}
		const file = inputRef.files![0];
		if (file.type !== "video/mp4") {
			alert("File must be an mp4");
			e.preventDefault();
			return;
		}

		const {data, error} = await SU.client.storage.from("route_uploads").upload(`${file.name}`, file, {upsert: false});

		console.log({data, error})

	}

	return (
		<div class="grid h-screen place-items-center font-bold text-xl">
			<div class="m-auto">
				<h1>Upload an mp4 file</h1>
				<form onsubmit={(e) => {
					onSubmit(e)
				}} action="/upload" method="post" enctype="multipart/form-data" class="flex flex-col align-end">
					<input ref={inputRef} type="file" name="file" id="file" class="p-2 hover:cursor-pointer"/>
					<div>
						<select ref={mapSelect} data-te-select-init data-te-select-filter="true">
							<For each={maps}>{(map) => <option value={map}>{map}</option>}</For>
						</select>
					</div>
					<input type="submit" value="Submit" name="submit" class="p-2 hover:cursor-pointer"/>
				</form>
			</div>
		</div>);
}



type UploadProgress = {
	bytesUplaoded: number;
	bytesTotal: number
};

function uploadFile(bucketName: string, fileName: string, file: File) {
	const [progress, setProgress] = createSignal<UploadProgress|null>(null);
	const [error, setError] = createSignal<Error | null>(null);
  const success = new Promise<void>(async (resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://localhost:54321/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${SU.session()!.access_token}`,
        'x-upsert': 'true', // optionally set upsert to true to overwrite existing files
      },
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: bucketName,
        objectName: fileName,
        contentType: 'image/png',
        cacheControl: 3600,
      },
      chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
      onError: function (error) {
        console.log('Failed because: ' + error)
        reject(error)
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2)
        console.log(bytesUploaded, bytesTotal, percentage + '%')
      },
      onSuccess: function () {
        // console.log(upload)
        console.log('Download %s from %s', upload.file.name, upload.url)
        resolve()
      },
    })

    // Check if there are any previous uploads to continue.
     upload.findPreviousUploads().then(function (previousUploads) {
      // Found previous uploads so we select the first one.
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0])
      }

      // Start the upload
      upload.start()
    })
  })

	return {progress, success, error}
}
