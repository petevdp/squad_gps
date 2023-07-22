export class Node {
	x: number;
	y: number
	neighbors: Node[] = [];

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	traverseGraph() {
		const visited = new Set<Node>();
		const queue: Node[] = [this];
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
		const visited = new Set<Node>();
		const queue: Node[] = [this];
		const edges: [Node, Node][] = [];
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

	addNeighbor(n: Node) {
		this.neighbors.push(n);
		n.neighbors.push(this);
	}
}

export type Measurement = {
	x: number;
	y: number;
	time: number;
}

export function measurementsToNodes(records: Measurement[]): Node[] {
	let nodes: Node[] = [];
	let curr = null;
	for (let a of records) {
		const newNode = new Node(a.x, a.y)
		if (curr !== null) {
			curr.addNeighbor(newNode);
		}
		curr = newNode
		nodes.push(curr);
	}
	return nodes;
}
