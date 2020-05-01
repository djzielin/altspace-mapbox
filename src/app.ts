/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// modified by DJZ
// TODO: add mapbox attribution 
//    https://docs.mapbox.com/help/how-mapbox-works/attribution/


import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { Vector3 } from '@microsoft/mixed-reality-extension-sdk';
import Mapbox from './mapbox';
import MapPlane from './mapplane';
import MapImage from './mapimage';
import * as GltfGen from '@microsoft/gltf-gen';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private assets: MRE.AssetContainer;
	private ourMap: Mapbox;

	constructor(private context: MRE.Context, private server: MRE.WebHost) {
		MRE.log.info("app", "our constructor started");
		this.assets = new MRE.AssetContainer(context);
		this.ourMap = new Mapbox(context, this.assets);

		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));
		this.context.onUserJoined(user => this.userJoined(user));
	}

	private userJoined(user: MRE.User) {
		MRE.log.info("app", "user joined. name: " + user.name + " id: " + user.id);
	}

	private userLeft(user: MRE.User) {
		MRE.log.info("app", "user left. name: " + user.name + " id: " + user.id);
	}

	private Vector2String(v: Vector3, precision: number) {
		return "{X: " + v.x.toFixed(precision) +
			" Y: " + v.y.toFixed(precision) +
			" Z: " + v.z.toFixed(precision) + "}";
	}

	private createMapPlane() {
		MRE.log.info("app", "starting creation of plane for map");

		MRE.log.info("app", "  creating image");
		const ourImage=new MapImage(this.ourMap.satBuffer);

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
		const plane = new GltfGen.Node({
			name: 'plane',
			mesh: new GltfGen.Mesh({ name: 'plane', primitives: [new MapPlane(this.ourMap.rasterDEM, mat)] }),
			translation: new MRE.Vector3(0, 0, 0),
			rotation: MRE.Quaternion.FromEulerAngles(-Math.PI / 2, Math.PI, 0)
		});

		MRE.log.info("app", "  creating factory");
		const gltfFactory = new GltfGen.GltfFactory([new GltfGen.Scene({
			nodes: [plane]
		})]);

		MRE.log.info("app", "  creating actor");
		MRE.Actor.CreateFromGltf(this.assets, {
			uri: this.server.registerStaticBuffer('test.glb', gltfFactory.generateGLTF()),
			actor: {
				//parentId: root.id,
				transform: {
					local: {
						position: { y: 0, z: 0 }
					}
				}
			}
		});
		MRE.log.info("app", "  plane creation complete!");
	}

	private started() {
		MRE.log.info("app", "our started callback has begun");

		this.ourMap.downloadAll().then(() => {
			this.createMapPlane();
		});
	}
}
