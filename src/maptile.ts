/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import sharp from 'sharp';
import fetch from 'node-fetch';
import MapPlane from './mapplane';
import MapImage from './mapimage';
import * as GltfGen from '@microsoft/gltf-gen';

export default class MapTile {

	public rasterDEM: number[] = [];

	public satBuffer: Buffer;
	
	public minHeight = Infinity;
	public maxHeight = -1;

	private ourMapPlane: MapPlane;

	constructor(private mapboxKey: string, 
				private ourZoom: number,
				private ourTileX: number, 
				private ourTileY: number, ) {
	}
	
	/*
		https://docs.mapbox.com/api/maps/#raster-tiles
	*/
	private async downloadRaster(mapType: string, z: number, x: number, y: number, fileFormat: string) {
		MRE.log.info("app", `Downloading Raster: ${mapType} ${z}/${x}/${y}`);

		const URL = `https://api.mapbox.com/v4/${mapType}/` + //
					`${this.ourZoom}/${this.ourTileX}/${this.ourTileY}` +
					//'@2x' + //use this to get 512x512 instead of 256x256
					`${fileFormat}?access_token=${this.mapboxKey}`;
		const res = await fetch(URL);
		MRE.log.info("app", "  fetch returned: " + res.status)
		if (res.status !== 200) {
			process.exit();
		}

		const buf = await res.buffer();
		MRE.log.info("app", "  buffer size: " + buf.byteLength);
		return buf;		
	
		/*
		//if we want to dump to disk
		const dest = fs.createWriteStream('/root/altspace-mapbox/public/sat.jpg');

		return new Promise((resolve, reject) => {
			res.body.pipe(dest)
						.on('finish', ()=>resolve())
						.on('error', err=> reject(new Error(err.message)));
		});		
		*/
	}

	//https://docs.mapbox.com/help/troubleshooting/access-elevation-data/
	private async convertImageBufferToHeightArray(ourBuff: Buffer) {
	
		MRE.log.info("app", `Converting Image Buffer to Height Array`);

		const image: Buffer = await sharp(ourBuff)
			.raw()
			.toBuffer();		

		MRE.log.info("app", "  image is length: " + image.length);
		MRE.log.info("app", "  image pixels: " + image.length/4);
		MRE.log.info("app", "  image res: " + Math.sqrt(image.length/4));

		let minHeight = Infinity;
		let maxHeight = -1;

		for (let i = 0; i < image.length; i += 4) {
			//documentation: height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)

			const R = image[i + 0];
			const G = image[i + 1];
			const B = image[i + 2];
			//const A = image[i + 3];

			const height = -10000.0 + ((R * 256.0 * 256.0 + G * 256.0 + B) * 0.1);
			if (height > maxHeight) {
				maxHeight = height;
			}
			if (height < minHeight) {
				minHeight = height;
			}
			this.rasterDEM.push(height*0.0006); //TODO make this configurable (exageration amount)
		}
		MRE.log.info("app", "  terrain ranges from : " + minHeight.toFixed(2) + " to " + maxHeight.toFixed(2));
		MRE.log.info("app", "  height delta: " + (maxHeight - minHeight).toFixed(2));
	}

	public async downloadAll() {
		MRE.log.info("app", "==========" + 
							`Started tile ${this.ourZoom}/${this.ourTileX}/${this.ourTileY}` 
							+ " ==========");
		this.satBuffer = await this.downloadRaster(
			'mapbox.satellite',
			this.ourZoom,
			this.ourTileX,
			this.ourTileY,
			'.jpg90'
		);

		const demBuffer = await this.downloadRaster(
			'mapbox.terrain-rgb',
			this.ourZoom,
			this.ourTileX,
			this.ourTileY,
			'.pngraw'
		);
		await this.convertImageBufferToHeightArray(demBuffer);

		//MRE.log.info("app", "========== downloads complete! ==========");
	}	

	public GeneratePlane(tileSegs: number, tileWidth: number){

		MRE.log.info("app", "starting creation of plane for single tile");

		MRE.log.info("app", "  creating image");
		const ourImage=new MapImage(this.satBuffer);

		MRE.log.info("app", "  creating material");
		const mat = new GltfGen.Material({
			baseColorFactor: new MRE.Color4(1.0, 1.0, 1.0, 1),
			metallicFactor: 0,
			roughnessFactor: 1,
			emissiveFactor: new MRE.Color3(0.1, 0.1, 0.1),
			baseColorTexture: new GltfGen.Texture({
				source: ourImage
			}),
		});

		MRE.log.info("app", "  creating node");
		this.ourMapPlane=new MapPlane(this.rasterDEM, mat,tileSegs,tileWidth);
		
		const node = new GltfGen.Node({
			name: 'plane',
			mesh: new GltfGen.Mesh({ name: 'plane', primitives: [ this.ourMapPlane ]}),
			translation: new MRE.Vector3(0, 0, 0),
			rotation: MRE.Quaternion.FromEulerAngles(-Math.PI / 2, Math.PI, 0)
		});
		
		MRE.log.info("app", "  plane creation complete!");
		return node;
	}
}
