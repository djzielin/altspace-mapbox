/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { Vector3, log } from '@microsoft/mixed-reality-extension-sdk';
import fs from 'fs';
import sharp from 'sharp';
import fetch from 'node-fetch';

export default class Mapbox {
	private mapboxKey = "";
	private ourLat = 29.844006; //TODO make this configurable
	private ourLon = 31.255553;

	private ourZoom = 10; //15;
	private ourTileX = 0;
	private ourTileY = 0;
	public rasterDEM: number[] = [];
	public satBuffer: Buffer;
	
	public minHeight = Infinity;
	public maxHeight = -1;

	constructor(private context: MRE.Context, private assets: MRE.AssetContainer) {
		this.loadMapboxKey();
	}

	private loadMapboxKey() {
		try {
			this.mapboxKey = fs.readFileSync('/root/mapbox_key.txt', 'utf8'); //dont store Mapbox API key in source
		} catch (err) {
			MRE.log.error("app", "couldn't load Mapbox API key from disk. Check if file moved!");
		}
	}

	private computeTileNumbers() {
		this.ourTileX = this.long2tile(this.ourLon, this.ourZoom);
		this.ourTileY = this.lat2tile(this.ourLat, this.ourZoom);
	}

	//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
	private long2tile(lon: number, zoom: number) {
		return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
	}

	private lat2tile(lat: number, zoom: number) {
		return (Math.floor(
			(1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
			/ 2 * Math.pow(2, zoom)));
	}

	//https://docs.mapbox.com/api/maps/#raster-tiles
	private async downloadSat() {
		MRE.log.info("app", "Downloading Sat");
		const URL = 'https://api.mapbox.com/v4/mapbox.satellite/' +
					`${this.ourZoom}/${this.ourTileX}/${this.ourTileY}` +
					//'@2x' + //use this to get 512x512 instead of 256x256
					`.jpg90?access_token=${this.mapboxKey}`;
		const res = await fetch(URL);
		MRE.log.info("app", "  sat fetch returned: " + res.status)
		if (res.status !== 200) {
			process.exit();
		}

		this.satBuffer = await res.buffer();
		

		MRE.log.info("app", "  sat buffer size: " + this.satBuffer.byteLength);
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
	private async downloadTerrain() {
		MRE.log.info("app", "Downloading Terrain");
		const URL = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/' +
					`${this.ourZoom}/${this.ourTileX}/${this.ourTileY}` +
					//'@2x' + //use this to get 512x512 instead of 256x256
					`.pngraw?access_token=${this.mapboxKey}`; 
					
		const res = await fetch(URL);
		MRE.log.info("app", "  terrain fetch returned: " + res.status);
		if (res.status !== 200) {
			process.exit();
		}

		const resBuffer: Buffer = await res.buffer();
		const image: Buffer = await sharp(resBuffer)
			.raw()
			.toBuffer();

		MRE.log.info("app", "  image is length: " + image.length);
		MRE.log.info("app", "  image pixels: " + image.length/4);
		MRE.log.info("app", "  image res: " + Math.sqrt(image.length/4));

		let minHeight = Infinity;
		let maxHeight = -1;

		for (let i = 0; i < image.length; i += 4) {
			//documentation: height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)

			//console.log("pixel: " + image[i+0] + " " + image[i+1] + " " + image[i+2]);
			let R = image[i + 0];
			let G = image[i + 1];
			let B = image[i + 2];
			let A = image[i + 3];

			const height = -10000.0 + ((R * 256.0 * 256.0 + G * 256.0 + B) * 0.1);
			if (height > maxHeight) {
				maxHeight = height;
			}
			if (height < minHeight) {
				minHeight = height;
			}
			this.rasterDEM.push(height);
		}
		MRE.log.info("app", "  terrain ranges from : " + minHeight + " to " + maxHeight);
		MRE.log.info("app", "  height delta: " + (maxHeight - minHeight));
	}

	public async downloadAll() {
		this.computeTileNumbers();

		MRE.log.info("app", "started download");
		await this.downloadSat();
		await this.downloadTerrain();	
		MRE.log.info("app", "all downloads complete!");
	}
}
