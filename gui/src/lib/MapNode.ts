export class MapNode {
	x: number;
	y: number
	neighbors: MapNode[] = [];

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	traverseGraph() {
		const visited = new Set<MapNode>();
		const queue: MapNode[] = [this];
		while (queue.length) {
			const currentNode = queue.shift();
			if (!currentNode) continue;
			visited.add(currentNode);
			for (const neighbor of currentNode.neighbors) {
				if (!visited.has(neighbor)) queue.push(neighbor);
			}
		}
		return visited;
	}

	// return all pairs of neighbor nodes
	traverseGraphEdges() {
		const visited = new Set<MapNode>();
		const queue: MapNode[] = [this];
		const edges: [MapNode, MapNode][] = [];
		while (queue.length) {
			const currentNode = queue.shift();
			if (!currentNode) continue;
			visited.add(currentNode);
			for (const neighbor of currentNode.neighbors) {
				if (!visited.has(neighbor)) {
					queue.push(neighbor);
					edges.push([currentNode, neighbor]);
				}
			}
		}
		return edges;
	}

	addNeighbor(n: MapNode) {
		this.neighbors.push(n);
		n.neighbors.push(this);
	}
}

export type Measurement = {
	x: number;
	y: number;
	time: number;
}

export function measurementsToNodes(records: Measurement[]): MapNode[] {
	let nodes: MapNode[] = [];
	let curr = null;
	for (let a of records) {
		const newNode = new MapNode(a.x, a.y)
		if (curr !== null) {
			curr.addNeighbor(newNode);
		}
		curr = newNode
		nodes.push(curr);
	}
	return nodes;
}
