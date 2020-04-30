/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { Vector3 } from '@microsoft/mixed-reality-extension-sdk';
import Mapbox from './mapbox';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private assets: MRE.AssetContainer;
	private ourMap: Mapbox;

	constructor(private context: MRE.Context, private baseUrl: string) {
		MRE.log.info("app", "our constructor started");
		this.assets = new MRE.AssetContainer(context);
		this.ourMap=new Mapbox(context,this.assets);

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

	private started() {
		MRE.log.info("app", "our started callback has begun");

		this.ourMap.downloadAll().then( ()=>MRE.log.info("app","done downloading"));


		MRE.log.info("app","creating pole");
		const circle = this.assets.createCylinderMesh('circle', 1.0, 0.01, 'y', 16);
		const ourPole = MRE.Actor.Create(this.context, {
			actor: {
				name: 'the pole',
				appearance: { meshId: circle.id }
			}
		});

		/*
		setInterval(() => {			
		}, 30); //fire every 30ms		

		setInterval(() => {			
		}, 1000); //fire every 1 sec
		*/
	}
}
