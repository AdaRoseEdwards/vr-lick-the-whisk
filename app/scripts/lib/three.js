/* global THREE, DeviceOrientationController */
'use strict';
const EventEmitter = require('fast-event-emitter');
const util = require('util');
const TWEEN = require('tween.js');

const materials = {
	boring2: new THREE.MeshPhongMaterial( { color: 0xC0B9BB, specular: 0, shading: THREE.FlatShading, side: THREE.DoubleSide, transparent: true, opacity: 0.2 } ),
	wireframe: new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: true } )
};

var l = new THREE.ObjectLoader();
const loadScene = (id) => new Promise(function (resolve, reject) {
	l.load('models/' + id + '.json', resolve, undefined, reject);
});

function pickObjects(root, ...namesIn) {

	const collection = {};
	const names = new Set(namesIn);

	(function pickObjects(root) {
		if (root.children) {
			root.children.forEach(node => {
				if (names.has(node.name)) {
					collection[node.name] = node;
					names.delete(node.name);
				}
				if (names.size) {
					pickObjects(node);
				}
			});
		}
	})(root);

	if (names.size) {
		console.warn('Not all objects found: ' + names.values().next().value + ' missing');
	}

	return collection;
}

function myThreeFromJSON(id, target) {
	return loadScene(id).then(s => new MyThree(s, target));
}

function MyThree(scene, target = document.body){

	EventEmitter.call(this);

	this.scene = scene || new THREE.Scene();

	let camera = pickObjects(this.scene, 'Camera').Camera;

	if (!camera) {
		console.log(camera);
		camera = new THREE.PerspectiveCamera( 75, target.scrollWidth / target.scrollHeight, 0.5, 100 );
		camera.position.set(0, 2, 0);
		camera.lookAt(new THREE.Vector3(0, camera.height, -9));
		camera.rotation.y += Math.PI;
	}
	camera.height = camera.position.y; // reference value for how high the camera should be
									   // above the ground to maintain the illusion of presence
	camera.fov = 75;

	this.camera = camera;

	const hud = new THREE.Object3D();
	hud.position.set(0, 0, -2.1);
	hud.scale.set(0.2, 0.2, 0.2);
	camera.add(hud);
	scene.add(camera);
	this.hud = hud;

	const renderer = new THREE.WebGLRenderer( { antialias: false } );
	renderer.setPixelRatio( window.devicePixelRatio );
	
	this.renderMethod = renderer;
	
	const setAspect = () => {
		this.renderMethod.setSize( target.scrollWidth, target.scrollHeight );
		camera.aspect = target.scrollWidth / target.scrollHeight;
		camera.updateProjectionMatrix();
	};
	window.addEventListener('resize', setAspect);
	setAspect();

	target.appendChild(renderer.domElement);
	this.domElement = renderer.domElement;
	this.domElement.style.position = 'fixed';

	this.materials = materials;

	const physicsObjects = [];
	const threeObjectsConnectedToPhysics = {};
	this.updateObjects = newObjects => {
		physicsObjects.splice(0);
		physicsObjects.push.apply(physicsObjects, newObjects);
	};

	this.on('prerender', function updatePositions() {

		const l = physicsObjects.length;

		// iterate over the physics physicsObjects
		for ( let j=0; j<l;j++ ) {

			const i = physicsObjects[j];
			if (threeObjectsConnectedToPhysics[i.id]) {

				const o = threeObjectsConnectedToPhysics[i.id];

				// Support maniplating a single vertex
				if (o.constructor === THREE.Vector3) {
					o.set(i.position.x, i.position.y, i.position.z);
					continue;
				}

				o.position.set(i.position.x, i.position.y, i.position.z);

				// Rotation
				if (i.quaternion) {
					o.rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
				}
			}
		}
	});

	this.on('prerender', TWEEN.update);

	this.connectPhysicsToThree = (mesh, physicsMesh) => {
		threeObjectsConnectedToPhysics[physicsMesh.id] = mesh;
		if (mesh.constructor === THREE.Vector3) return;
		scene.add(mesh);
	};

	// Useful for debugging
	this.createSphere = (radius) => {
		const geometry = new THREE.SphereGeometry(radius || 1, 8, 5);
		const mesh = new THREE.Mesh(geometry, materials.wireframe);
		return mesh;
	};

	this.walkTo = (destination) => {
		new TWEEN.Tween( camera.position )
			.to( destination, 2000 )
			.easing( TWEEN.Easing.Quadratic.Out )
			.onUpdate( function () {
				camera.position.set(this.x, this.y, this.z);
			})
			.start();
	};

	this.getCameraPositionAbove = function (point, ...objects) {
		const raycaster = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0), 0, 20);
		const hits = raycaster.intersectObjects(objects);
		if (!hits.length) {
			return Promise.reject();
		} else {
			hits[0].point.y += camera.height;
			return Promise.resolve(hits[0].point);
		}
	};

	this.pickObjects = pickObjects;


	this.useCardboard = () => {

		const effect = new THREE.StereoEffect(renderer);
		setAspect();
		effect.eyeSeparation = 0.008;
		effect.focalLength = 0.25;
		effect.setSize( window.innerWidth, window.innerHeight );
		this.renderMethod = effect;
	};

	this.useSky = () => {
		const skyBox = require('./sky')();
		this.skyBox = skyBox;
		scene.add(skyBox);
		skyBox.scale.multiplyScalar(0.00004);
	};

	this.deviceOrientation = ({manualControl}) => {

		// provide dummy element to prevent touch/click hijacking.
		const element = manualControl ? renderer.domElement : document.createElement("DIV");

		if (this.deviceOrientationController) {
			this.deviceOrientationController.disconnect();
			this.deviceOrientationController.element = element;
			this.deviceOrientationController.connect();
		} else {
			this.deviceOrientationController = new DeviceOrientationController(camera, element);
			this.deviceOrientationController.connect();
			this.on('prerender', () => this.deviceOrientationController.update());
		}
	};

	this.render = () => {

		// note: three.js includes requestAnimationFrame shim
		this.emit('prerender');
		this.renderMethod.render(scene, camera);
	};
}
util.inherits(MyThree, EventEmitter);

module.exports.MyThree = MyThree;
module.exports.myThreeFromJSON = myThreeFromJSON;
