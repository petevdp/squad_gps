// @ts-ignore
import imgTrackerModule from '../lib/img_tracker_wasm.js'
import { createSignal, onMount, Show } from 'solid-js'
import { GrayScaleMedia } from '../lib/grayscale'
import { sleep } from '../utils/sleep'
import * as cvPromise from '@techstark/opencv-js'
import { imread } from '@techstark/opencv-js'

const cv = await cvPromise
console.log({ cv: cv.exceptionFromPtr })

class ImageTrackerContext {
	private _width: number
	private _height: number
	public valid: boolean
	private _Module: any
	private _init: any
	private imPtr: any
	private mapDataPtr: any
	private _resetTracking: any
	private _track: any

	constructor(width: number, height: number) {
		let _this = this

		this._width = width
		this._height = height

		this.valid = false
	}

	async initWasm() {
		this._Module = await imgTrackerModule()
		console.log('module', this._Module)

		this._init = this._Module.cwrap('initAR', 'number', ['number', 'number', 'number', 'number'])
		this._resetTracking = this._Module.cwrap('resetTracking', 'number', ['number', 'number', 'number', 'number'])
		// this._track = this._Module.cwrap('track', 'number', ['number', 'number', 'number'])

		this.imPtr = this._Module._malloc(this._width * this._height)
	}

	async addMapKeypointsAndDescriptors(mapName: string) {
		const keypointsData = await fetch(`/map_data/${mapName}.keypoints.bin`).then((res) => res.arrayBuffer())
		const descriptorsData = await fetch(`/map_data/${mapName}.descriptors.bin`).then((res) => res.arrayBuffer())

		const keypointsDataPtr = this._Module._malloc(keypointsData.byteLength)
		this._Module.HEAPU8.set(new Uint8Array(keypointsData), keypointsDataPtr)

		const descriptorsDataPtr = this._Module._malloc(descriptorsData.byteLength)
		this._Module.HEAPU8.set(new Uint8Array(descriptorsData), descriptorsDataPtr)

		try {
			this._init(mapName, keypointsDataPtr, descriptorsDataPtr, keypointsData.byteLength, descriptorsData.byteLength)
		} catch (e: any) {
			console.log(e)
			throw new Error(cv.exceptionFromPtr(e))
		} finally {
			this._Module._free(keypointsDataPtr)
			this._Module._free(descriptorsDataPtr)
		}
		console.log('added ref image, completed init')
	}

	parseResult(ptr: any): { valid: any; corners: Float64Array; H: Float64Array } {
		const valid = this._Module.getValue(ptr, 'i8')
		const dataPtr = this._Module.getValue(ptr + 4, '*')
		let data = new Float64Array(this._Module.HEAPF64.buffer, dataPtr, 17)

		const h = data.slice(0, 9)
		const warped = data.slice(9, 17)

		return {
			valid: valid,
			H: h,
			corners: warped,
		}
	}

	async resetTrackingImread(img: HTMLImageElement) {
		const imMat = await loadImage('yeho-car3-1.png')
		const data = new Uint8Array(this._Module.HEAPU8.buffer, imMat.data, imMat.data.byteLength)
		const dataPtr = this._Module._malloc(data.byteLength)

		let resObj = null
		try {
			const res = this._resetTracking(dataPtr, imMat.rows, imMat.cols, imMat.type())
			const resObj = this.parseResult(res)
			this.valid = resObj.valid
			return resObj
		} catch (e: any) {
			if (typeof e === 'number') {
				console.info(cv.exceptionFromPtr(e))
			} else {
				console.error(e)
			}
			return
		} finally {
			this._Module._free(dataPtr)
			imMat.delete()
		}
	}

	async resetTracking(filepath: string) {
		const mat = await loadImage(filepath)
		const imgPtr = this._Module._malloc(mat.data.byteLength)

		this._Module.HEAPU8.set(mat.data, imgPtr)
		let resObj = null
		try {
			const res = this._resetTracking(imgPtr, mat.rows, mat.cols, mat.type())
			console.log({ res })
			const resObj = this.parseResult(res)
			console.log({ resObj })
			this.valid = resObj.valid
			return resObj
		} catch (e: any) {
			console.error(cv.exceptionFromPtr(e))
			return
		} finally {
			this._Module._free(imgPtr)
		}
	}

	track(im: any) {
		// reset tracking if homography is no long valid
		return this.resetTracking('yeho-car3-1.png')
		// this._Module.HEAPU8.set(im, this.imPtr)
		// const res = this._track(this.imPtr, this._width, this._height)
		//
		// const resObj = this.parseResult(res)
		// this.valid = resObj.valid
		// return resObj
	}
}

export function ImageTracker() {
	let outputVideo = null as unknown as HTMLVideoElement
	let refIm = null as unknown as HTMLImageElement
	let mapOverlayCanvas = null as unknown as HTMLCanvasElement
	let videoOverlayCanvas = null as unknown as HTMLCanvasElement
	let sampleImage = null as unknown as HTMLImageElement
	let sampleImageContainer = null as unknown as HTMLDivElement
	let testCanvas = null as unknown as HTMLCanvasElement

	let mapContainer = null as unknown as HTMLDivElement

	const [videoLoaded, setVideoLoaded] = createSignal(false)

	function clearOverlay() {
		const overlayCtx = videoOverlayCanvas.getContext('2d')!
		overlayCtx.clearRect(0, 0, videoOverlayCanvas.width, videoOverlayCanvas.height)
	}

	function drawCorners(corners: Float64Array) {
		clearOverlay()
		const overlayCtx = videoOverlayCanvas.getContext('2d')!
		overlayCtx.beginPath()
		overlayCtx.strokeStyle = 'blue'
		overlayCtx.lineWidth = 3

		// [x1,y1,x2,y2,x3,y3,x4,y4]
		overlayCtx.moveTo(corners[0], corners[1])
		overlayCtx.lineTo(corners[2], corners[3])
		overlayCtx.lineTo(corners[4], corners[5])
		overlayCtx.lineTo(corners[6], corners[7])
		overlayCtx.lineTo(corners[0], corners[1])

		overlayCtx.stroke()
	}

	onMount(async () => {
		mapContainer.style.width = `${refIm.width}px`
		mapContainer.style.height = `${refIm.height}px`
		// outputVideo.style.width = `${outputVideo.videoWidth}px`
		// outputVideo.style.width = `${outputVideo.videoHeight}px`
		sampleImageContainer.style.width = `${sampleImage.width}px`
		sampleImageContainer.style.height = `${sampleImage.height}px`
		mapOverlayCanvas.style.height = `${refIm.height}px`
		mapOverlayCanvas.style.width = `${refIm.width}px`

		const tracker = new ImageTrackerContext(sampleImage.naturalWidth, sampleImage.naturalHeight)
		await tracker.initWasm()
		await tracker.addMapKeypointsAndDescriptors('Yehorivka')

		console.log('waiting for image to load')
		await new Promise<void>((r) => {
			if (sampleImage.complete) {
				console.log('image already loaded')
				r()
				return
			}
			sampleImage.onload = () => r()
		})
		// const matColor = await loadImage('yeho-car3-1.png')
		// const mat = new cv.Mat()
		// cv.cvtColor(matColor, mat, cv.COLOR_RGBA2GRAY, 0)
		//
		// testCanvas.width = mat.cols
		// testCanvas.height = mat.rows
		//
		// cv.imshow(testCanvas.id, mat)
		// console.log('type: ', mat.type())
		//
		const res = await tracker.resetTracking('yeho-car3-1.png')
		console.log({ res })
	})
	return (
		<div>
			<Show when={!videoLoaded()}>
				<div>loading...</div>
			</Show>
			<h1>Image Tracker</h1>

			<h2>Map</h2>
			<div ref={mapContainer} class="relative">
				<canvas ref={mapOverlayCanvas} class="absolute left-0 top-0" />
				<img ref={refIm} src="Yehorivka.png" class="absolute left-0 top-0" />
			</div>
			<h2>Video Output</h2>
			<div ref={sampleImageContainer} class="relative">
				<canvas ref={videoOverlayCanvas} class="absolute left-0 top-0" />
				<img id="sampleImage" ref={sampleImage} src="yeho-car3-1.png" />
			</div>
			<canvas ref={testCanvas} id="testcanvas" width="900" height="900" />
		</div>
	)
}

const fragment = document.createDocumentFragment()
async function loadImage(src: string) {
	const img = await new Promise<HTMLImageElement>((resolve) => {
		const img = (<img id={crypto.randomUUID()} src={src} />) as HTMLImageElement
		fragment.appendChild(img)
		img.onload = () => resolve(img)
	})
	return cv.imread(img)
}
