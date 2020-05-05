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


/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private assets: MRE.AssetContainer;
	private ourMap: Mapbox;

	constructor(private context: MRE.Context, private server: MRE.WebHost) {
		MRE.log.info("app", "our constructor started");
		this.assets = new MRE.AssetContainer(context);

		this.ourMap = new Mapbox(context, this.assets, this.server);

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

		this.ourMap.makeTiles().then(() => {
			MRE.log.info("app","tiles all loaded!");
		});
	}
}
