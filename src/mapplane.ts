/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/* Hacking on MRE original GLTF plane to create suitable height mapped plane for Map tiles */


import { Material, MeshPrimitive, Vertex } from '@microsoft/gltf-gen';
import { Vector2, Vector3 } from '@microsoft/mixed-reality-extension-common';
import * as MRE from '@microsoft/mixed-reality-extension-sdk';

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
	public constructor(rasterDEM: number[], material: Material = null, uSegments=128, width=2) {
		super({ material });
		const vSegments=uSegments; // should be square

		if(uSegments>128) {
			MRE.log.error("app",`can't do a mesh this big! ${uSegments} x ${vSegments}`);
			return;
		}

		const forward = Vector3.Forward();
		const halfWidth = width / 2;
		const height=width; //should be square
		const halfHeight = height / 2;

		for (let u = 0; u < uSegments; u++) { //X Axis
			const uFrac = u / (uSegments-1); //was -0       
			for (let v = 0; v < vSegments; v++) { // Y Axis
				const vFrac = v / (vSegments-1); //was -0

				const demFactor=256/uSegments;
				const demIndex=(v*demFactor)*256+u*demFactor; //map from uSegments->256

				// add a vertex
				this.vertices.push(new Vertex({
					position: new Vector3(
						-halfWidth + uFrac * width,
						halfHeight - vFrac * height,
						rasterDEM[demIndex]), 
					normal: forward,
					texCoord0: new Vector2(uFrac, vFrac)
				}));

				if (u > 0 && v > 0) {
					const io = this.vertices.length - 1;
					const topLeft = io - vSegments - 1; //was -2 
					const topRight = io - 1;
					const bottomLeft = io - vSegments - 0; //was -1
					const bottomRight = io;
					this.triangles.push(topLeft, bottomLeft, bottomRight, topLeft, bottomRight, topRight);
				}
			}
		}
	}
}
