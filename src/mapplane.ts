/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Material, MeshPrimitive, Vertex } from '@microsoft/gltf-gen';
import { Vector2, Vector3 } from '@microsoft/mixed-reality-extension-common';

/**
 * A MeshPrimitive prepopulated with a subdivided +Z-facing plane's vertices and triangles
 */
export default class MapPlane extends MeshPrimitive {
	/**
	 * Build quad geometry
	 * @param width The size of the plane along the X axis
	 * @param height The size of the plane along the Y axis
	 * @param uSegments The number of subdivisions along the X axis
	 * @param vSegments The number of subdivisions along the Y axis
	 * @param material An initial material to apply to the plane
	 */
	public constructor(rasterDEM: number[], material: Material = null) {
		super({ material });

		const forward = Vector3.Forward();

		const width=2;
		const halfWidth = width / 2;
		const height=width; //should be square
		const halfHeight = height / 2;

		const uSegments=127; //can't do more then this in single mesh (probably over 65k limit)
		const vSegments=uSegments; // should be square

		const heightScaler=0.0006;//TOOD: make this configurable

		for (let u = 0; u <= uSegments; u++) { //X Axis
			const uFrac = u / uSegments;       
			for (let v = 0; v <= vSegments; v++) { // Y Axis
				const vFrac = v / vSegments;

				const demIndex=(v*2)*256+u*2; //map from 128->256

				// add a vertex
				this.vertices.push(new Vertex({
					position: new Vector3(
						-halfWidth + uFrac * width,
						halfHeight - vFrac * height,
						rasterDEM[demIndex]*heightScaler), 
					normal: forward,
					texCoord0: new Vector2(uFrac, vFrac)
				}));

				if (u > 0 && v > 0) {
					const io = this.vertices.length - 1;
					// (vSegments - 1) verts per stripe
					const topLeft = io - vSegments - 2;
					const topRight = io - 1;
					const bottomLeft = io - vSegments - 1;
					const bottomRight = io;
					this.triangles.push(topLeft, bottomLeft, bottomRight, topLeft, bottomRight, topRight);
				}
			}
		}
	}
}
