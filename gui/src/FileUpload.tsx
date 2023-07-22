import {Select, initTE} from 'tw-elements'
import {For, onMount} from "solid-js"

export const FileUpload = () => {
	const maps = ["Anvil", "Al Basrah", "Belaya Pass", "Black Coast", "Chora", "Fallujah", "Fool's Road", "Goose Bay", "Gorodok", "Harju", "Kamdesh Highlands", "Kohat Toi", "Kokan", "Lashkar Valley", "Logar Valley", "Manicouagan", "Mestia", "Mutaha", "Narva", "Skorpo", "Sumari Bala", "Tallil Outskirts", "Yehorivka"]
	let inputRef: HTMLInputElement = null as unknown as HTMLInputElement;
	let mapSelect: HTMLSelectElement = null as unknown as HTMLSelectElement;

	onMount(() => {
		initTE({Select})
	});
	function onSubmit(e: Event) {
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
	}

	return (
		<div class="grid h-screen place-items-center font-bold text-xl">
			<div class="m-auto">
				<h1>Upload an mp4 file</h1>
				<form onsubmit={(e) => { onSubmit(e)}} action="/upload" method="post" enctype="multipart/form-data" class="flex flex-col align-end">
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
