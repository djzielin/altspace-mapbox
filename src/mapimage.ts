/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// modified by DJZ

import GLTF from '@microsoft/gltf-gen/built/gen/gltf';
import { Image } from '@microsoft/gltf-gen/built/image';
import { roundUpToNextMultipleOf4 } from '@microsoft/gltf-gen/built/util';
import * as MRE from '@microsoft/mixed-reality-extension-sdk';

export default class MapImage extends Image {
	private embeddedBufferSize: number;

	public get mimeType(): string {
		return 'image/jpeg';
	}

	constructor(private ImageBuffer: Buffer) {
		super();
	}

	public serialize(document: GLTF.GlTf, data: Buffer): GLTF.GlTfId {
		MRE.log.info("app", "starting serialize");

		if (this.cachedSerialId !== undefined) {
			return this.cachedSerialId;
		}

		const image: GLTF.Image = {
			name: this.name,
			uri: this.uri,
			mimeType: this.mimeType
		};

		image.bufferView = this._embedBufferImage(document, data); //new DJZ - call our new embed function

		if (!document.images) {
			document.images = [];
		}
		document.images.push(image);

		return this.cachedSerialId = document.images.length - 1;
	}

	private _embedBufferImage(document: GLTF.GlTf, data: Buffer): GLTF.GlTfId {
		MRE.log.info("app", "starting embedImage");

		let lastBV: GLTF.BufferView;
		if (document.bufferViews.length > 0) {
			lastBV = document.bufferViews[document.bufferViews.length - 1];
		}

		const bufferView: GLTF.BufferView = {
			buffer: 0,
			byteOffset: lastBV ? Math.ceil((lastBV.byteOffset + lastBV.byteLength) / 4) * 4 : 0,
			byteLength: this.embeddedBufferSize
		};

		const bufferViewData = data.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength);

		// fill padding with zeros
		for (let i = roundUpToNextMultipleOf4(bufferView.byteOffset + bufferView.byteLength) - 1;
			i >= bufferView.byteOffset + bufferView.byteLength;
			i--) {
			data.writeUInt8(0, i);
		}

		this.ImageBuffer.copy(bufferViewData); //new DJZ - copy image buffer from raster fetch

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

		return this.embeddedBufferSize = this.ImageBuffer.byteLength;
	}
}
