import { DataSet } from "vis-data";
import { fetch_data, fetch_properties } from "./api";

export type URI = string;

export type Properties = {
	[id: string]: { label: string; uri: string }[];
};

export class Node {
	id: URI;
	label: string;
	visible: boolean;
	is_fetched: boolean;
	x: number;
	y: number;

	constructor(uri: URI, label: string, visible = false, position: { x: number; y: number } = { x: 0, y: 0 }) {
		this.id = uri;
		this.label = label;
		this.visible = visible;
		this.is_fetched = false;
		this.x = position.x;
		this.y = position.y;
	}
}

export class Edge {
	from: URI;
	uri: URI;
	to: URI;
	label: string;

	constructor(source: URI, uri: URI, target: URI, label: string) {
		this.from = source;
		this.uri = uri;
		this.to = target;
		this.label = label;
	}
}

export class Graph {
	nodes: Node[];
	edges: Edge[];

	data: { nodes: DataSet<any>; edges: DataSet<any> };

	constructor() {
		this.nodes = [];
		this.edges = [];
		const data_nodes = new DataSet([]);
		const data_edges = new DataSet([]);
		this.data = { nodes: data_nodes, edges: data_edges };
		this.update_data();
	}

	is_edge_visible(edge: Edge) {
		for (let node_one of this.nodes) {
			if (node_one.id == edge.from && node_one.visible) {
				for (let node_two of this.nodes) {
					if (node_two != node_one && node_two.id == edge.to && node_two.visible) {
						return true;
					}
				}
			}
		}

		return false;
	}

	update_data() {
		const nodes = this.nodes.filter((node) => node.visible);
		const edges = this.edges.filter((edge) => this.is_edge_visible(edge));

		const old_nodes = this.data.nodes;
		const old_edges = this.data.edges;

		for (let node of nodes) {
			try {
				old_nodes.add(node);
			} catch {
				//pass
			}
		}
		for (let edge of edges) {
			try {
				old_edges.add(edge);
			} catch {
				//pass
			}
		}

		const deleted_nodes = [];
		old_nodes.forEach((node) => {
			if (!nodes.includes(node)) {
				deleted_nodes.push(node);
			}
		});

		for (let node of deleted_nodes) {
			old_nodes.remove(node);
		}

		const deleted_edges = [];
		old_edges.forEach((edge) => {
			if (!edges.includes(edge)) {
				deleted_edges.push(edge);
			}
		});

		for (let edge of deleted_edges) {
			old_edges.remove(edge);
		}

		return this.data;
	}

	find_or_create_node(
		uri: URI,
		label: string,
		visible = false,
		position: {
			x: number;
			y: number;
		} = { x: 0, y: 0 }
	) {
		let node = this.nodes.find((node) => node.id == uri);
		if (!node) {
			node = new Node(uri, label, visible, position);
			this.nodes.push(node);
		}
		return node;
	}

	create_edge(source: URI, uri: URI, target: URI, label: string) {
		if (this.edges.find((edge) => edge.from == source && edge.uri == uri && edge.to == target)) {
			return false;
		}
		const edge = new Edge(source, uri, target, label);
		this.edges.push(edge);

		return true;
	}

	async load_properties(uri: URI) {
		const triples = await fetch_properties(uri);
		if (triples.length > 0) {
			const node = this.find_or_create_node(uri, triples[0].s.label, true);
			node.is_fetched = true;
		}
		for (let triple of triples) {
			this.find_or_create_node(triple.o.value, triple.o.label);
			this.create_edge(uri, triple.p.value, triple.o.value, triple.p.label);
		}
	}

	async get_properties(uri: URI) {
		const node = this.find_or_create_node(uri, "", true);
		if (!node.is_fetched) {
			await this.load_properties(node.id);
		}

		const property_edges = this.edges.filter((edge) => edge.from == uri || edge.to == uri);

		const properties: Properties = {};

		for (let edge of property_edges) {
			if (!properties[edge.uri]) {
				properties[edge.uri] = [{ label: edge.label, uri: edge.uri }];
			} else {
				properties[edge.uri].push({ label: edge.label, uri: edge.uri });
			}
		}

		/* const properties = property_edges.map((p) => {
			return { label: p.label, uri: p.uri };
		}); */
		return properties;
	}

	async load_data(
		uri: string,
		property: string,
		position: {
			x: number;
			y: number;
		} = { x: 0, y: 0 }
	) {
		const triples = await fetch_data(uri, property);

		for (let triple of triples) {
			const node = this.find_or_create_node(triple.o.value, triple.o.label, true, position);
			node.x = position.x;
			node.y = position.y;
			node.visible = true;

			this.create_edge(uri, property, triple.o.value, triple.p.label);
		}

		this.update_data();
	}
}