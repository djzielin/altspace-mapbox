/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

//import { readFileSync, statSync } from 'fs';
//import { lookup as MimeLookup } from 'mime-types';
import GLTF from '@microsoft/gltf-gen/built/gen/gltf';
import {Image} from '@microsoft/gltf-gen/built/image';
import { Serializable } from '@microsoft/gltf-gen/built/serializable';
import { roundUpToNextMultipleOf4 } from '@microsoft/gltf-gen/built/util';
import * as MRE from '@microsoft/mixed-reality-extension-sdk';


export interface ImageLike {
	name?: string;
	uri?: string;
	embeddedFilePath?: string;
}

export default class MapImage extends Image {

	//public name: string;

	/**
	 * A URI to a texture, resolved by the model consumer. Don't set alongside [[embeddedFilePath]].
	 */
	//public uri: string;

	/**
	 * A path to a local texture file, resolved during serialization and packed into the model.
	 * Don't set alongside [[uri]].
	 */

	public embeddedFilePath: string;
	private embeddedFileSize2: number;

	private manualMime2: string;

	public get mimeType(): string {
		return 'image/jpeg';
	}

	public set mimeType(type: string) {
		this.manualMime2 = type;
	}

	constructor(private ImageBuffer: Buffer) {
		super();
		//this.name = init.name;
		//this.uri = init.uri;
		//this.embeddedFilePath = init.embeddedFilePath;
	}

	public serialize(document: GLTF.GlTf, data: Buffer): GLTF.GlTfId {
		MRE.log.info("app","starting serialize");

		if (this.cachedSerialId !== undefined) {
			return this.cachedSerialId;
		}

		const image: GLTF.Image = {
			name: this.name,
			uri: this.uri,
			mimeType: this.mimeType
		};

		image.bufferView = this._embedImage2(document, data);

		if (!document.images) {
			document.images = [];
		}
		document.images.push(image);

		return this.cachedSerialId = document.images.length - 1;
	}

	private _embedImage2(document: GLTF.GlTf, data: Buffer): GLTF.GlTfId {
		MRE.log.info("app","starting embedImage");
		
		let lastBV: GLTF.BufferView;
		if (document.bufferViews.length > 0) {
			lastBV = document.bufferViews[document.bufferViews.length - 1];
		}

		const bufferView: GLTF.BufferView = {
			buffer: 0,
			byteOffset: lastBV ? Math.ceil((lastBV.byteOffset + lastBV.byteLength) / 4) * 4 : 0,
			byteLength: this.embeddedFileSize2
		};

		const bufferViewData = data.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);

		// fill padding with zeros
		for (let i = roundUpToNextMultipleOf4(bufferView.byteOffset + bufferView.byteLength) - 1;
			i >= bufferView.byteOffset + bufferView.byteLength;
			i--) {
			data.writeUInt8(0, i);
		}

		this.ImageBuffer.copy(bufferViewData);

		if (!document.bufferViews) {
			document.bufferViews = [];
		}
		document.bufferViews.push(bufferView);

		return document.bufferViews.length - 1;
	}

	public getByteSize(scanId: number): number {
		if (this.scanList.includes(scanId)) {
			return 0;
		} else {
			this.scanList.push(scanId);
		}

		return this.embeddedFileSize2 = this.ImageBuffer.byteLength;
	}
}
