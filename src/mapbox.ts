/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import fs from 'fs';
import MapTile from './maptile';
import * as GltfGen from '@microsoft/gltf-gen';

export default class Mapbox {
	private mapboxKey = "";
	private ourLat = 29.844006; //TODO: make this configurable (maybe using fancy implements-like?)
	private ourLon = 31.255553;

	private ourZoom = 15; //TODO: make this configurable
	private tileWidth=0.25;
	private extraTilesNorth=5;
	private extraTilesSouth=5;
	private extraTilesWest=5;
	private extraTilesEast=5;

	private centerTileX=0;
	private centerTileY=0;
	
	private ourMapTiles: MapTile[] = [];	
	private ourGLTFNodes: GltfGen.Node[] = [];

	constructor(private context: MRE.Context, private assets: MRE.AssetContainer, private server: MRE.WebHost) {
		this.loadMapboxKey();
		this.computeCenterTileNumbers();		
	}

	public async makeTiles() {
		const tilesHigh=1+this.extraTilesNorth+this.extraTilesSouth;

		for(let x=-this.extraTilesWest;x<=this.extraTilesEast;x++){
			for(let y=-this.extraTilesNorth;y<=this.extraTilesSouth;y++){
				const tileX=this.centerTileX+x;
				const tileY=this.centerTileY+y;

				const mt=new MapTile(this.mapboxKey,this.ourZoom,tileX,tileY);
				this.ourMapTiles.push(mt); //store for later

				await mt.downloadAll();
				let tileLeft: MapTile = null;
				let tileAbove: MapTile = null;

				MRE.log.info("app", "creating plane for single tile");
				MRE.log.info("app", "  offset will be: " + x + " " + -y);

				if (y !== -this.extraTilesNorth) { //if not first row, we have a tile above us
					MRE.log.info("app","  we have a tile above us");
					tileAbove = this.ourMapTiles[this.ourMapTiles.length - 2];
				}
				if (x !== -this.extraTilesWest) {  //if not first column, we have tile to our left
					MRE.log.info("app","  we have a tile to our left!");
					tileLeft = this.ourMapTiles[this.ourMapTiles.length - 1 - tilesHigh];
				}

				const node=mt.GeneratePlane(32,this.tileWidth,tileLeft,tileAbove);

				//MRE.log.info("app", "  creating GLTF factory"); //combine all tiles into one GLTF
				const gltfFactory = new GltfGen.GltfFactory([new GltfGen.Scene({
					nodes: [node]
				})]);
		
				MRE.log.info("app", "  creating tile actor");
				MRE.Actor.CreateFromGltf(this.assets, {
					uri: this.server.registerStaticBuffer(`${tileX}/${tileY}`, gltfFactory.generateGLTF()),
					actor: {
						transform: {
							local: {
								position: {x: x*this.tileWidth, y: 0, z: -y*this.tileWidth }
							}
						}
					}
				});		
			}
		}		
	}

	private loadMapboxKey() {
		try {
			this.mapboxKey = fs.readFileSync('/root/mapbox_key.txt', 'utf8'); //dont store Mapbox API key in source
		} catch (err) {
			MRE.log.error("app", "couldn't load Mapbox API key from disk. Check if file moved!");
		}
	}

	private computeCenterTileNumbers() {
		this.centerTileX = this.long2tile(this.ourLon, this.ourZoom);
		this.centerTileY = this.lat2tile(this.ourLat, this.ourZoom);
	}

	/*
		https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
	*/
	private long2tile(lon: number, zoom: number) {
		return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
	}

	private lat2tile(lat: number, zoom: number) {
		return (Math.floor(
			(1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
			/ 2 * Math.pow(2, zoom)));
	}	
}
