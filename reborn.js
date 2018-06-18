function init(){

    renderer = new THREE.WebGLRenderer();

    renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById('container').appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 10000 );

	camera.position.set(0, 0, -5);
    camera.lookAt(scene.position);

    scene.add(camera);

	var material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

    renderer.render( scene, camera );
}


var currentTimestamp; //currentTimestamp
var cloudDataBuffer = "";  //current data buffer
var isRenderingReady = true; //true if rendering method is ready to process a new set of data
var timestampLength;

//Store cloud data while timestamp is the same
function handleCloudData(data){
	
	timestampLength = data.indexOf(';');

	trameTimestamp = Number(data.substring(0,timestampLength));
	if(!currentTimestamp)//sur la première trame reçue
		currentTimestamp=trameTimestamp;

	if(trameTimestamp == currentTimestamp){
		cloudDataBuffer += data.substring(timestampLength);
	}
	else{
		synchronousCloud(cloudDataBuffer);
		//arrayOfDataReadyToRender.push(cloudDataBuffer);
		cloudDataBuffer = data.substring(timestampLength+2);
		currentTimestamp = trameTimestamp;
	}
	
}

function parseColorFromData(data){
	var arrayOfCoordinates = data.split(";");
	while((arrayOfCoordinates.length)%6 !=0){
		arrayOfCoordinates.push("255");
	}
	var array = new Float32Array(arrayOfCoordinates.length/2);
	var index = 0;
	for(let i=0; i< arrayOfCoordinates.length-6; i=i+6){
		array[index] = parseFloat(arrayOfCoordinates[i+3])/255;//R
		index++;
		array[index] = parseFloat(arrayOfCoordinates[i+4])/255;//G
		index++;
		array[index] = parseFloat(arrayOfCoordinates[i+5])/255;//B
		index++;
	}
	return array;
}

function parseCoordinatesFromData(data){

	var arrayOfCoordinates = data.split(";");
	while((arrayOfCoordinates.length)%6 !=0){
		arrayOfCoordinates.push("0");
	}
	
	var array = new Float32Array(arrayOfCoordinates.length/2);
	var index = 0;
	for(let i=0; i< arrayOfCoordinates.length-6; i=i+6){
		//X
		array[index] = parseFloat(arrayOfCoordinates[i]) || 0;

		index++;
		//Y
		array[index] = parseFloat(arrayOfCoordinates[i+1])|| 0;

		index++;
		//Z
		array[index] = parseFloat(arrayOfCoordinates[i+2])|| 0;

		index++;
	}
	
	return array;
}


function synchronousCloud(data){
	//console.log("Starting rendering cubes using one synchronousCloud");
	//Starting new rendering so not ready to process another set of data
	isRenderingReady = false;
	var material = new THREE.PointsMaterial({
		size:0.05,
		transparent: true,
		opacity: 0.9,
		color: 'white',
		vertexColors: THREE.VertexColors});
	let startMethod, endMethod, parsedData;
	startMethod = performance.now();
	geometry = new THREE.BufferGeometry();//Globale pour le moment pour le debug
	//On parse d'abord les coordinates
	var promiseParseCoordinate = new Promise(function(resolve,reject){
		parsedData = parseCoordinatesFromData(data)
		resolve(parsedData);
		//console.log("J'ai parse les coord");
		//console.log(parsedData);
		return parsedData;
	});
	//On parse ensuite les couleurs
	promiseParseCoordinate.then(function(parsedData){
		parsedColors = parseColorFromData(data);
		//console.log("J'ai parse les colors");
		return parsedColors;
	})	
	//On ajoute les points et les couleurs à la geometry 
	.then(function(parsedColors){
		
		//console.log("Colors:");
		//console.log(parsedColors);
		geometry.addAttribute('position', new THREE.BufferAttribute(parsedData, 3));//debug
		geometry.addAttribute('color', new THREE.BufferAttribute(parsedColors, 3));//debug
		
		cloudPoints = new THREE.Points(geometry,material);
		//cloudPoints = new THREE.Mesh(geometry);
		return cloudPoints;
	})
	//On refresh la scene puis on ajoute notre cloud
	.then(function(cloudPoints){
		myScene = new THREE.Scene();
		myScene.add(cloudPoints);
		renderer.render( myScene, camera );
		endMethod = performance.now();
		//console.log("Method took "+(endMethod - startMethod)+"ms");
		
		//Rendering is finished, method is ready to process new set of data
		isRenderingReady = true;
	});
}