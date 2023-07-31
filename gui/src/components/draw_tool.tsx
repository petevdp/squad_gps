import type {Component} from 'solid-js';
import narvaImgPath from '../assets/narva.png'

import logo from './logo.svg';
import styles from './App.module.css';
import {onMount} from "solid-js";

export const DrawTool: Component = () => {
	const canvas = <canvas onmousedown={onMouseDown} onmousemove={drawLine} oncontextmenu={onContextMenu} width="1500"
												 height="1500"
												 style="border:1px solid #000000;"></canvas> as HTMLCanvasElement;;
	const context = canvas.getContext('2d');
	const image = new Image();

	let currentNode: Node | null = null;
	const nodesByCoords = new Map<string, Node>();

	let mode: Mode = "select";
	let startPoint = null;
	let endPoint = null;

	onMount(() => {

		// @ts-ignore
		image.src = narvaImgPath;
		image.onload = function () {
			context.drawImage(image, 0, 0);
		};
	});

	function onMouseDown(event: any) {
		if (mode === "select") {
			startPoint = getMousePosition(event);
			appendNode(startPoint.x, startPoint.y);
			mode = "draw";
		} else if (mode === "draw") {
			endPoint = getMousePosition(event);
			appendNode(endPoint.x, endPoint.y);
		}
	}

	function appendNode(x: number, y: number) {
		const newNode = new Node(Math.round(x), Math.round(y));
		if (currentNode) {
			newNode.neighbors.push(currentNode);
			currentNode.neighbors.push(newNode);
		}
		currentNode = newNode;
		redrawCanvas()
	}

	function drawLine(event: any) {
		if (mode !== "draw") return;
		endPoint = getMousePosition(event);
	}

	function getMousePosition(event: any) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	function onContextMenu() {
		if (mode !== "draw") return;
		if (startPoint == null || endPoint == null) return;
		appendNode(endPoint.x, endPoint.y);
		startPoint = null;
		endPoint = null;
		mode = "select";
	}

	function redrawCanvas() {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(image, 0, 0);

		console.log({currentNode})
		if (currentNode === null) return;
		let traverseGraphEdges = currentNode.traverseGraphEdges();
		console.log({traverseGraphEdges});
		for (let [a, b] of traverseGraphEdges) {
			context.beginPath();
			context.strokeStyle = 'red';
			context.lineWidth = 2;
			context.moveTo(a.x, a.y);
			context.lineTo(b.x, b.y);
			context.stroke();
		}
	}

	return (
		<div class={styles.App}>
			{canvas}
		</div>
	);
};

type Mode = "draw" | "select" | "erase"


