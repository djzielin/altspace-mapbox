const fs = require('fs');
const sharp = require('sharp');
const fetch = require('node-fetch');

let mapboxKey = "";

try {
	mapboxKey = fs.readFileSync('/root/mapbox_key.txt', 'utf8'); //dont store Mapbox API key in source
	console.log(mapboxKey)
} catch (err) {
	console.error(err)
}



//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
function long2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

const ourLat=25.6872739;
const ourLon=32.6201075;
const ourZoom=10; //15;

const ourX=long2tile(ourLon,ourZoom);
const ourY=lat2tile(ourLat,ourZoom);

console.log("ourLat: " + ourLat + " ourX: " + ourX);
console.log("ourLon: " + ourLon + " ourY: " + ourY);

//https://docs.mapbox.com/api/maps/#raster-tiles
async function downloadSat() {
	const res = await fetch(`https://api.mapbox.com/v4/mapbox.satellite/${ourZoom}/${ourX}/${ourY}@2x.jpg90?access_token=${mapboxKey}`);
	console.log("sat fetch returned: " + res.status)
	if(res.status!=200)
	{
		process.exit();
	}

	const dest = fs.createWriteStream('/root/altspace-mapbox/sat.jpg');
	
	return new Promise((resolve,reject) =>{
		res.body.pipe(dest)
			.on('finish', resolve())
			.on('error', reject(new Error("dumping image to disk failed")))
				.catch(error => { console.log("caught an error: " + error.message); }); 
	});
}

//https://docs.mapbox.com/help/troubleshooting/access-elevation-data/
async function downloadTerrain() {
	const res=await fetch(`https://api.mapbox.com/v4/mapbox.terrain-rgb/${ourZoom}/${ourX}/${ourY}@2x.pngraw?access_token=${mapboxKey}`);
	console.log("terrain fetch returned: " + res.status);
	if(res.status!=200)
	{
		process.exit();
	}

	const resBuffer=await res.buffer();
	const image=await sharp(resBuffer)
		.raw()
		.toBuffer();

	console.log("image is length: " + image.length);

	let minHeight=Infinity;
	let maxHeight=-1;

	for(let i=0;i<image.length;i+=4)
	{
		//documentation: height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)

		//console.log("pixel: " + image[i+0] + " " + image[i+1] + " " + image[i+2]);
		let R=image[i+0]; 
		let G=image[i+1];
		let B=image[i+2];
		let A=image[i+3];

		let height = -10000.0 + ((R * 256.0 * 256.0 + G * 256.0 + B) * 0.1);
		if(height>maxHeight)
		{
			maxHeight=height;
		}
		if(height<minHeight)
		{
			minHeight=height;
		}
	}
	console.log("terrain ranges from : " + minHeight + " to " + maxHeight);
	console.log("height delta: " + (maxHeight-minHeight));
}

//


async function downloadAll()
{
	console.log("started download");
	await downloadSat();
	await downloadTerrain();

	console.log("all downloads complete!");
}

downloadAll();
