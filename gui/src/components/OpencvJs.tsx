import { getOwner, onMount, Owner } from 'solid-js'
import { Mat } from '@techstark/opencv-js'

// @ts-ignore
let cv: any

async function getCV() {
	// we have to do whatever the fuck this is to get the import working because javascript
	//@ts-ignore
	cv = await window.cv
	console.log(cv.getBuildInformation())
	return cv
}

async function process() {
	// if (!input.files || input.files?.length === 0) return

	// setImgUrl(URL.createObjectURL(input.files![0]))
	//
	// await new Promise<void>((resolve) => {
	// 	img.onload = () => resolve()
	// })

	// const blob = await fetch('/maps/maps-fullsize/Yehorivka.png').then((r) =>
	// 	r.blob()
	// )
	//
	// img.src = URL.createObjectURL(blob)
	// await new Promise<void>((resolve) => {
	// 	img.onload = () => resolve()
	// })
	// const minimap = await loadImage('/maps/map-fullsize/Yehorivka.png')
	const minimap = await loadImage('/yeho-car3-1.png')

	// await locateCar(map, frame)

	const { kps: kpsMinimap, desc: descMinimap } = fastDetect(new cv.AKAZE(), minimap)
	const outFrame = new cv.Mat()
	cv.drawKeypoints(minimap, kpsMinimap, outFrame, new cv.Scalar(0, 255, 0, 1))
	imShow('keypoints', outFrame)
	minimap.delete()
	console.log({ kpsMinimap, descMinimap })
	return

	// await imShow('base', map)
	// // to gray scale
	// const imgGray = new cv.Mat()
	// cv.cvtColor(map, imgGray, cv.COLOR_BGR2GRAY)
	// await imShow('grayscale', imgGray)
	//
	// // detect edges using Canny
	// const edges = new cv.Mat()
	// cv.Canny(imgGray, edges, 100, 100)
	// imShow('canny', edges)
	//
	// // detect faces using Haar-cascade Detection
	// const haarFaces = await detectHaarFace(img)
	// cv.imshow(this.haarFaceImgRef.current, haarFaces)

	// need to release them manually
	// map.delete()
	minimap.delete()
	// edges.delete()
	// haarFaces.delete()
}

function fastDetect(features2d: any, img: Mat) {
	const kps = new cv.KeyPointVector()
	const desc = new cv.Mat()
	features2d.detect(img, kps, new cv.Mat())
	// features2d.compute(img, kps, desc)
	return { kps, desc }
}

async function locateCar(map: Mat, frame: Mat, minMatchCount = 10) {
	map = map.clone()
	frame = frame.clone()
	const mapGray = new cv.Mat()
	const frameGray = new cv.Mat()

	cv.cvtColor(map, mapGray, cv.COLOR_RGBA2GRAY)
	cv.cvtColor(frame, frameGray, cv.COLOR_RGBA2GRAY)

	await imShow('mapGray', mapGray)
	await imShow('frameGray', frameGray)
	map.delete()
	frame.delete()

	//@ts-ignore
	const akaze = new cv.SIFT()

	const { kps: kpsFrame, desc: descFrame } = fastDetect(akaze, frameGray)
	const { kps: kpsMap, desc: descMap } = fastDetect(akaze, mapGray)
	const outFrame = new cv.Mat()
	const outMap = new cv.Mat()

	cv.drawKeypoints(frame, kpsFrame, outFrame, new cv.Scalar(0, 255, 0, 1))
	// cv.drawKeypoints(map, kpsMap, outMap, new cv.Scalar(0, 255, 0, 1))
	imShow('outFrame', outFrame)
	imShow('outMap', outMap)

	const descriptors = new cv.Mat()

	// try {
	// 	fast.detectAndCompute(frameGray, null, kpFrame, desFrame)
	// 	fast.detectAndCompute(mapGray, null, kpMap, desMap)
	// } catch (e) {
	// 	console.log(e)
	// }
	// // fast.knnMatch(desFrame, desMap, 2)
	// cv.drawMatchesKnn()
	console.log({ kpsMap, descMap, kpsFrame, descFrame })
	window.kpsMap = kpsMap
	window.descMap = descMap
	window.kpsFrame = kpsFrame
	window.descFrame = descFrame
	// const matcher = new cv.DescriptorMatcher('FlannBased')
	// console.log(matcher)
}

const fragment = document.createDocumentFragment()
let owner = null as unknown as Owner

async function loadImage(src: string) {
	const img = await new Promise<HTMLImageElement>((resolve) => {
		const img = (<img id={crypto.randomUUID()} src={src} />) as HTMLImageElement
		fragment.appendChild(img)
		img.onload = () => resolve(img)
	})
	return cv.imread(img)
}

let canvasContainer = null as unknown as HTMLDivElement

function imShow(label: string, mat: Mat) {
	const canvas = (<canvas />) as HTMLCanvasElement
	canvasContainer.appendChild((<h2 class="text-[5vh]">{label}</h2>) as HTMLHeadingElement)
	canvasContainer.appendChild(canvas)
	cv.imshow(canvas, mat)
}

export function OpencvJs() {
	owner = getOwner()!
	onMount(async () => {
		await getCV()
		try {
			await process()
		} catch (e) {
			if (typeof e === 'number') {
				throw cv.exceptionFromPtr(e)
			} else {
				throw e
			}
		}
		window.scrollTo(0, document.body.scrollHeight)
	})
	return (
		<>
			<div ref={canvasContainer} />
		</>
	)
}
