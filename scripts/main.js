(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Sets up an enviroment for detecting that 
 * the camera is looking at objects.
 */

'use strict';
var EventEmitter = require('fast-event-emitter');
var util = require('util');

/*global THREE*/
/**
 * Keeps track of interactive 3D elements and 
 * can be used to trigger events on them.
 *
 * The domElement is to pick up touch ineractions
 * 
 * @param  {[type]} domElement [description]
 * @return {[type]}            [description]
 */
module.exports = function CameraInteractivityWorld(domElement) {
	var _this2 = this;

	function InteractivityTarget(node) {
		var _this = this;

		EventEmitter.call(this);

		this.position = node.position;
		this.hasHover = false;
		this.object3d = node;

		this.on('hover', function () {
			if (!_this.hasHover) {
				_this.emit('hoverStart');
			}
			_this.hasHover = true;
		});

		this.on('hoverOut', function () {
			_this.hasHover = false;
		});

		this.hide = function () {
			_this.object3d.visible = false;
		};

		this.show = function () {
			_this.object3d.visible = true;
		};
	}
	util.inherits(InteractivityTarget, EventEmitter);

	this.targets = new Map();

	this.detectInteractions = function (camera) {

		var raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
		var hits = raycaster.intersectObjects(Array.from(this.targets.values()).map(function (target) {
			return target.object3d;
		}).filter(function (object3d) {
			return object3d.visible;
		}));

		var target = false;

		if (hits.length) {

			// Show hidden text object3d child
			target = this.targets.get(hits[0].object);
			if (target) target.emit('hover');
		}

		// if it is not the one just marked for highlight
		// and it used to be highlighted un highlight it.
		Array.from(this.targets.values()).filter(function (eachTarget) {
			return eachTarget !== target;
		}).forEach(function (eachNotHit) {
			if (eachNotHit.hasHover) eachNotHit.emit('hoverOut');
		});
	};

	var interact = function interact(event) {
		Array.from(_this2.targets.values()).forEach(function (target) {
			if (target.hasHover) {
				target.emit(event.type);
			}
		});
	};
	this.interact = interact;

	domElement.addEventListener('click', interact);
	domElement.addEventListener('mousedown', interact);
	domElement.addEventListener('mouseup', interact);
	domElement.addEventListener('touchup', interact);
	domElement.addEventListener('touchdown', interact);

	this.makeTarget = function (node) {
		var newTarget = new InteractivityTarget(node);
		_this2.targets.set(node, newTarget);
		return newTarget;
	};
};

},{"fast-event-emitter":12,"util":11}],2:[function(require,module,exports){
'use strict';

function addScript(url) {
	return new Promise(function (resolve, reject) {
		var script = document.createElement('script');
		script.setAttribute('src', url);
		document.head.appendChild(script);
		script.onload = resolve;
		script.onerror = reject;
	});
}

module.exports = addScript;

},{}],3:[function(require,module,exports){
// From http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
/*global THREE*/
'use strict';

function makeTextSprite(message, parameters) {
	if (parameters === undefined) parameters = {};

	var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";

	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 2;

	// may tweaked later to scale text
	var size = parameters.hasOwnProperty("size") ? parameters["size"] : 1;

	var canvas1 = document.createElement('canvas');
	var context1 = canvas1.getContext('2d');
	var height = 256;

	function setStyle(context) {

		context.font = "Bold " + (height - borderThickness) + "px " + fontface;
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		context.lineWidth = borderThickness;

		// text color
		context.strokeStyle = "rgba(255, 255, 255, 1.0)";
		context.fillStyle = "rgba(0, 0, 0, 1.0)";
	}

	setStyle(context1);

	var canvas2 = document.createElement('canvas');

	// Make the canvas width a power of 2 larger than the text width
	var measure = context1.measureText(message);
	canvas2.width = Math.pow(2, Math.ceil(Math.log2(measure.width)));
	canvas2.height = height;
	console.log(measure);
	var context2 = canvas2.getContext('2d');

	context2.rect(0, 0, canvas2.width, canvas2.height);
	context2.fillStyle = "red";
	context2.fill();

	setStyle(context2);

	context2.strokeText(message, canvas2.width / 2, canvas2.height / 2);
	context2.fillText(message, canvas2.width / 2, canvas2.height / 2);

	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas2);
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
	var sprite = new THREE.Sprite(spriteMaterial);

	var maxWidth = height * 4;

	if (canvas2.width > maxWidth) size *= maxWidth / canvas2.width;
	console.log(canvas2.width, canvas2.height);

	// get size data (height depends only on font size)
	sprite.scale.set(size * canvas2.width / canvas2.height, size, 1);
	return sprite;
}

module.exports = makeTextSprite;

},{}],4:[function(require,module,exports){
// Based on https://stemkoski.github.io/Three.js/Texture-Animation.html
/*global THREE*/
'use strict';
var util = require('util');
var EventEmitter = require('fast-event-emitter');

function TextureAnimator(texture, tilesHoriz, tilesVert, numTiles) {
	EventEmitter.call(this);
	// note: texture passed by reference, will be updated by the update function.

	texture.flipY = false;
	this.currentTile = 0;
	this.tilesHorizontal = tilesHoriz;
	this.tilesVertical = tilesVert;
	// how many images does this spritesheet contain?
	//  usually equals tilesHoriz * tilesVert, but not necessarily,
	//  if there at blank tiles at the bottom of the spritesheet.
	this.numberOfTiles = numTiles;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1 / this.tilesHorizontal, 1 / this.tilesVertical);

	this.update = function () {
		this.currentTile = this.currentTile + 1;
		if (this.currentTile >= this.numberOfTiles) {
			this.currentTile = 0;
			this.emit('finish');
		}

		var currentColumn = this.currentTile % this.tilesHorizontal;
		texture.offset.x = currentColumn / this.tilesHorizontal;
		var currentRow = Math.floor(this.currentTile / this.tilesHorizontal);
		texture.offset.y = currentRow / this.tilesVertical;
	};
	this.update();
}

util.inherits(TextureAnimator, EventEmitter);
module.exports = TextureAnimator;

},{"fast-event-emitter":12,"util":11}],5:[function(require,module,exports){
/* global THREE, DeviceOrientationController */
'use strict';
var EventEmitter = require('fast-event-emitter');
var util = require('util');

/**
 * Use the json loader to load json files from the default location
 */

var l = new THREE.ObjectLoader();
var loadScene = function loadScene(id) {
	return new Promise(function (resolve, reject) {
		l.load('models/' + id + '.json', resolve, undefined, reject);
	});
};

/**
 * Helper for picking objects from a scene
 * @param  {Object3d}    root    root Object3d e.g. a scene or a mesh
 * @param  {...string} namesIn list of namesd to find e.g. 'Camera' or 'Floor'
 * @return {Object map}          map of names to objects {'Camera': (THREE.Camera with name Camera), 'Floor': (THREE.Mesh with name Floor)}
 */
function pickObjectsHelper(root) {

	var collection = {};

	for (var _len = arguments.length, namesIn = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		namesIn[_key - 1] = arguments[_key];
	}

	var names = new Set(namesIn);

	(function pickObjects(root) {
		if (root.children) {
			root.children.forEach(function (node) {
				if (names.has(node.name)) {
					collection[node.name] = node;
					names['delete'](node.name);
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

/**
 * Load the scene with file name id and return the helper
 */
function myThreeFromJSON(id, options) {
	return loadScene(id).then(function (scene) {
		options.scene = scene;
		return new MyThreeHelper(options);
	});
}

/**
 * Helper object with some useful three functions
 * @param options
 *        scene: scene to use for default
 *        target: where in the dom to put the renderer
 *        camera: name of camera to use in the scene
 */
function MyThreeHelper(options) {
	var _this = this;

	EventEmitter.call(this);

	options.target = options.target || document.body;

	var renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.setPixelRatio(window.devicePixelRatio);

	options.target.appendChild(renderer.domElement);
	this.domElement = renderer.domElement;

	/**
  * Set up stereo effect renderer
  */

	var effect = new THREE.StereoEffect(renderer);
	effect.eyeSeparation = 0.008;
	effect.focalLength = 0.25;
	effect.setSize(window.innerWidth, window.innerHeight);
	this.renderMethod = effect;

	/**
  * Set up the scene to be rendered or create a new one
  */

	this.scene = options.scene || new THREE.Scene();

	/**
  * Set up camera either one from the scene or make a new one
  */

	var camera = options.camera ? pickObjectsHelper(this.scene, options.camera).Camera : undefined;

	if (!camera) {
		console.log(camera);
		camera = new THREE.PerspectiveCamera(75, options.target.scrollWidth / options.target.scrollHeight, 0.5, 100);
		camera.position.set(0, 2, 0);
		camera.lookAt(new THREE.Vector3(0, camera.height, -9));
		camera.rotation.y += Math.PI;
	}
	camera.height = camera.position.y; // reference value for how high the camera should be
	// above the ground to maintain the illusion of presence
	camera.fov = 75;

	this.camera = camera;

	/**
  * Handle window resizes/rotations
  */

	var setAspect = function setAspect() {
		_this.renderMethod.setSize(options.target.scrollWidth, options.target.scrollHeight);
		_this.camera.aspect = options.target.scrollWidth / options.target.scrollHeight;
		_this.camera.updateProjectionMatrix();
	};
	window.addEventListener('resize', setAspect);
	setAspect();

	/**
  * Set up head tracking
  */

	// provide dummy element to prevent touch/click hijacking.
	var element = location.hostname !== 'localhost' ? document.createElement("DIV") : undefined;
	this.deviceOrientationController = new DeviceOrientationController(this.camera, element);
	this.deviceOrientationController.connect();
	this.on('prerender', function () {
		return _this.deviceOrientationController.update();
	});

	/**
  * This should be called in the main animation loop
  */

	this.render = function () {
		_this.emit('prerender');
		_this.renderMethod.render(_this.scene, camera);
		_this.emit('postrender');
	};

	/**
  * Heads up Display
  * 
  * Add a heads up display object to the camera
  * Meshes and Sprites can be added to this to appear to be close to the user.
  */

	var hud = new THREE.Object3D();
	hud.position.set(0, 0, -2.1);
	hud.scale.set(0.2, 0.2, 0.2);
	camera.add(hud);
	this.scene.add(this.camera); // add the camera to the scene so that the hud is rendered
	this.hud = hud;

	/**
  * ANIMATION
  * 
  * A map of physics object id to three.js object 3d so we can update all the positions
  */

	var threeObjectsConnectedToPhysics = {};
	this.updateObjects = function (physicsObjects) {
		var l = physicsObjects.length;

		// iterate over the physics physicsObjects
		for (var j = 0; j < l; j++) {

			var i = physicsObjects[j];
			if (threeObjectsConnectedToPhysics[i.id]) {

				var o = threeObjectsConnectedToPhysics[i.id];

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
	};

	this.connectPhysicsToThree = function (mesh, physicsMesh) {
		threeObjectsConnectedToPhysics[physicsMesh.id] = mesh;
		if (mesh.constructor === THREE.Vector3) return;
		_this.scene.add(mesh);
	};

	/**
  * Make the object picker available on this object
  */

	this.pickObjectsHelper = pickObjectsHelper;
}
util.inherits(MyThreeHelper, EventEmitter);

module.exports.MyThreeHelper = MyThreeHelper;
module.exports.myThreeFromJSON = myThreeFromJSON;

},{"fast-event-emitter":12,"util":11}],6:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var myWorker = new Worker("./scripts/verletworker.js");
var messageQueue = [];

function workerMessage(message) {

	var id = Date.now() + Math.floor(Math.random() * 1000000);

	// This wraps the message posting/response in a promise, which will resolve if the response doesn't
	// contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
	// controller.postMessage() and set up the onmessage handler independently of a promise, but this is
	// a convenient wrapper.
	return new Promise(function workerMessagePromise(resolve, reject) {
		var data = {
			id: id,
			message: message,
			resolve: resolve,
			reject: reject
		};
		messageQueue.push(data);
	});
}

// Process messages once per frame	
requestAnimationFrame(function process() {
	if (messageQueue.length) {
		(function () {

			var extractedMessages = messageQueue.splice(0);

			var messageToSend = JSON.stringify(extractedMessages.map(function (i) {
				return { message: i.message, id: i.id };
			}));

			var messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = function resolveMessagePromise(event) {
				messageChannel.port1.onmessage = undefined;

				// Iterate over the responses and resolve/reject accordingly
				var response = JSON.parse(event.data);
				response.forEach(function (d, i) {
					if (extractedMessages[i].id !== d.id) {
						throw Error('ID Mismatch!!!');
					}
					if (!d.error) {
						extractedMessages[i].resolve(d);
					} else {
						extractedMessages[i].reject(d.error);
					}
				});
			};
			myWorker.postMessage(messageToSend, [messageChannel.port2]);
		})();
	}
	requestAnimationFrame(process);
});

var Verlet = (function () {
	function Verlet() {
		_classCallCheck(this, Verlet);
	}

	_createClass(Verlet, [{
		key: 'init',
		value: function init(options) {
			return workerMessage({ action: 'init', options: options });
		}
	}, {
		key: 'getPoints',
		value: function getPoints() {
			return workerMessage({ action: 'getPoints' }).then(function (e) {
				return e.points;
			});
		}
	}, {
		key: 'addPoint',
		value: function addPoint(pointOptions) {
			return workerMessage({ action: 'addPoint', pointOptions: pointOptions });
		}
	}, {
		key: 'updatePoint',
		value: function updatePoint(pointOptions) {
			return workerMessage({ action: 'updatePoint', pointOptions: pointOptions });
		}
	}, {
		key: 'connectPoints',
		value: function connectPoints(p1, p2, constraintOptions) {
			return workerMessage({ action: 'connectPoints', options: { p1: p1, p2: p2, constraintOptions: constraintOptions } });
		}
	}, {
		key: 'updateConstraint',
		value: function updateConstraint(options) {
			return workerMessage({ action: 'updateConstraint', options: options });
		}
	}, {
		key: 'reset',
		value: function reset() {
			return workerMessage({ action: 'reset' });
		}
	}]);

	return Verlet;
})();

module.exports = Verlet;

},{}],7:[function(require,module,exports){
/*global THREE*/
'use strict';
var addScript = require('./lib/loadScript'); // Promise wrapper for script loading
var VerletWrapper = require('./lib/verletwrapper'); // Wrapper of the verlet worker
var textSprite = require('./lib/textSprite'); // Generally sprites from canvas
var CameraInteractions = require('./lib/camerainteractions'); // Tool for making interactive VR elements
var TextureAnimator = require('./lib/textureanimator');
var TWEEN = require('tween.js');

// no hsts so just redirect to https
if (window.location.protocol !== "https:" && window.location.hostname !== 'localhost') {
	window.location.protocol = "https:";
}

function serviceWorker() {

	return new Promise(function (resolve) {

		// Start service worker
		if ('serviceWorker' in navigator) {

			if (navigator.serviceWorker.controller) {
				console.log('Offlining Availble');
				resolve();
			} else {
				navigator.serviceWorker.register('./sw.js').then(function (reg) {
					console.log('sw registered', reg);
				}).then(resolve);
			}
		} else {
			console.error('No Service Worker, assets may not be cached');
			resolve();
		}
	});
}

serviceWorker().then(function () {
	return Promise.all([addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default'), addScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r73/three.min.js')]);
}).then(function () {
	return Promise.all([addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/effects/StereoEffect.js'), addScript('https://cdn.rawgit.com/richtr/threeVR/master/js/DeviceOrientationController.js')]);
}).then(function () {
	return require('./lib/threeHelper').myThreeFromJSON('Kitchen/lickthewhisk', {
		camera: 'Camera',
		target: document.body
	});
}).then(function (threeHelper) {
	console.log('Ready');

	/**
  * Update textures to Baked ones and add envmap
  */

	var textureLoader = new THREE.TextureLoader();
	var cubeTextureLoader = new THREE.CubeTextureLoader();

	// Select objects from the scene for later processing.
	var toTexture = threeHelper.pickObjectsHelper(threeHelper.scene, 'Room', 'Counter', 'Cake', 'Swirl.000', 'Swirl.001', 'Swirl.002', 'Swirl.003', 'Swirl.004', 'Swirl.005', 'Swirl.006', 'Swirl.007', 'Swirl.008', 'Swirl.009');
	var toShiny = threeHelper.pickObjectsHelper(threeHelper.scene, 'LickTheWhisk', 'Whisk', 'SaucePan', 'SaucePan.001', 'SaucePan.002', 'SaucePan.003', 'Fridge');
	Object.keys(toTexture).forEach(function (name) {
		textureLoader.load('models/Kitchen/' + name.split('.')[0] + 'Bake.png', function (map) {
			return toTexture[name].material = new THREE.MeshBasicMaterial({ map: map });
		});
	});

	var path = "models/Kitchen/envmap/";
	var format = '.png';
	var urls = [path + '0004' + format, // +x
	path + '0002' + format, // -x
	path + '0006' + format, // +y
	path + '0005' + format, // -y
	path + '0001' + format, // +z
	path + '0003' + format // -z
	];
	cubeTextureLoader.load(urls, function (envMap) {
		var copper = new THREE.MeshPhongMaterial({ color: 0x99ff99, specular: 0x772222, envMap: envMap, combine: THREE.MixOperation, reflectivity: 0.3, metal: true });
		var aluminium = new THREE.MeshPhongMaterial({ color: 0x888888, specular: 0x999999, envMap: envMap, combine: THREE.MixOperation, reflectivity: 0.3, metal: true });
		var chocolate = new THREE.MeshPhongMaterial({ color: toShiny.LickTheWhisk.material.color, specular: 0x999999, envMap: envMap, combine: THREE.MixOperation, reflectivity: 0.3, metal: true });

		toShiny['SaucePan'].material = copper;
		toShiny['SaucePan.001'].material = copper;
		toShiny['SaucePan.002'].material = copper;
		toShiny['SaucePan.003'].material = copper;
		toShiny.Whisk.material = aluminium;
		toShiny.LickTheWhisk.material = chocolate;

		textureLoader.load('models/Kitchen/FridgeBake.png', function (map) {
			return toShiny.Fridge.material = new THREE.MeshPhongMaterial({ map: map, envMap: envMap, combine: THREE.MixOperation, specular: 0x999999, reflectivity: 0.3, metal: true, side: THREE.DoubleSide });
		});
	});

	// Ambiant light
	var ambientLight = new THREE.AmbientLight(0xcccccc);
	threeHelper.scene.add(ambientLight);

	/**
  * Add a targeting reticule to the HUD to help align what the user is looking at
  * Also add a circular progress bar.
  */

	textureLoader.load("images/reticule.png", function (map) {
		var material = new THREE.SpriteMaterial({ map: map, fog: false, transparent: true });
		var sprite = new THREE.Sprite(material);
		threeHelper.hud.add(sprite);
	});

	/**
  * Set up interactivity from the camera.
  */

	var cameraInteractivityWorld = new CameraInteractions(threeHelper.domElement);

	threeHelper.deviceOrientationController.addEventListener('userinteractionend', function () {
		cameraInteractivityWorld.interact({ type: 'click' });
	});

	// Run the verlet physics
	var verlet = new VerletWrapper();
	verlet.init({
		size: {
			x: 20,
			y: 20,
			z: 20
		},
		gravity: true
	}).then(function () {

		/**
   * Main Render Loop
   *
   * Each request animation frame render is called
   * And a request is made to the verlet physics worker
   * to calculate a new lot of physics calculations to update
   * our simulation.
   */

		var waitingForPoints = false;
		requestAnimationFrame(function animate(time) {
			requestAnimationFrame(animate);
			cameraInteractivityWorld.detectInteractions(threeHelper.camera);

			if (!waitingForPoints) {
				verlet.getPoints().then(threeHelper.updateObjects).then(function () {
					return waitingForPoints = false;
				});
				waitingForPoints = true;
			}
			threeHelper.render();
		});

		/**
   * Add some interactivity
   */
		var loaderSprite = undefined;

		// Load a loading animation
		// and then hide it for now
		textureLoader.load("images/loader.png", function (map) {
			var tA = new TextureAnimator(map, 8, 16, 116);
			var texture = new THREE.SpriteMaterial({ map: map, fog: false, transparent: true });
			loaderSprite = new THREE.Sprite(texture);
			loaderSprite.animator = tA;
			loaderSprite.scale.multiplyScalar(0.9);
			threeHelper.on('prerender', function () {
				if (loaderSprite.visible) tA.update();
			});
			threeHelper.hud.add(loaderSprite);
			loaderSprite.visible = false;
		});

		function showLoader(callback) {
			if (!loaderSprite) return;
			loaderSprite.animator.currentTile = 0;
			loaderSprite.visible = true;
			loaderSprite.animator.on('finish', function () {
				hideLoader();
				callback();
			});
		}

		function hideLoader() {
			if (!loaderSprite) return;
			loaderSprite.visible = false;
			loaderSprite.animator.off('finish');
		}

		// Find the empty object where I am putting content
		var objects = threeHelper.pickObjectsHelper(threeHelper.scene, 'MarkerMain');

		// Make some content
		var meringue = toTexture['Swirl.000'].clone();
		objects.MarkerMain.add(meringue);
		meringue.scale.set(0.4, 0.4, 0.4);
		meringue.rotateZ(-1.9415926646002635);
		meringue.position.set(0, 0, 0);

		var interactiveElements = threeHelper.pickObjectsHelper(threeHelper.scene, 'LeftArrow', 'RightArrow');
		interactiveElements.meringue = meringue;
		Object.keys(interactiveElements).forEach(function (name) {
			var iEl = cameraInteractivityWorld.makeTarget(interactiveElements[name]);
			interactiveElements[name] = iEl;
			var rot = iEl.object3d.rotation;
			var sca = iEl.object3d.scale;
			var tween = new TWEEN.Tween({
				rX: rot.x,
				rY: rot.y,
				rZ: rot.z,
				sX: sca.x,
				sY: sca.y,
				sZ: sca.z
			}).to({
				rZ: rot.z + 0.3,
				sX: sca.x * 1.1,
				sY: sca.y * 1.1,
				sZ: sca.z * 1.1
			}, 400).easing(TWEEN.Easing.Quadratic.InOut).onUpdate(function () {
				rot.set(this.rX, this.rY, this.rZ);
				sca.set(this.sX, this.sY, this.sZ);
			}).repeat(Infinity).yoyo(true).start(0);

			iEl.on('hoverStart', function () {

				// Show the loader and send a click once
				// the animation has finished.
				showLoader(function () {
					return iEl.emit('click');
				});
			});

			iEl.on('hoverOut', function () {
				hideLoader();
			});
			var t = 2;
			iEl.on('hover', function () {
				tween.update(16 * ++t);
			});

			iEl.on('click', hideLoader);
		});
	});
});

},{"./lib/camerainteractions":1,"./lib/loadScript":2,"./lib/textSprite":3,"./lib/textureanimator":4,"./lib/threeHelper":5,"./lib/verletwrapper":6,"tween.js":14}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],11:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":10,"_process":9,"inherits":8}],12:[function(require,module,exports){
"use strict";
var protoclass = require("protoclass");

/**
 * @module mojo
 * @submodule mojo-core
 */

/**
 * @class EventEmitter
 */

function EventEmitter () {
  this.__events = {};
}

/**
 * adds a listener on the event emitter
 *
 * @method on
 * @param {String} event event to listen on
 * @param {Function} listener to callback when `event` is emitted.
 * @returns {Disposable}
 */


EventEmitter.prototype.on = function (event, listener) {

  if (typeof listener !== "function") {
    throw new Error("listener must be a function for event '"+event+"'");
  }

  var listeners;
  if (!(listeners = this.__events[event])) {
    this.__events[event] = listener;
  } else if (typeof listeners === "function") {
    this.__events[event] = [listeners, listener];
  } else {
    listeners.push(listener);
  }

  var self = this;

  return {
    dispose: function() {
      self.off(event, listener);
    }
  };
};

/**
 * removes an event emitter
 * @method off
 * @param {String} event to remove
 * @param {Function} listener to remove
 */

EventEmitter.prototype.off = function (event, listener) {

  var listeners;

  if(!(listeners = this.__events[event])) {
    return;
  }

  if (typeof listeners === "function") {
    this.__events[event] = undefined;
  } else {
    var i = listeners.indexOf(listener);
    if (~i) listeners.splice(i, 1);
    if (!listeners.length) {
      this.__events[event] = undefined;
    }
  }
};

/**
 * adds a listener on the event emitter
 * @method once
 * @param {String} event event to listen on
 * @param {Function} listener to callback when `event` is emitted.
 * @returns {Disposable}
 */


EventEmitter.prototype.once = function (event, listener) {

  if (typeof listener !== "function") {
    throw new Error("listener must be a function for event '"+event+"'");
  }

  function listener2 () {
    disp.dispose();
    listener.apply(this, arguments);
  }

  var disp = this.on(event, listener2);
  disp.target = this;
  return disp;
};

/**
 * emits an event
 * @method emit
 * @param {String} event
 * @param {String}, `data...` data to emit
 */


EventEmitter.prototype.emit = function (event) {

  if (this.__events[event] === undefined) return;

  var listeners = this.__events[event],
  n = arguments.length,
  args,
  i,
  j;

  if (typeof listeners === "function") {
    if (n === 1) {
      listeners();
    } else {
      switch(n) {
        case 2:
          listeners(arguments[1]);
          break;
        case 3:
          listeners(arguments[1], arguments[2]);
          break;
        case 4:
          listeners(arguments[1], arguments[2], arguments[3]);
          break;
        default:
          args = new Array(n - 1);
          for(i = 1; i < n; i++) args[i-1] = arguments[i];
          listeners.apply(this, args);
    }
  }
  } else {
    args = new Array(n - 1);
    for(i = 1; i < n; i++) args[i-1] = arguments[i];
    for(j = listeners.length; j--;) {
      if(listeners[j]) listeners[j].apply(this, args);
    }
  }
};

/**
 * removes all listeners
 * @method removeAllListeners
 * @param {String} event (optional) removes all listeners of `event`. Omitting will remove everything.
 */

EventEmitter.prototype.removeAllListeners = function (event) {
  if (arguments.length === 1) {
    this.__events[event] = undefined;
  } else {
    this.__events = {};
  }
};

module.exports = EventEmitter;

},{"protoclass":13}],13:[function(require,module,exports){
function _copy (to, from) {

  for (var i = 0, n = from.length; i < n; i++) {

    var target = from[i];

    for (var property in target) {
      to[property] = target[property];
    }
  }

  return to;
}

function protoclass (parent, child) {

  var mixins = Array.prototype.slice.call(arguments, 2);

  if (typeof child !== "function") {
    if(child) mixins.unshift(child); // constructor is a mixin
    child   = parent;
    parent  = function() { };
  }

  _copy(child, parent); 

  function ctor () {
    this.constructor = child;
  }

  ctor.prototype  = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  child.parent    = child.superclass = parent;

  _copy(child.prototype, mixins);

  protoclass.setup(child);

  return child;
}

protoclass.setup = function (child) {


  if (!child.extend) {
    child.extend = function(constructor) {

      var args = Array.prototype.slice.call(arguments, 0);

      if (typeof constructor !== "function") {
        args.unshift(constructor = function () {
          constructor.parent.apply(this, arguments);
        });
      }

      return protoclass.apply(this, [this].concat(args));
    }

    child.mixin = function(proto) {
      _copy(this.prototype, arguments);
    }

    child.create = function () {
      var obj = Object.create(child.prototype);
      child.apply(obj, arguments);
      return obj;
    }
  }

  return child;
}


module.exports = protoclass;
},{}],14:[function(require,module,exports){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// Include a performance.now polyfill
(function () {

	if ('performance' in window === false) {
		window.performance = {};
	}

	// IE 8
	Date.now = (Date.now || function () {
		return new Date().getTime();
	});

	if ('now' in window.performance === false) {
		var offset = window.performance.timing && window.performance.timing.navigationStart ? window.performance.timing.navigationStart
		                                                                                    : Date.now();

		window.performance.now = function () {
			return Date.now() - offset;
		};
	}

})();

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : window.performance.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time)) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();

TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for (var field in object) {
		_valuesStart[field] = parseFloat(object[field], 10);
	}

	this.to = function (properties, duration) {

		if (duration !== undefined) {
			_duration = duration;
		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : window.performance.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object);
			}

			_onStartCallbackFired = true;

		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {
					end = start + parseFloat(end, 10);
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if (_onCompleteCallback !== null) {
					_onCompleteCallback.call(_object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return - (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));

		},

		Out: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return (a * Math.pow(2, - 10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1);

		},

		InOut: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			if ((k *= 2) < 1) {
				return - 0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));
			}

			return a * Math.pow(2, -10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

},{}]},{},[7])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9saWNrLXRoZS13aGlzay9hcHAvc2NyaXB0cy9saWIvY2FtZXJhaW50ZXJhY3Rpb25zLmpzIiwiL2hvbWUvYWRhL2dpdFdvcmtpbmdEaXIvbGljay10aGUtd2hpc2svYXBwL3NjcmlwdHMvbGliL2xvYWRTY3JpcHQuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9saWNrLXRoZS13aGlzay9hcHAvc2NyaXB0cy9saWIvdGV4dFNwcml0ZS5qcyIsIi9ob21lL2FkYS9naXRXb3JraW5nRGlyL2xpY2stdGhlLXdoaXNrL2FwcC9zY3JpcHRzL2xpYi90ZXh0dXJlYW5pbWF0b3IuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9saWNrLXRoZS13aGlzay9hcHAvc2NyaXB0cy9saWIvdGhyZWVIZWxwZXIuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9saWNrLXRoZS13aGlzay9hcHAvc2NyaXB0cy9saWIvdmVybGV0d3JhcHBlci5qcyIsIi9ob21lL2FkYS9naXRXb3JraW5nRGlyL2xpY2stdGhlLXdoaXNrL2FwcC9zY3JpcHRzL21haW4uanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJub2RlX21vZHVsZXMvZmFzdC1ldmVudC1lbWl0dGVyL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0LWV2ZW50LWVtaXR0ZXIvbm9kZV9tb2R1bGVzL3Byb3RvY2xhc3MvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R3ZWVuLmpzL3NyYy9Ud2Vlbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDS0EsWUFBWSxDQUFDO0FBQ2IsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDbkQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7QUFZN0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLHdCQUF3QixDQUFDLFVBQVUsRUFBRTs7O0FBRTlELFVBQVMsbUJBQW1CLENBQUMsSUFBSSxFQUFFOzs7QUFFbEMsY0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFeEIsTUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQzlCLE1BQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ3RCLE1BQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDOztBQUVyQixNQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFNO0FBQ3RCLE9BQUksQ0FBQyxNQUFLLFFBQVEsRUFBRTtBQUNuQixVQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4QjtBQUNELFNBQUssUUFBUSxHQUFHLElBQUksQ0FBQztHQUNyQixDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsWUFBTTtBQUN6QixTQUFLLFFBQVEsR0FBRyxLQUFLLENBQUM7R0FDdEIsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxJQUFJLEdBQUcsWUFBSztBQUNoQixTQUFLLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0dBQzlCLENBQUM7O0FBRUYsTUFBSSxDQUFDLElBQUksR0FBRyxZQUFLO0FBQ2hCLFNBQUssUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIFNldHMgdXAgYW4gZW52aXJvbWVudCBmb3IgZGV0ZWN0aW5nIHRoYXQgXG4gKiB0aGUgY2FtZXJhIGlzIGxvb2tpbmcgYXQgb2JqZWN0cy5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdmYXN0LWV2ZW50LWVtaXR0ZXInKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8qZ2xvYmFsIFRIUkVFKi9cbi8qKlxuICogS2VlcHMgdHJhY2sgb2YgaW50ZXJhY3RpdmUgM0QgZWxlbWVudHMgYW5kIFxuICogY2FuIGJlIHVzZWQgdG8gdHJpZ2dlciBldmVudHMgb24gdGhlbS5cbiAqXG4gKiBUaGUgZG9tRWxlbWVudCBpcyB0byBwaWNrIHVwIHRvdWNoIGluZXJhY3Rpb25zXG4gKiBcbiAqIEBwYXJhbSAge1t0eXBlXX0gZG9tRWxlbWVudCBbZGVzY3JpcHRpb25dXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgICAgW2Rlc2NyaXB0aW9uXVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIENhbWVyYUludGVyYWN0aXZpdHlXb3JsZChkb21FbGVtZW50KSB7XG5cblx0ZnVuY3Rpb24gSW50ZXJhY3Rpdml0eVRhcmdldChub2RlKSB7XG5cblx0XHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuXHRcdHRoaXMucG9zaXRpb24gPSBub2RlLnBvc2l0aW9uO1xuXHRcdHRoaXMuaGFzSG92ZXIgPSBmYWxzZTtcblx0XHR0aGlzLm9iamVjdDNkID0gbm9kZTtcblxuXHRcdHRoaXMub24oJ2hvdmVyJywgKCkgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLmhhc0hvdmVyKSB7XG5cdFx0XHRcdHRoaXMuZW1pdCgnaG92ZXJTdGFydCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5oYXNIb3ZlciA9IHRydWU7XG5cdFx0fSk7XG5cblx0XHR0aGlzLm9uKCdob3Zlck91dCcsICgpID0+IHtcblx0XHRcdHRoaXMuaGFzSG92ZXIgPSBmYWxzZTtcblx0XHR9KTtcblxuXHRcdHRoaXMuaGlkZSA9ICgpID0+e1xuXHRcdFx0dGhpcy5vYmplY3QzZC52aXNpYmxlID0gZmFsc2U7XG5cdFx0fTtcblxuXHRcdHRoaXMuc2hvdyA9ICgpID0+e1xuXHRcdFx0dGhpcy5vYmplY3QzZC52aXNpYmxlID0gdHJ1ZTtcblx0XHR9O1xuXHR9XG5cdHV0aWwuaW5oZXJpdHMoSW50ZXJhY3Rpdml0eVRhcmdldCwgRXZlbnRFbWl0dGVyKTtcblxuXHR0aGlzLnRhcmdldHMgPSBuZXcgTWFwKCk7XG5cblx0dGhpcy5kZXRlY3RJbnRlcmFjdGlvbnMgPSBmdW5jdGlvbiAoY2FtZXJhKSB7XG5cblx0XHRjb25zdCByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cdFx0cmF5Y2FzdGVyLnNldEZyb21DYW1lcmEobmV3IFRIUkVFLlZlY3RvcjIoMCwwKSwgY2FtZXJhKTtcblx0XHRjb25zdCBoaXRzID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHMoXG5cdFx0XHRBcnJheS5mcm9tKHRoaXMudGFyZ2V0cy52YWx1ZXMoKSlcblx0XHRcdC5tYXAodGFyZ2V0ID0+IHRhcmdldC5vYmplY3QzZClcblx0XHRcdC5maWx0ZXIob2JqZWN0M2QgPT4gb2JqZWN0M2QudmlzaWJsZSlcblx0XHQpO1xuXG5cdFx0bGV0IHRhcmdldCA9IGZhbHNlO1xuXG5cdFx0aWYgKGhpdHMubGVuZ3RoKSB7XG5cblx0XHRcdC8vIFNob3cgaGlkZGVuIHRleHQgb2JqZWN0M2QgY2hpbGRcblx0XHRcdHRhcmdldCA9IHRoaXMudGFyZ2V0cy5nZXQoaGl0c1swXS5vYmplY3QpO1xuXHRcdFx0aWYgKHRhcmdldCkgdGFyZ2V0LmVtaXQoJ2hvdmVyJyk7XG5cdFx0fVxuXG5cdFx0Ly8gaWYgaXQgaXMgbm90IHRoZSBvbmUganVzdCBtYXJrZWQgZm9yIGhpZ2hsaWdodFxuXHRcdC8vIGFuZCBpdCB1c2VkIHRvIGJlIGhpZ2hsaWdodGVkIHVuIGhpZ2hsaWdodCBpdC5cblx0XHRBcnJheS5mcm9tKHRoaXMudGFyZ2V0cy52YWx1ZXMoKSlcblx0XHQuZmlsdGVyKGVhY2hUYXJnZXQgPT4gZWFjaFRhcmdldCAhPT0gdGFyZ2V0KVxuXHRcdC5mb3JFYWNoKGVhY2hOb3RIaXQgPT4ge1xuXHRcdFx0aWYgKGVhY2hOb3RIaXQuaGFzSG92ZXIpIGVhY2hOb3RIaXQuZW1pdCgnaG92ZXJPdXQnKTtcblx0XHR9KTtcblx0fTtcblxuXHRjb25zdCBpbnRlcmFjdCA9IChldmVudCkgPT4ge1xuXHRcdEFycmF5LmZyb20odGhpcy50YXJnZXRzLnZhbHVlcygpKS5mb3JFYWNoKHRhcmdldCA9PiB7XG5cdFx0XHRpZiAodGFyZ2V0Lmhhc0hvdmVyKSB7XG5cdFx0XHRcdHRhcmdldC5lbWl0KGV2ZW50LnR5cGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXHR0aGlzLmludGVyYWN0ID0gaW50ZXJhY3Q7XG5cblx0ZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGludGVyYWN0KTtcblx0ZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBpbnRlcmFjdCk7XG5cdGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGludGVyYWN0KTtcblx0ZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHVwJywgaW50ZXJhY3QpO1xuXHRkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZG93bicsIGludGVyYWN0KTtcblxuXHR0aGlzLm1ha2VUYXJnZXQgPSBub2RlID0+IHtcblx0XHRjb25zdCBuZXdUYXJnZXQgPSBuZXcgSW50ZXJhY3Rpdml0eVRhcmdldChub2RlKTtcblx0XHR0aGlzLnRhcmdldHMuc2V0KG5vZGUsIG5ld1RhcmdldCk7XG5cdFx0cmV0dXJuIG5ld1RhcmdldDtcblx0fTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGFkZFNjcmlwdCh1cmwpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHR2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cdFx0c2NyaXB0LnNldEF0dHJpYnV0ZSgnc3JjJywgdXJsKTtcblx0XHRkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XG5cdFx0c2NyaXB0Lm9ubG9hZCA9IHJlc29sdmU7XG5cdFx0c2NyaXB0Lm9uZXJyb3IgPSByZWplY3Q7XG5cdH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZFNjcmlwdDtcbiIsIi8vIEZyb20gaHR0cDovL3N0ZW1rb3NraS5naXRodWIuaW8vVGhyZWUuanMvU3ByaXRlLVRleHQtTGFiZWxzLmh0bWxcbi8qZ2xvYmFsIFRIUkVFKi9cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gbWFrZVRleHRTcHJpdGUoIG1lc3NhZ2UsIHBhcmFtZXRlcnMgKSB7XG5cdGlmICggcGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkICkgcGFyYW1ldGVycyA9IHt9O1xuXHRcblx0Y29uc3QgZm9udGZhY2UgPSBwYXJhbWV0ZXJzLmhhc093blByb3BlcnR5KFwiZm9udGZhY2VcIikgPyBcblx0XHRwYXJhbWV0ZXJzW1wiZm9udGZhY2VcIl0gOiBcIkFyaWFsXCI7XG5cdFxuXHRjb25zdCBib3JkZXJUaGlja25lc3MgPSBwYXJhbWV0ZXJzLmhhc093blByb3BlcnR5KFwiYm9yZGVyVGhpY2tuZXNzXCIpID8gXG5cdFx0cGFyYW1ldGVyc1tcImJvcmRlclRoaWNrbmVzc1wiXSA6IDI7XG5cblx0Ly8gbWF5IHR3ZWFrZWQgbGF0ZXIgdG8gc2NhbGUgdGV4dFxuXHRsZXQgc2l6ZSA9IHBhcmFtZXRlcnMuaGFzT3duUHJvcGVydHkoXCJzaXplXCIpID8gXG5cdFx0cGFyYW1ldGVyc1tcInNpemVcIl0gOiAxO1xuXHRcdFxuXHRjb25zdCBjYW52YXMxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdGNvbnN0IGNvbnRleHQxID0gY2FudmFzMS5nZXRDb250ZXh0KCcyZCcpO1xuXHRjb25zdCBoZWlnaHQgPSAyNTY7XG5cblx0ZnVuY3Rpb24gc2V0U3R5bGUoY29udGV4dCkge1xuXG5cdFx0Y29udGV4dC5mb250ID0gXCJCb2xkIFwiICsgKGhlaWdodCAtIGJvcmRlclRoaWNrbmVzcykgKyBcInB4IFwiICsgZm9udGZhY2U7XG5cdFx0Y29udGV4dC50ZXh0QWxpZ24gPSAnY2VudGVyJztcblx0XHRjb250ZXh0LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xuXHRcdFxuXHRcdGNvbnRleHQubGluZVdpZHRoID0gYm9yZGVyVGhpY2tuZXNzO1xuXG5cdFx0Ly8gdGV4dCBjb2xvclxuXHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LCAyNTUsIDI1NSwgMS4wKVwiO1xuXHRcdGNvbnRleHQuZmlsbFN0eWxlID0gXCJyZ2JhKDAsIDAsIDAsIDEuMClcIjtcblx0fVxuXG5cdHNldFN0eWxlKGNvbnRleHQxKTtcblxuXHRjb25zdCBjYW52YXMyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0Ly8gTWFrZSB0aGUgY2FudmFzIHdpZHRoIGEgcG93ZXIgb2YgMiBsYXJnZXIgdGhhbiB0aGUgdGV4dCB3aWR0aFxuXHRjb25zdCBtZWFzdXJlID0gY29udGV4dDEubWVhc3VyZVRleHQoIG1lc3NhZ2UgKTtcblx0Y2FudmFzMi53aWR0aCA9IE1hdGgucG93KDIsIE1hdGguY2VpbChNYXRoLmxvZzIoIG1lYXN1cmUud2lkdGggKSkpO1xuXHRjYW52YXMyLmhlaWdodCA9IGhlaWdodDtcblx0Y29uc29sZS5sb2cobWVhc3VyZSk7XG5cdGNvbnN0IGNvbnRleHQyID0gY2FudmFzMi5nZXRDb250ZXh0KCcyZCcpO1xuXG5cdGNvbnRleHQyLnJlY3QoMCwgMCwgY2FudmFzMi53aWR0aCwgY2FudmFzMi5oZWlnaHQpO1xuXHRjb250ZXh0Mi5maWxsU3R5bGU9XCJyZWRcIjtcblx0Y29udGV4dDIuZmlsbCgpO1xuXG5cdHNldFN0eWxlKGNvbnRleHQyKTtcblxuXHRjb250ZXh0Mi5zdHJva2VUZXh0KCBtZXNzYWdlLCBjYW52YXMyLndpZHRoLzIsIGNhbnZhczIuaGVpZ2h0LzIpO1xuXHRjb250ZXh0Mi5maWxsVGV4dCggbWVzc2FnZSwgY2FudmFzMi53aWR0aC8yLCBjYW52YXMyLmhlaWdodC8yKTtcblx0XG5cdC8vIGNhbnZhcyBjb250ZW50cyB3aWxsIGJlIHVzZWQgZm9yIGEgdGV4dHVyZVxuXHRjb25zdCB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoY2FudmFzMikgO1xuXHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblxuXHRjb25zdCBzcHJpdGVNYXRlcmlhbCA9IG5ldyBUSFJFRS5TcHJpdGVNYXRlcmlhbCh7IG1hcDogdGV4dHVyZSwgdHJhbnNwYXJlbnQ6IHRydWUgfSk7XG5cdGNvbnN0IHNwcml0ZSA9IG5ldyBUSFJFRS5TcHJpdGUoc3ByaXRlTWF0ZXJpYWwpO1xuXG5cdGNvbnN0IG1heFdpZHRoID0gaGVpZ2h0ICogNDtcblxuXHRpZiAoY2FudmFzMi53aWR0aCA+IG1heFdpZHRoKSBzaXplICo9IG1heFdpZHRoL2NhbnZhczIud2lkdGg7XG5cdGNvbnNvbGUubG9nKGNhbnZhczIud2lkdGgsIGNhbnZhczIuaGVpZ2h0KTtcbiAgICBcblx0Ly8gZ2V0IHNpemUgZGF0YSAoaGVpZ2h0IGRlcGVuZHMgb25seSBvbiBmb250IHNpemUpXG5cdHNwcml0ZS5zY2FsZS5zZXQoc2l6ZSAqIGNhbnZhczIud2lkdGgvY2FudmFzMi5oZWlnaHQsIHNpemUsIDEpO1xuXHRyZXR1cm4gc3ByaXRlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1ha2VUZXh0U3ByaXRlO1xuIiwiLy8gQmFzZWQgb24gaHR0cHM6Ly9zdGVta29za2kuZ2l0aHViLmlvL1RocmVlLmpzL1RleHR1cmUtQW5pbWF0aW9uLmh0bWxcbi8qZ2xvYmFsIFRIUkVFKi9cbid1c2Ugc3RyaWN0JztcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdmYXN0LWV2ZW50LWVtaXR0ZXInKTtcblxuZnVuY3Rpb24gVGV4dHVyZUFuaW1hdG9yKHRleHR1cmUsIHRpbGVzSG9yaXosIHRpbGVzVmVydCwgbnVtVGlsZXMpIHtcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cdC8vIG5vdGU6IHRleHR1cmUgcGFzc2VkIGJ5IHJlZmVyZW5jZSwgd2lsbCBiZSB1cGRhdGVkIGJ5IHRoZSB1cGRhdGUgZnVuY3Rpb24uXG5cblx0dGV4dHVyZS5mbGlwWSA9IGZhbHNlO1xuXHR0aGlzLmN1cnJlbnRUaWxlID0gMDtcblx0dGhpcy50aWxlc0hvcml6b250YWwgPSB0aWxlc0hvcml6O1xuXHR0aGlzLnRpbGVzVmVydGljYWwgPSB0aWxlc1ZlcnQ7XG5cdC8vIGhvdyBtYW55IGltYWdlcyBkb2VzIHRoaXMgc3ByaXRlc2hlZXQgY29udGFpbj9cblx0Ly8gIHVzdWFsbHkgZXF1YWxzIHRpbGVzSG9yaXogKiB0aWxlc1ZlcnQsIGJ1dCBub3QgbmVjZXNzYXJpbHksXG5cdC8vICBpZiB0aGVyZSBhdCBibGFuayB0aWxlcyBhdCB0aGUgYm90dG9tIG9mIHRoZSBzcHJpdGVzaGVldC4gXG5cdHRoaXMubnVtYmVyT2ZUaWxlcyA9IG51bVRpbGVzO1xuXHR0ZXh0dXJlLndyYXBTID0gdGV4dHVyZS53cmFwVCA9IFRIUkVFLlJlcGVhdFdyYXBwaW5nOyBcblx0dGV4dHVyZS5yZXBlYXQuc2V0KCAxIC8gdGhpcy50aWxlc0hvcml6b250YWwsIDEgLyB0aGlzLnRpbGVzVmVydGljYWwgKTtcblxuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY3VycmVudFRpbGUgPSB0aGlzLmN1cnJlbnRUaWxlICsgMTtcblx0XHRpZiAodGhpcy5jdXJyZW50VGlsZSA+PSB0aGlzLm51bWJlck9mVGlsZXMpIHtcblx0XHRcdHRoaXMuY3VycmVudFRpbGUgPSAwO1xuXHRcdFx0dGhpcy5lbWl0KCdmaW5pc2gnKTtcblx0XHR9XG5cblx0XHR2YXIgY3VycmVudENvbHVtbiA9IHRoaXMuY3VycmVudFRpbGUgJSB0aGlzLnRpbGVzSG9yaXpvbnRhbDtcblx0XHR0ZXh0dXJlLm9mZnNldC54ID0gY3VycmVudENvbHVtbiAvIHRoaXMudGlsZXNIb3Jpem9udGFsO1xuXHRcdHZhciBjdXJyZW50Um93ID0gTWF0aC5mbG9vciggdGhpcy5jdXJyZW50VGlsZSAvIHRoaXMudGlsZXNIb3Jpem9udGFsICk7XG5cdFx0dGV4dHVyZS5vZmZzZXQueSA9IGN1cnJlbnRSb3cgLyB0aGlzLnRpbGVzVmVydGljYWw7XG5cdH07XG5cdHRoaXMudXBkYXRlKCk7XG59XG5cbnV0aWwuaW5oZXJpdHMoVGV4dHVyZUFuaW1hdG9yLCBFdmVudEVtaXR0ZXIpO1xubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlQW5pbWF0b3I7XG4iLCIvKiBnbG9iYWwgVEhSRUUsIERldmljZU9yaWVudGF0aW9uQ29udHJvbGxlciAqL1xuJ3VzZSBzdHJpY3QnO1xuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZmFzdC1ldmVudC1lbWl0dGVyJyk7XG5jb25zdCB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG5cbi8qKlxuICogVXNlIHRoZSBqc29uIGxvYWRlciB0byBsb2FkIGpzb24gZmlsZXMgZnJvbSB0aGUgZGVmYXVsdCBsb2NhdGlvblxuICovXG5cbnZhciBsID0gbmV3IFRIUkVFLk9iamVjdExvYWRlcigpO1xuY29uc3QgbG9hZFNjZW5lID0gKGlkKSA9PiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdGwubG9hZCgnbW9kZWxzLycgKyBpZCArICcuanNvbicsIHJlc29sdmUsIHVuZGVmaW5lZCwgcmVqZWN0KTtcbn0pO1xuXG4vKipcbiAqIEhlbHBlciBmb3IgcGlja2luZyBvYmplY3RzIGZyb20gYSBzY2VuZVxuICogQHBhcmFtICB7T2JqZWN0M2R9ICAgIHJvb3QgICAgcm9vdCBPYmplY3QzZCBlLmcuIGEgc2NlbmUgb3IgYSBtZXNoXG4gKiBAcGFyYW0gIHsuLi5zdHJpbmd9IG5hbWVzSW4gbGlzdCBvZiBuYW1lc2QgdG8gZmluZCBlLmcuICdDYW1lcmEnIG9yICdGbG9vcidcbiAqIEByZXR1cm4ge09iamVjdCBtYXB9ICAgICAgICAgIG1hcCBvZiBuYW1lcyB0byBvYmplY3RzIHsnQ2FtZXJhJzogKFRIUkVFLkNhbWVyYSB3aXRoIG5hbWUgQ2FtZXJhKSwgJ0Zsb29yJzogKFRIUkVFLk1lc2ggd2l0aCBuYW1lIEZsb29yKX1cbiAqL1xuZnVuY3Rpb24gcGlja09iamVjdHNIZWxwZXIocm9vdCwgLi4ubmFtZXNJbikge1xuXG5cdGNvbnN0IGNvbGxlY3Rpb24gPSB7fTtcblx0Y29uc3QgbmFtZXMgPSBuZXcgU2V0KG5hbWVzSW4pO1xuXG5cdChmdW5jdGlvbiBwaWNrT2JqZWN0cyhyb290KSB7XG5cdFx0aWYgKHJvb3QuY2hpbGRyZW4pIHtcblx0XHRcdHJvb3QuY2hpbGRyZW4uZm9yRWFjaChub2RlID0+IHtcblx0XHRcdFx0aWYgKG5hbWVzLmhhcyhub2RlLm5hbWUpKSB7XG5cdFx0XHRcdFx0Y29sbGVjdGlvbltub2RlLm5hbWVdID0gbm9kZTtcblx0XHRcdFx0XHRuYW1lcy5kZWxldGUobm9kZS5uYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobmFtZXMuc2l6ZSkge1xuXHRcdFx0XHRcdHBpY2tPYmplY3RzKG5vZGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pKHJvb3QpO1xuXG5cdGlmIChuYW1lcy5zaXplKSB7XG5cdFx0Y29uc29sZS53YXJuKCdOb3QgYWxsIG9iamVjdHMgZm91bmQ6ICcgKyBuYW1lcy52YWx1ZXMoKS5uZXh0KCkudmFsdWUgKyAnIG1pc3NpbmcnKTtcblx0fVxuXG5cdHJldHVybiBjb2xsZWN0aW9uO1xufVxuXG4vKipcbiAqIExvYWQgdGhlIHNjZW5lIHdpdGggZmlsZSBuYW1lIGlkIGFuZCByZXR1cm4gdGhlIGhlbHBlclxuICovXG5mdW5jdGlvbiBteVRocmVlRnJvbUpTT04oaWQsIG9wdGlvbnMpIHtcblx0cmV0dXJuIGxvYWRTY2VuZShpZCkudGhlbihzY2VuZSA9PiB7XG5cdFx0b3B0aW9ucy5zY2VuZSA9IHNjZW5lO1xuXHRcdHJldHVybiBuZXcgTXlUaHJlZUhlbHBlcihvcHRpb25zKTtcblx0fSk7XG59XG5cbi8qKlxuICogSGVscGVyIG9iamVjdCB3aXRoIHNvbWUgdXNlZnVsIHRocmVlIGZ1bmN0aW9uc1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAgICAgICBzY2VuZTogc2NlbmUgdG8gdXNlIGZvciBkZWZhdWx0XG4gKiAgICAgICAgdGFyZ2V0OiB3aGVyZSBpbiB0aGUgZG9tIHRvIHB1dCB0aGUgcmVuZGVyZXJcbiAqICAgICAgICBjYW1lcmE6IG5hbWUgb2YgY2FtZXJhIHRvIHVzZSBpbiB0aGUgc2NlbmVcbiAqL1xuZnVuY3Rpb24gTXlUaHJlZUhlbHBlcihvcHRpb25zKXtcblxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuXHRvcHRpb25zLnRhcmdldCA9IG9wdGlvbnMudGFyZ2V0IHx8IGRvY3VtZW50LmJvZHk7XG5cblx0Y29uc3QgcmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlciggeyBhbnRpYWxpYXM6IGZhbHNlIH0gKTtcblx0cmVuZGVyZXIuc2V0UGl4ZWxSYXRpbyggd2luZG93LmRldmljZVBpeGVsUmF0aW8gKTtcblxuXHRvcHRpb25zLnRhcmdldC5hcHBlbmRDaGlsZChyZW5kZXJlci5kb21FbGVtZW50KTtcblx0dGhpcy5kb21FbGVtZW50ID0gcmVuZGVyZXIuZG9tRWxlbWVudDtcblxuXG5cblx0LyoqXG5cdCAqIFNldCB1cCBzdGVyZW8gZWZmZWN0IHJlbmRlcmVyXG5cdCAqL1xuXG5cdGNvbnN0IGVmZmVjdCA9IG5ldyBUSFJFRS5TdGVyZW9FZmZlY3QocmVuZGVyZXIpO1xuXHRlZmZlY3QuZXllU2VwYXJhdGlvbiA9IDAuMDA4O1xuXHRlZmZlY3QuZm9jYWxMZW5ndGggPSAwLjI1O1xuXHRlZmZlY3Quc2V0U2l6ZSggd2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodCApO1xuXHR0aGlzLnJlbmRlck1ldGhvZCA9IGVmZmVjdDtcblxuXG5cblx0LyoqXG5cdCAqIFNldCB1cCB0aGUgc2NlbmUgdG8gYmUgcmVuZGVyZWQgb3IgY3JlYXRlIGEgbmV3IG9uZVxuXHQgKi9cblxuXHR0aGlzLnNjZW5lID0gb3B0aW9ucy5zY2VuZSB8fCBuZXcgVEhSRUUuU2NlbmUoKTtcblxuXG5cblx0LyoqXG5cdCAqIFNldCB1cCBjYW1lcmEgZWl0aGVyIG9uZSBmcm9tIHRoZSBzY2VuZSBvciBtYWtlIGEgbmV3IG9uZVxuXHQgKi9cblx0XG5cdGxldCBjYW1lcmEgPSBvcHRpb25zLmNhbWVyYSA/IHBpY2tPYmplY3RzSGVscGVyKHRoaXMuc2NlbmUsIG9wdGlvbnMuY2FtZXJhKS5DYW1lcmEgOiB1bmRlZmluZWQ7XG5cblx0aWYgKCFjYW1lcmEpIHtcblx0XHRjb25zb2xlLmxvZyhjYW1lcmEpO1xuXHRcdGNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSggNzUsIG9wdGlvbnMudGFyZ2V0LnNjcm9sbFdpZHRoIC8gb3B0aW9ucy50YXJnZXQuc2Nyb2xsSGVpZ2h0LCAwLjUsIDEwMCApO1xuXHRcdGNhbWVyYS5wb3NpdGlvbi5zZXQoMCwgMiwgMCk7XG5cdFx0Y2FtZXJhLmxvb2tBdChuZXcgVEhSRUUuVmVjdG9yMygwLCBjYW1lcmEuaGVpZ2h0LCAtOSkpO1xuXHRcdGNhbWVyYS5yb3RhdGlvbi55ICs9IE1hdGguUEk7XG5cdH1cblx0Y2FtZXJhLmhlaWdodCA9IGNhbWVyYS5wb3NpdGlvbi55OyAvLyByZWZlcmVuY2UgdmFsdWUgZm9yIGhvdyBoaWdoIHRoZSBjYW1lcmEgc2hvdWxkIGJlXG5cdFx0XHRcdFx0XHRcdFx0XHQgICAvLyBhYm92ZSB0aGUgZ3JvdW5kIHRvIG1haW50YWluIHRoZSBpbGx1c2lvbiBvZiBwcmVzZW5jZVxuXHRjYW1lcmEuZm92ID0gNzU7XG5cblx0dGhpcy5jYW1lcmEgPSBjYW1lcmE7XG5cblxuXG5cdC8qKlxuXHQgKiBIYW5kbGUgd2luZG93IHJlc2l6ZXMvcm90YXRpb25zXG5cdCAqL1xuXG5cdGNvbnN0IHNldEFzcGVjdCA9ICgpID0+IHtcblx0XHR0aGlzLnJlbmRlck1ldGhvZC5zZXRTaXplKCBvcHRpb25zLnRhcmdldC5zY3JvbGxXaWR0aCwgb3B0aW9ucy50YXJnZXQuc2Nyb2xsSGVpZ2h0ICk7XG5cdFx0dGhpcy5jYW1lcmEuYXNwZWN0ID0gb3B0aW9ucy50YXJnZXQuc2Nyb2xsV2lkdGggLyBvcHRpb25zLnRhcmdldC5zY3JvbGxIZWlnaHQ7XG5cdFx0dGhpcy5jYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXHR9O1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgc2V0QXNwZWN0KTtcblx0c2V0QXNwZWN0KCk7XG5cblxuXG5cdC8qKlxuXHQgKiBTZXQgdXAgaGVhZCB0cmFja2luZ1xuXHQgKi9cblxuXHQgLy8gcHJvdmlkZSBkdW1teSBlbGVtZW50IHRvIHByZXZlbnQgdG91Y2gvY2xpY2sgaGlqYWNraW5nLlxuXHRjb25zdCBlbGVtZW50ID0gbG9jYXRpb24uaG9zdG5hbWUgIT09ICdsb2NhbGhvc3QnID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKSA6IHVuZGVmaW5lZDtcblx0dGhpcy5kZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIgPSBuZXcgRGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyKHRoaXMuY2FtZXJhLCBlbGVtZW50KTtcblx0dGhpcy5kZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIuY29ubmVjdCgpO1xuXHR0aGlzLm9uKCdwcmVyZW5kZXInLCAoKSA9PiB0aGlzLmRldmljZU9yaWVudGF0aW9uQ29udHJvbGxlci51cGRhdGUoKSk7XG5cblxuXG5cdC8qKlxuXHQgKiBUaGlzIHNob3VsZCBiZSBjYWxsZWQgaW4gdGhlIG1haW4gYW5pbWF0aW9uIGxvb3Bcblx0ICovXG5cblx0dGhpcy5yZW5kZXIgPSAoKSA9PiB7XG5cdFx0dGhpcy5lbWl0KCdwcmVyZW5kZXInKTtcblx0XHR0aGlzLnJlbmRlck1ldGhvZC5yZW5kZXIodGhpcy5zY2VuZSwgY2FtZXJhKTtcblx0XHR0aGlzLmVtaXQoJ3Bvc3RyZW5kZXInKTtcblx0fTtcblxuXG5cblx0LyoqXG5cdCAqIEhlYWRzIHVwIERpc3BsYXlcblx0ICogXG5cdCAqIEFkZCBhIGhlYWRzIHVwIGRpc3BsYXkgb2JqZWN0IHRvIHRoZSBjYW1lcmFcblx0ICogTWVzaGVzIGFuZCBTcHJpdGVzIGNhbiBiZSBhZGRlZCB0byB0aGlzIHRvIGFwcGVhciB0byBiZSBjbG9zZSB0byB0aGUgdXNlci5cblx0ICovXG5cblx0Y29uc3QgaHVkID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cdGh1ZC5wb3NpdGlvbi5zZXQoMCwgMCwgLTIuMSk7XG5cdGh1ZC5zY2FsZS5zZXQoMC4yLCAwLjIsIDAuMik7XG5cdGNhbWVyYS5hZGQoaHVkKTtcblx0dGhpcy5zY2VuZS5hZGQodGhpcy5jYW1lcmEpOyAvLyBhZGQgdGhlIGNhbWVyYSB0byB0aGUgc2NlbmUgc28gdGhhdCB0aGUgaHVkIGlzIHJlbmRlcmVkXG5cdHRoaXMuaHVkID0gaHVkO1xuXG5cblxuXG5cdC8qKlxuXHQgKiBBTklNQVRJT05cblx0ICogXG5cdCAqIEEgbWFwIG9mIHBoeXNpY3Mgb2JqZWN0IGlkIHRvIHRocmVlLmpzIG9iamVjdCAzZCBzbyB3ZSBjYW4gdXBkYXRlIGFsbCB0aGUgcG9zaXRpb25zXG5cdCAqL1xuXG5cdGNvbnN0IHRocmVlT2JqZWN0c0Nvbm5lY3RlZFRvUGh5c2ljcyA9IHt9O1xuXHR0aGlzLnVwZGF0ZU9iamVjdHMgPSBwaHlzaWNzT2JqZWN0cyA9PiB7XG5cdFx0Y29uc3QgbCA9IHBoeXNpY3NPYmplY3RzLmxlbmd0aDtcblxuXHRcdC8vIGl0ZXJhdGUgb3ZlciB0aGUgcGh5c2ljcyBwaHlzaWNzT2JqZWN0c1xuXHRcdGZvciAoIGxldCBqPTA7IGo8bDtqKysgKSB7XG5cblx0XHRcdGNvbnN0IGkgPSBwaHlzaWNzT2JqZWN0c1tqXTtcblx0XHRcdGlmICh0aHJlZU9iamVjdHNDb25uZWN0ZWRUb1BoeXNpY3NbaS5pZF0pIHtcblxuXHRcdFx0XHRjb25zdCBvID0gdGhyZWVPYmplY3RzQ29ubmVjdGVkVG9QaHlzaWNzW2kuaWRdO1xuXG5cdFx0XHRcdC8vIFN1cHBvcnQgbWFuaXBsYXRpbmcgYSBzaW5nbGUgdmVydGV4XG5cdFx0XHRcdGlmIChvLmNvbnN0cnVjdG9yID09PSBUSFJFRS5WZWN0b3IzKSB7XG5cdFx0XHRcdFx0by5zZXQoaS5wb3NpdGlvbi54LCBpLnBvc2l0aW9uLnksIGkucG9zaXRpb24ueik7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvLnBvc2l0aW9uLnNldChpLnBvc2l0aW9uLngsIGkucG9zaXRpb24ueSwgaS5wb3NpdGlvbi56KTtcblxuXHRcdFx0XHQvLyBSb3RhdGlvblxuXHRcdFx0XHRpZiAoaS5xdWF0ZXJuaW9uKSB7XG5cdFx0XHRcdFx0by5yb3RhdGlvbi5zZXRGcm9tUXVhdGVybmlvbihuZXcgVEhSRUUuUXVhdGVybmlvbihpLnF1YXRlcm5pb24ueCwgaS5xdWF0ZXJuaW9uLnksIGkucXVhdGVybmlvbi56LCBpLnF1YXRlcm5pb24udykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdHRoaXMuY29ubmVjdFBoeXNpY3NUb1RocmVlID0gKG1lc2gsIHBoeXNpY3NNZXNoKSA9PiB7XG5cdFx0dGhyZWVPYmplY3RzQ29ubmVjdGVkVG9QaHlzaWNzW3BoeXNpY3NNZXNoLmlkXSA9IG1lc2g7XG5cdFx0aWYgKG1lc2guY29uc3RydWN0b3IgPT09IFRIUkVFLlZlY3RvcjMpIHJldHVybjtcblx0XHR0aGlzLnNjZW5lLmFkZChtZXNoKTtcblx0fTtcblxuXG5cblx0LyoqXG5cdCAqIE1ha2UgdGhlIG9iamVjdCBwaWNrZXIgYXZhaWxhYmxlIG9uIHRoaXMgb2JqZWN0XG5cdCAqL1xuXG5cdHRoaXMucGlja09iamVjdHNIZWxwZXIgPSBwaWNrT2JqZWN0c0hlbHBlcjtcbn1cbnV0aWwuaW5oZXJpdHMoTXlUaHJlZUhlbHBlciwgRXZlbnRFbWl0dGVyKTtcblxubW9kdWxlLmV4cG9ydHMuTXlUaHJlZUhlbHBlciA9IE15VGhyZWVIZWxwZXI7XG5tb2R1bGUuZXhwb3J0cy5teVRocmVlRnJvbUpTT04gPSBteVRocmVlRnJvbUpTT047XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IG15V29ya2VyID0gbmV3IFdvcmtlcihcIi4vc2NyaXB0cy92ZXJsZXR3b3JrZXIuanNcIik7XG5jb25zdCBtZXNzYWdlUXVldWUgPSBbXTtcblxuZnVuY3Rpb24gd29ya2VyTWVzc2FnZShtZXNzYWdlKSB7XG5cblx0Y29uc3QgaWQgPSBEYXRlLm5vdygpICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMCk7XG5cblx0Ly8gVGhpcyB3cmFwcyB0aGUgbWVzc2FnZSBwb3N0aW5nL3Jlc3BvbnNlIGluIGEgcHJvbWlzZSwgd2hpY2ggd2lsbCByZXNvbHZlIGlmIHRoZSByZXNwb25zZSBkb2Vzbid0XG5cdC8vIGNvbnRhaW4gYW4gZXJyb3IsIGFuZCByZWplY3Qgd2l0aCB0aGUgZXJyb3IgaWYgaXQgZG9lcy4gSWYgeW91J2QgcHJlZmVyLCBpdCdzIHBvc3NpYmxlIHRvIGNhbGxcblx0Ly8gY29udHJvbGxlci5wb3N0TWVzc2FnZSgpIGFuZCBzZXQgdXAgdGhlIG9ubWVzc2FnZSBoYW5kbGVyIGluZGVwZW5kZW50bHkgb2YgYSBwcm9taXNlLCBidXQgdGhpcyBpc1xuXHQvLyBhIGNvbnZlbmllbnQgd3JhcHBlci5cblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIHdvcmtlck1lc3NhZ2VQcm9taXNlKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRpZCxcblx0XHRcdG1lc3NhZ2UsXG5cdFx0XHRyZXNvbHZlLFxuXHRcdFx0cmVqZWN0XG5cdFx0fTtcblx0XHRtZXNzYWdlUXVldWUucHVzaChkYXRhKTtcblx0fSk7XG59XG5cbi8vIFByb2Nlc3MgbWVzc2FnZXMgb25jZSBwZXIgZnJhbWVcdFxucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uIHByb2Nlc3MoKSB7XG5cdGlmIChtZXNzYWdlUXVldWUubGVuZ3RoKSB7XG5cblx0XHRjb25zdCBleHRyYWN0ZWRNZXNzYWdlcyA9IG1lc3NhZ2VRdWV1ZS5zcGxpY2UoMCk7XG5cblx0XHRjb25zdCBtZXNzYWdlVG9TZW5kID0gSlNPTi5zdHJpbmdpZnkoZXh0cmFjdGVkTWVzc2FnZXMubWFwKGkgPT4gKFxuXHRcdFx0eyBtZXNzYWdlOiBpLm1lc3NhZ2UsIGlkOiBpLmlkIH1cblx0XHQpKSk7XG5cblx0XHRjb25zdCBtZXNzYWdlQ2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuXHRcdG1lc3NhZ2VDaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIHJlc29sdmVNZXNzYWdlUHJvbWlzZShldmVudCkge1xuXHRcdFx0bWVzc2FnZUNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gdW5kZWZpbmVkO1xuXG5cdFx0XHQvLyBJdGVyYXRlIG92ZXIgdGhlIHJlc3BvbnNlcyBhbmQgcmVzb2x2ZS9yZWplY3QgYWNjb3JkaW5nbHlcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcblx0XHRcdHJlc3BvbnNlLmZvckVhY2goKGQsIGkpID0+IHtcblx0XHRcdFx0aWYgKGV4dHJhY3RlZE1lc3NhZ2VzW2ldLmlkICE9PSBkLmlkKSB7XG5cdFx0XHRcdFx0dGhyb3cgRXJyb3IoJ0lEIE1pc21hdGNoISEhJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFkLmVycm9yKSB7XG5cdFx0XHRcdFx0ZXh0cmFjdGVkTWVzc2FnZXNbaV0ucmVzb2x2ZShkKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRleHRyYWN0ZWRNZXNzYWdlc1tpXS5yZWplY3QoZC5lcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH07XG5cdFx0bXlXb3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZVRvU2VuZCwgW21lc3NhZ2VDaGFubmVsLnBvcnQyXSk7XG5cdH1cblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHByb2Nlc3MpO1xufSk7XG5cbmNsYXNzIFZlcmxldCB7XG5cdGluaXQob3B0aW9ucykge1xuXHRcdHJldHVybiB3b3JrZXJNZXNzYWdlKHthY3Rpb246ICdpbml0Jywgb3B0aW9uc30pO1xuXHR9XG5cblx0Z2V0UG9pbnRzKCkge1xuXHRcdHJldHVybiB3b3JrZXJNZXNzYWdlKHthY3Rpb246ICdnZXRQb2ludHMnfSlcblx0XHRcdC50aGVuKGUgPT4gZS5wb2ludHMpO1xuXHR9XG5cblx0YWRkUG9pbnQocG9pbnRPcHRpb25zKSB7XG5cdFx0cmV0dXJuIHdvcmtlck1lc3NhZ2Uoe2FjdGlvbjogJ2FkZFBvaW50JywgcG9pbnRPcHRpb25zfSk7XG5cdH1cblxuXHR1cGRhdGVQb2ludChwb2ludE9wdGlvbnMpIHtcblx0XHRyZXR1cm4gd29ya2VyTWVzc2FnZSh7YWN0aW9uOiAndXBkYXRlUG9pbnQnLCBwb2ludE9wdGlvbnN9KTtcblx0fVxuXG5cdGNvbm5lY3RQb2ludHMocDEsIHAyLCBjb25zdHJhaW50T3B0aW9ucykge1xuXHRcdHJldHVybiB3b3JrZXJNZXNzYWdlKHthY3Rpb246ICdjb25uZWN0UG9pbnRzJywgb3B0aW9uczoge3AxLCBwMiwgY29uc3RyYWludE9wdGlvbnN9fSk7XG5cdH1cblxuXHR1cGRhdGVDb25zdHJhaW50KG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gd29ya2VyTWVzc2FnZSh7YWN0aW9uOiAndXBkYXRlQ29uc3RyYWludCcsIG9wdGlvbnMgfSk7XG5cdH1cblxuXHRyZXNldCgpIHtcblx0XHRyZXR1cm4gd29ya2VyTWVzc2FnZSh7YWN0aW9uOiAncmVzZXQnfSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBWZXJsZXQ7XG4iLCIvKmdsb2JhbCBUSFJFRSovXG4ndXNlIHN0cmljdCc7XG5jb25zdCBhZGRTY3JpcHQgPSByZXF1aXJlKCcuL2xpYi9sb2FkU2NyaXB0Jyk7IC8vIFByb21pc2Ugd3JhcHBlciBmb3Igc2NyaXB0IGxvYWRpbmdcbmNvbnN0IFZlcmxldFdyYXBwZXIgPSByZXF1aXJlKCcuL2xpYi92ZXJsZXR3cmFwcGVyJyk7IC8vIFdyYXBwZXIgb2YgdGhlIHZlcmxldCB3b3JrZXJcbmNvbnN0IHRleHRTcHJpdGUgPSByZXF1aXJlKCcuL2xpYi90ZXh0U3ByaXRlJyk7IC8vIEdlbmVyYWxseSBzcHJpdGVzIGZyb20gY2FudmFzXG5jb25zdCBDYW1lcmFJbnRlcmFjdGlvbnMgPSByZXF1aXJlKCcuL2xpYi9jYW1lcmFpbnRlcmFjdGlvbnMnKTsgLy8gVG9vbCBmb3IgbWFraW5nIGludGVyYWN0aXZlIFZSIGVsZW1lbnRzXG5jb25zdCBUZXh0dXJlQW5pbWF0b3IgPSByZXF1aXJlKCcuL2xpYi90ZXh0dXJlYW5pbWF0b3InKTtcbmNvbnN0IFRXRUVOID0gcmVxdWlyZSgndHdlZW4uanMnKTtcblxuLy8gbm8gaHN0cyBzbyBqdXN0IHJlZGlyZWN0IHRvIGh0dHBzXG5pZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sICE9PSBcImh0dHBzOlwiICYmIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSAhPT0gJ2xvY2FsaG9zdCcpIHtcbiAgIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9IFwiaHR0cHM6XCI7XG59XG5cbmZ1bmN0aW9uIHNlcnZpY2VXb3JrZXIoKSB7XG5cblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG5cblx0XHQvLyBTdGFydCBzZXJ2aWNlIHdvcmtlclxuXHRcdGlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yKSB7XG5cblx0XHRcdGlmIChuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdPZmZsaW5pbmcgQXZhaWxibGUnKTtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJy4vc3cuanMnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihyZWcpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnc3cgcmVnaXN0ZXJlZCcsIHJlZyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC50aGVuKHJlc29sdmUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdObyBTZXJ2aWNlIFdvcmtlciwgYXNzZXRzIG1heSBub3QgYmUgY2FjaGVkJyk7XG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fVxuXHR9KTtcbn1cblxuc2VydmljZVdvcmtlcigpXG4udGhlbigoKSA9PiBQcm9taXNlLmFsbChbXG5cdGFkZFNjcmlwdCgnaHR0cHM6Ly9wb2x5ZmlsbC53ZWJzZXJ2aWNlcy5mdC5jb20vdjEvcG9seWZpbGwubWluLmpzP2ZlYXR1cmVzPWZldGNoLGRlZmF1bHQnKSxcblx0YWRkU2NyaXB0KCdodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy90aHJlZS5qcy9yNzMvdGhyZWUubWluLmpzJylcbl0pKVxuLnRoZW4oKCkgPT4gUHJvbWlzZS5hbGwoW1xuXHRhZGRTY3JpcHQoJ2h0dHBzOi8vY2RuLnJhd2dpdC5jb20vbXJkb29iL3RocmVlLmpzL21hc3Rlci9leGFtcGxlcy9qcy9lZmZlY3RzL1N0ZXJlb0VmZmVjdC5qcycpLFxuXHRhZGRTY3JpcHQoJ2h0dHBzOi8vY2RuLnJhd2dpdC5jb20vcmljaHRyL3RocmVlVlIvbWFzdGVyL2pzL0RldmljZU9yaWVudGF0aW9uQ29udHJvbGxlci5qcycpXG5dKSlcbi50aGVuKCgpID0+IHJlcXVpcmUoJy4vbGliL3RocmVlSGVscGVyJylcblx0Lm15VGhyZWVGcm9tSlNPTignS2l0Y2hlbi9saWNrdGhld2hpc2snLFxuXHRcdHtcblx0XHRcdGNhbWVyYTogJ0NhbWVyYScsXG5cdFx0XHR0YXJnZXQ6IGRvY3VtZW50LmJvZHlcblx0XHR9XG5cdClcbilcbi50aGVuKHRocmVlSGVscGVyID0+IHtcblx0Y29uc29sZS5sb2coJ1JlYWR5Jyk7XG5cblx0LyoqXG5cdCAqIFVwZGF0ZSB0ZXh0dXJlcyB0byBCYWtlZCBvbmVzIGFuZCBhZGQgZW52bWFwXG5cdCAqL1xuXG5cdGNvbnN0IHRleHR1cmVMb2FkZXIgPSBuZXcgVEhSRUUuVGV4dHVyZUxvYWRlcigpO1xuXHRjb25zdCBjdWJlVGV4dHVyZUxvYWRlciA9IG5ldyBUSFJFRS5DdWJlVGV4dHVyZUxvYWRlcigpO1xuXG5cdC8vIFNlbGVjdCBvYmplY3RzIGZyb20gdGhlIHNjZW5lIGZvciBsYXRlciBwcm9jZXNzaW5nLlxuXHRjb25zdCB0b1RleHR1cmUgPSB0aHJlZUhlbHBlci5waWNrT2JqZWN0c0hlbHBlcih0aHJlZUhlbHBlci5zY2VuZSwgJ1Jvb20nLCAnQ291bnRlcicsICdDYWtlJywgJ1N3aXJsLjAwMCcsICdTd2lybC4wMDEnLCAnU3dpcmwuMDAyJywgJ1N3aXJsLjAwMycsICdTd2lybC4wMDQnLCAnU3dpcmwuMDA1JywgJ1N3aXJsLjAwNicsICdTd2lybC4wMDcnLCAnU3dpcmwuMDA4JywgJ1N3aXJsLjAwOScpO1xuXHRjb25zdCB0b1NoaW55ID0gdGhyZWVIZWxwZXIucGlja09iamVjdHNIZWxwZXIodGhyZWVIZWxwZXIuc2NlbmUsICdMaWNrVGhlV2hpc2snLCAnV2hpc2snLCAnU2F1Y2VQYW4nLCAnU2F1Y2VQYW4uMDAxJywgJ1NhdWNlUGFuLjAwMicsICdTYXVjZVBhbi4wMDMnLCAnRnJpZGdlJyk7XG5cdE9iamVjdC5rZXlzKHRvVGV4dHVyZSkuZm9yRWFjaChuYW1lID0+IHtcblx0XHR0ZXh0dXJlTG9hZGVyLmxvYWQoYG1vZGVscy9LaXRjaGVuLyR7bmFtZS5zcGxpdCgnLicpWzBdfUJha2UucG5nYCwgbWFwID0+IHRvVGV4dHVyZVtuYW1lXS5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwfSkpO1xuXHR9KTtcblxuXHRjb25zdCBwYXRoID0gXCJtb2RlbHMvS2l0Y2hlbi9lbnZtYXAvXCI7XG5cdGNvbnN0IGZvcm1hdCA9ICcucG5nJztcblx0Y29uc3QgdXJscyA9IFtcblx0XHRwYXRoICsgJzAwMDQnICsgZm9ybWF0LCAvLyAreFxuXHRcdHBhdGggKyAnMDAwMicgKyBmb3JtYXQsIC8vIC14XG5cdFx0cGF0aCArICcwMDA2JyArIGZvcm1hdCwgLy8gK3lcblx0XHRwYXRoICsgJzAwMDUnICsgZm9ybWF0LCAvLyAteVxuXHRcdHBhdGggKyAnMDAwMScgKyBmb3JtYXQsIC8vICt6XG5cdFx0cGF0aCArICcwMDAzJyArIGZvcm1hdCAgLy8gLXpcblx0XTtcblx0Y3ViZVRleHR1cmVMb2FkZXIubG9hZCh1cmxzLCBlbnZNYXAgPT4ge1xuXHRcdGNvbnN0IGNvcHBlciA9IG5ldyBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbCggeyBjb2xvcjogMHg5OWZmOTksIHNwZWN1bGFyOiAweDc3MjIyMiwgZW52TWFwLCBjb21iaW5lOiBUSFJFRS5NaXhPcGVyYXRpb24sIHJlZmxlY3Rpdml0eTogMC4zLCBtZXRhbDogdHJ1ZX0gKTtcblx0XHRjb25zdCBhbHVtaW5pdW0gPSBuZXcgVEhSRUUuTWVzaFBob25nTWF0ZXJpYWwoIHsgY29sb3I6IDB4ODg4ODg4LCBzcGVjdWxhcjogMHg5OTk5OTksIGVudk1hcCwgY29tYmluZTogVEhSRUUuTWl4T3BlcmF0aW9uLCByZWZsZWN0aXZpdHk6IDAuMywgbWV0YWw6IHRydWV9ICk7XG5cdFx0Y29uc3QgY2hvY29sYXRlID0gbmV3IFRIUkVFLk1lc2hQaG9uZ01hdGVyaWFsKCB7IGNvbG9yOiB0b1NoaW55LkxpY2tUaGVXaGlzay5tYXRlcmlhbC5jb2xvciwgc3BlY3VsYXI6IDB4OTk5OTk5LCBlbnZNYXAsIGNvbWJpbmU6IFRIUkVFLk1peE9wZXJhdGlvbiwgcmVmbGVjdGl2aXR5OiAwLjMsIG1ldGFsOiB0cnVlfSApO1xuXG5cdFx0dG9TaGlueVsnU2F1Y2VQYW4nXS5tYXRlcmlhbCA9IGNvcHBlcjtcblx0XHR0b1NoaW55WydTYXVjZVBhbi4wMDEnXS5tYXRlcmlhbCA9IGNvcHBlcjtcblx0XHR0b1NoaW55WydTYXVjZVBhbi4wMDInXS5tYXRlcmlhbCA9IGNvcHBlcjtcblx0XHR0b1NoaW55WydTYXVjZVBhbi4wMDMnXS5tYXRlcmlhbCA9IGNvcHBlcjtcblx0XHR0b1NoaW55LldoaXNrLm1hdGVyaWFsID0gYWx1bWluaXVtO1xuXHRcdHRvU2hpbnkuTGlja1RoZVdoaXNrLm1hdGVyaWFsID0gY2hvY29sYXRlO1xuXG5cdFx0dGV4dHVyZUxvYWRlci5sb2FkKGBtb2RlbHMvS2l0Y2hlbi9GcmlkZ2VCYWtlLnBuZ2AsIG1hcCA9PiB0b1NoaW55LkZyaWRnZS5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoUGhvbmdNYXRlcmlhbCh7bWFwLCBlbnZNYXAsIGNvbWJpbmU6IFRIUkVFLk1peE9wZXJhdGlvbiwgc3BlY3VsYXI6IDB4OTk5OTk5LCByZWZsZWN0aXZpdHk6IDAuMywgbWV0YWw6IHRydWUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGUgfSkpO1xuXG5cdH0pO1xuXG5cdC8vIEFtYmlhbnQgbGlnaHRcblx0Y29uc3QgYW1iaWVudExpZ2h0ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCggMHhjY2NjY2MgKTtcblx0dGhyZWVIZWxwZXIuc2NlbmUuYWRkKCBhbWJpZW50TGlnaHQgKTtcblxuXG5cblx0LyoqXG5cdCAqIEFkZCBhIHRhcmdldGluZyByZXRpY3VsZSB0byB0aGUgSFVEIHRvIGhlbHAgYWxpZ24gd2hhdCB0aGUgdXNlciBpcyBsb29raW5nIGF0XG5cdCAqIEFsc28gYWRkIGEgY2lyY3VsYXIgcHJvZ3Jlc3MgYmFyLlxuXHQgKi9cblxuXHR0ZXh0dXJlTG9hZGVyLmxvYWQoXCJpbWFnZXMvcmV0aWN1bGUucG5nXCIsIG1hcCA9PiB7XG5cdFx0Y29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuU3ByaXRlTWF0ZXJpYWwoIHsgbWFwLCBmb2c6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9ICk7XG5cdFx0Y29uc3Qgc3ByaXRlID0gbmV3IFRIUkVFLlNwcml0ZShtYXRlcmlhbCk7XG5cdFx0dGhyZWVIZWxwZXIuaHVkLmFkZChzcHJpdGUpO1xuXHR9KTtcblxuXG5cblx0LyoqXG5cdCAqIFNldCB1cCBpbnRlcmFjdGl2aXR5IGZyb20gdGhlIGNhbWVyYS5cblx0ICovXG5cblx0Y29uc3QgY2FtZXJhSW50ZXJhY3Rpdml0eVdvcmxkID0gbmV3IENhbWVyYUludGVyYWN0aW9ucyh0aHJlZUhlbHBlci5kb21FbGVtZW50KTtcblxuXHR0aHJlZUhlbHBlci5kZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXJcblx0LmFkZEV2ZW50TGlzdGVuZXIoJ3VzZXJpbnRlcmFjdGlvbmVuZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRjYW1lcmFJbnRlcmFjdGl2aXR5V29ybGQuaW50ZXJhY3Qoe3R5cGU6ICdjbGljayd9KTtcblx0fSk7XG5cblxuXHQvLyBSdW4gdGhlIHZlcmxldCBwaHlzaWNzXG5cdGNvbnN0IHZlcmxldCA9IG5ldyBWZXJsZXRXcmFwcGVyKCk7XG5cdHZlcmxldC5pbml0KHtcblx0XHRzaXplOiB7XG5cdFx0XHR4OiAyMCxcblx0XHRcdHk6IDIwLFxuXHRcdFx0ejogMjAsXG5cdFx0fSxcblx0XHRncmF2aXR5OiB0cnVlXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uICgpIHtcblx0XHRcblxuXG5cdFx0LyoqXG5cdFx0ICogTWFpbiBSZW5kZXIgTG9vcFxuXHRcdCAqXG5cdFx0ICogRWFjaCByZXF1ZXN0IGFuaW1hdGlvbiBmcmFtZSByZW5kZXIgaXMgY2FsbGVkXG5cdFx0ICogQW5kIGEgcmVxdWVzdCBpcyBtYWRlIHRvIHRoZSB2ZXJsZXQgcGh5c2ljcyB3b3JrZXJcblx0XHQgKiB0byBjYWxjdWxhdGUgYSBuZXcgbG90IG9mIHBoeXNpY3MgY2FsY3VsYXRpb25zIHRvIHVwZGF0ZVxuXHRcdCAqIG91ciBzaW11bGF0aW9uLlxuXHRcdCAqL1xuXG5cdFx0bGV0IHdhaXRpbmdGb3JQb2ludHMgPSBmYWxzZTtcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gYW5pbWF0ZSh0aW1lKSB7XG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cdFx0XHRjYW1lcmFJbnRlcmFjdGl2aXR5V29ybGQuZGV0ZWN0SW50ZXJhY3Rpb25zKHRocmVlSGVscGVyLmNhbWVyYSk7XG5cblx0XHRcdGlmICghd2FpdGluZ0ZvclBvaW50cykge1xuXHRcdFx0XHR2ZXJsZXQuZ2V0UG9pbnRzKClcblx0XHRcdFx0LnRoZW4odGhyZWVIZWxwZXIudXBkYXRlT2JqZWN0cylcblx0XHRcdFx0LnRoZW4oKCkgPT4gd2FpdGluZ0ZvclBvaW50cyA9IGZhbHNlKTtcblx0XHRcdFx0d2FpdGluZ0ZvclBvaW50cyA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHR0aHJlZUhlbHBlci5yZW5kZXIoKTtcblx0XHR9KTtcblxuXG5cblx0XHQvKipcblx0XHQgKiBBZGQgc29tZSBpbnRlcmFjdGl2aXR5XG5cdFx0ICovXG5cdFx0bGV0IGxvYWRlclNwcml0ZTtcblxuXHRcdC8vIExvYWQgYSBsb2FkaW5nIGFuaW1hdGlvblxuXHRcdC8vIGFuZCB0aGVuIGhpZGUgaXQgZm9yIG5vd1xuXHRcdHRleHR1cmVMb2FkZXIubG9hZChcImltYWdlcy9sb2FkZXIucG5nXCIsIG1hcCA9PiB7XG5cdFx0XHRjb25zdCB0QSA9IG5ldyBUZXh0dXJlQW5pbWF0b3IobWFwLCA4LCAxNiwgMTE2KTtcblx0XHRcdGNvbnN0IHRleHR1cmUgPSBuZXcgVEhSRUUuU3ByaXRlTWF0ZXJpYWwoIHsgbWFwLCBmb2c6IGZhbHNlLCB0cmFuc3BhcmVudDogdHJ1ZSB9ICk7XG5cdFx0XHRsb2FkZXJTcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKHRleHR1cmUpO1xuXHRcdFx0bG9hZGVyU3ByaXRlLmFuaW1hdG9yID0gdEE7XG5cdFx0XHRsb2FkZXJTcHJpdGUuc2NhbGUubXVsdGlwbHlTY2FsYXIoMC45KTtcblx0XHRcdHRocmVlSGVscGVyLm9uKCdwcmVyZW5kZXInLCAoKSA9PiB7XG5cdFx0XHRcdGlmIChsb2FkZXJTcHJpdGUudmlzaWJsZSkgdEEudXBkYXRlKCk7XG5cdFx0XHR9KTtcblx0XHRcdHRocmVlSGVscGVyLmh1ZC5hZGQobG9hZGVyU3ByaXRlKTtcblx0XHRcdGxvYWRlclNwcml0ZS52aXNpYmxlID0gZmFsc2U7XG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiBzaG93TG9hZGVyKGNhbGxiYWNrKSB7XG5cdFx0XHRpZiAoIWxvYWRlclNwcml0ZSkgcmV0dXJuO1xuXHRcdFx0bG9hZGVyU3ByaXRlLmFuaW1hdG9yLmN1cnJlbnRUaWxlID0gMDtcblx0XHRcdGxvYWRlclNwcml0ZS52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdGxvYWRlclNwcml0ZS5hbmltYXRvci5vbignZmluaXNoJywgKCkgPT4ge1xuXHRcdFx0XHRoaWRlTG9hZGVyKCk7XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBoaWRlTG9hZGVyKCkge1xuXHRcdFx0aWYgKCFsb2FkZXJTcHJpdGUpIHJldHVybjtcblx0XHRcdGxvYWRlclNwcml0ZS52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRsb2FkZXJTcHJpdGUuYW5pbWF0b3Iub2ZmKCdmaW5pc2gnKTtcblx0XHR9XG5cblxuXHRcdC8vIEZpbmQgdGhlIGVtcHR5IG9iamVjdCB3aGVyZSBJIGFtIHB1dHRpbmcgY29udGVudFxuXHRcdGNvbnN0IG9iamVjdHMgPSB0aHJlZUhlbHBlci5waWNrT2JqZWN0c0hlbHBlcih0aHJlZUhlbHBlci5zY2VuZSwgJ01hcmtlck1haW4nKTtcblxuXHRcdC8vIE1ha2Ugc29tZSBjb250ZW50XG5cdFx0Y29uc3QgbWVyaW5ndWUgPSB0b1RleHR1cmVbJ1N3aXJsLjAwMCddLmNsb25lKCk7XG5cdFx0b2JqZWN0cy5NYXJrZXJNYWluLmFkZChtZXJpbmd1ZSk7XG5cdFx0bWVyaW5ndWUuc2NhbGUuc2V0KDAuNCwgMC40LCAwLjQpO1xuXHRcdG1lcmluZ3VlLnJvdGF0ZVooLTEuOTQxNTkyNjY0NjAwMjYzNSk7XG5cdFx0bWVyaW5ndWUucG9zaXRpb24uc2V0KDAsMCwwKTtcblxuXG5cblx0XHRjb25zdCBpbnRlcmFjdGl2ZUVsZW1lbnRzID0gdGhyZWVIZWxwZXIucGlja09iamVjdHNIZWxwZXIodGhyZWVIZWxwZXIuc2NlbmUsICdMZWZ0QXJyb3cnLCAnUmlnaHRBcnJvdycpO1xuXHRcdGludGVyYWN0aXZlRWxlbWVudHMubWVyaW5ndWUgPSBtZXJpbmd1ZTtcblx0XHRPYmplY3Qua2V5cyhpbnRlcmFjdGl2ZUVsZW1lbnRzKS5mb3JFYWNoKG5hbWUgPT4ge1xuXHRcdFx0Y29uc3QgaUVsID0gY2FtZXJhSW50ZXJhY3Rpdml0eVdvcmxkLm1ha2VUYXJnZXQoaW50ZXJhY3RpdmVFbGVtZW50c1tuYW1lXSk7XG5cdFx0XHRpbnRlcmFjdGl2ZUVsZW1lbnRzW25hbWVdID0gaUVsO1xuXHRcdFx0Y29uc3Qgcm90ID0gaUVsLm9iamVjdDNkLnJvdGF0aW9uO1xuXHRcdFx0Y29uc3Qgc2NhID0gaUVsLm9iamVjdDNkLnNjYWxlO1xuXHRcdFx0Y29uc3QgdHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4oe1xuXHRcdFx0XHRyWDogcm90LngsXG5cdFx0XHRcdHJZOiByb3QueSxcblx0XHRcdFx0clo6IHJvdC56LFxuXHRcdFx0XHRzWDogc2NhLngsXG5cdFx0XHRcdHNZOiBzY2EueSxcblx0XHRcdFx0c1o6IHNjYS56LFxuXHRcdFx0fSlcblx0XHRcdC50byh7XG5cdFx0XHRcdHJaOiByb3QueiArIDAuMyxcblx0XHRcdFx0c1g6IHNjYS54ICogMS4xLFxuXHRcdFx0XHRzWTogc2NhLnkgKiAxLjEsXG5cdFx0XHRcdHNaOiBzY2EueiAqIDEuMSxcblx0XHRcdH0sIDQwMClcblx0XHRcdC5lYXNpbmcoVFdFRU4uRWFzaW5nLlF1YWRyYXRpYy5Jbk91dClcblx0XHRcdC5vblVwZGF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJvdC5zZXQodGhpcy5yWCwgdGhpcy5yWSwgdGhpcy5yWik7XG5cdFx0XHRcdHNjYS5zZXQodGhpcy5zWCwgdGhpcy5zWSwgdGhpcy5zWik7XG5cdFx0XHR9KVxuXHRcdFx0LnJlcGVhdChJbmZpbml0eSlcblx0XHRcdC55b3lvKHRydWUpXG5cdFx0XHQuc3RhcnQoMCk7XG5cblx0XHRcdGlFbC5vbignaG92ZXJTdGFydCcsICgpID0+IHtcblxuXHRcdFx0XHQvLyBTaG93IHRoZSBsb2FkZXIgYW5kIHNlbmQgYSBjbGljayBvbmNlXG5cdFx0XHRcdC8vIHRoZSBhbmltYXRpb24gaGFzIGZpbmlzaGVkLlxuXHRcdFx0XHRzaG93TG9hZGVyKCgpID0+IGlFbC5lbWl0KCdjbGljaycpKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpRWwub24oJ2hvdmVyT3V0JywgKCkgPT4ge1xuXHRcdFx0XHRoaWRlTG9hZGVyKCk7XG5cdFx0XHR9KTtcblx0XHRcdGxldCB0ID0gMjtcblx0XHRcdGlFbC5vbignaG92ZXInLCAoKSA9PiB7XG5cdFx0XHRcdHR3ZWVuLnVwZGF0ZSgxNiorK3QpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlFbC5vbignY2xpY2snLCBoaWRlTG9hZGVyKTtcblx0XHR9KTsgXG5cblx0fSk7XG59KTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcHJvdG9jbGFzcyA9IHJlcXVpcmUoXCJwcm90b2NsYXNzXCIpO1xuXG4vKipcbiAqIEBtb2R1bGUgbW9qb1xuICogQHN1Ym1vZHVsZSBtb2pvLWNvcmVcbiAqL1xuXG4vKipcbiAqIEBjbGFzcyBFdmVudEVtaXR0ZXJcbiAqL1xuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIgKCkge1xuICB0aGlzLl9fZXZlbnRzID0ge307XG59XG5cbi8qKlxuICogYWRkcyBhIGxpc3RlbmVyIG9uIHRoZSBldmVudCBlbWl0dGVyXG4gKlxuICogQG1ldGhvZCBvblxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IGV2ZW50IHRvIGxpc3RlbiBvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgdG8gY2FsbGJhY2sgd2hlbiBgZXZlbnRgIGlzIGVtaXR0ZWQuXG4gKiBAcmV0dXJucyB7RGlzcG9zYWJsZX1cbiAqL1xuXG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uIGZvciBldmVudCAnXCIrZXZlbnQrXCInXCIpO1xuICB9XG5cbiAgdmFyIGxpc3RlbmVycztcbiAgaWYgKCEobGlzdGVuZXJzID0gdGhpcy5fX2V2ZW50c1tldmVudF0pKSB7XG4gICAgdGhpcy5fX2V2ZW50c1tldmVudF0gPSBsaXN0ZW5lcjtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aGlzLl9fZXZlbnRzW2V2ZW50XSA9IFtsaXN0ZW5lcnMsIGxpc3RlbmVyXTtcbiAgfSBlbHNlIHtcbiAgICBsaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgfVxuICB9O1xufTtcblxuLyoqXG4gKiByZW1vdmVzIGFuIGV2ZW50IGVtaXR0ZXJcbiAqIEBtZXRob2Qgb2ZmXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgdG8gcmVtb3ZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciB0byByZW1vdmVcbiAqL1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uIChldmVudCwgbGlzdGVuZXIpIHtcblxuICB2YXIgbGlzdGVuZXJzO1xuXG4gIGlmKCEobGlzdGVuZXJzID0gdGhpcy5fX2V2ZW50c1tldmVudF0pKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHRoaXMuX19ldmVudHNbZXZlbnRdID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHZhciBpID0gbGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIGlmICh+aSkgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICBpZiAoIWxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX19ldmVudHNbZXZlbnRdID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBhZGRzIGEgbGlzdGVuZXIgb24gdGhlIGV2ZW50IGVtaXR0ZXJcbiAqIEBtZXRob2Qgb25jZVxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IGV2ZW50IHRvIGxpc3RlbiBvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgdG8gY2FsbGJhY2sgd2hlbiBgZXZlbnRgIGlzIGVtaXR0ZWQuXG4gKiBAcmV0dXJucyB7RGlzcG9zYWJsZX1cbiAqL1xuXG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIChldmVudCwgbGlzdGVuZXIpIHtcblxuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24gZm9yIGV2ZW50ICdcIitldmVudCtcIidcIik7XG4gIH1cblxuICBmdW5jdGlvbiBsaXN0ZW5lcjIgKCkge1xuICAgIGRpc3AuZGlzcG9zZSgpO1xuICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICB2YXIgZGlzcCA9IHRoaXMub24oZXZlbnQsIGxpc3RlbmVyMik7XG4gIGRpc3AudGFyZ2V0ID0gdGhpcztcbiAgcmV0dXJuIGRpc3A7XG59O1xuXG4vKipcbiAqIGVtaXRzIGFuIGV2ZW50XG4gKiBAbWV0aG9kIGVtaXRcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtTdHJpbmd9LCBgZGF0YS4uLmAgZGF0YSB0byBlbWl0XG4gKi9cblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICBpZiAodGhpcy5fX2V2ZW50c1tldmVudF0gPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9fZXZlbnRzW2V2ZW50XSxcbiAgbiA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gIGFyZ3MsXG4gIGksXG4gIGo7XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGlmIChuID09PSAxKSB7XG4gICAgICBsaXN0ZW5lcnMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3dpdGNoKG4pIHtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIGxpc3RlbmVycyhhcmd1bWVudHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgbGlzdGVuZXJzKGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIGxpc3RlbmVycyhhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSwgYXJndW1lbnRzWzNdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KG4gLSAxKTtcbiAgICAgICAgICBmb3IoaSA9IDE7IGkgPCBuOyBpKyspIGFyZ3NbaS0xXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICBsaXN0ZW5lcnMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IG5ldyBBcnJheShuIC0gMSk7XG4gICAgZm9yKGkgPSAxOyBpIDwgbjsgaSsrKSBhcmdzW2ktMV0gPSBhcmd1bWVudHNbaV07XG4gICAgZm9yKGogPSBsaXN0ZW5lcnMubGVuZ3RoOyBqLS07KSB7XG4gICAgICBpZihsaXN0ZW5lcnNbal0pIGxpc3RlbmVyc1tqXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogcmVtb3ZlcyBhbGwgbGlzdGVuZXJzXG4gKiBAbWV0aG9kIHJlbW92ZUFsbExpc3RlbmVyc1xuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IChvcHRpb25hbCkgcmVtb3ZlcyBhbGwgbGlzdGVuZXJzIG9mIGBldmVudGAuIE9taXR0aW5nIHdpbGwgcmVtb3ZlIGV2ZXJ5dGhpbmcuXG4gKi9cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICB0aGlzLl9fZXZlbnRzW2V2ZW50XSA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9fZXZlbnRzID0ge307XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuIiwiZnVuY3Rpb24gX2NvcHkgKHRvLCBmcm9tKSB7XG5cbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBmcm9tLmxlbmd0aDsgaSA8IG47IGkrKykge1xuXG4gICAgdmFyIHRhcmdldCA9IGZyb21baV07XG5cbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0YXJnZXQpIHtcbiAgICAgIHRvW3Byb3BlcnR5XSA9IHRhcmdldFtwcm9wZXJ0eV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRvO1xufVxuXG5mdW5jdGlvbiBwcm90b2NsYXNzIChwYXJlbnQsIGNoaWxkKSB7XG5cbiAgdmFyIG1peGlucyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG5cbiAgaWYgKHR5cGVvZiBjaGlsZCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgaWYoY2hpbGQpIG1peGlucy51bnNoaWZ0KGNoaWxkKTsgLy8gY29uc3RydWN0b3IgaXMgYSBtaXhpblxuICAgIGNoaWxkICAgPSBwYXJlbnQ7XG4gICAgcGFyZW50ICA9IGZ1bmN0aW9uKCkgeyB9O1xuICB9XG5cbiAgX2NvcHkoY2hpbGQsIHBhcmVudCk7IFxuXG4gIGZ1bmN0aW9uIGN0b3IgKCkge1xuICAgIHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDtcbiAgfVxuXG4gIGN0b3IucHJvdG90eXBlICA9IHBhcmVudC5wcm90b3R5cGU7XG4gIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBjdG9yKCk7XG4gIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG4gIGNoaWxkLnBhcmVudCAgICA9IGNoaWxkLnN1cGVyY2xhc3MgPSBwYXJlbnQ7XG5cbiAgX2NvcHkoY2hpbGQucHJvdG90eXBlLCBtaXhpbnMpO1xuXG4gIHByb3RvY2xhc3Muc2V0dXAoY2hpbGQpO1xuXG4gIHJldHVybiBjaGlsZDtcbn1cblxucHJvdG9jbGFzcy5zZXR1cCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuXG5cbiAgaWYgKCFjaGlsZC5leHRlbmQpIHtcbiAgICBjaGlsZC5leHRlbmQgPSBmdW5jdGlvbihjb25zdHJ1Y3Rvcikge1xuXG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG5cbiAgICAgIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBhcmdzLnVuc2hpZnQoY29uc3RydWN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY29uc3RydWN0b3IucGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvdG9jbGFzcy5hcHBseSh0aGlzLCBbdGhpc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9XG5cbiAgICBjaGlsZC5taXhpbiA9IGZ1bmN0aW9uKHByb3RvKSB7XG4gICAgICBfY29weSh0aGlzLnByb3RvdHlwZSwgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBjaGlsZC5jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgb2JqID0gT2JqZWN0LmNyZWF0ZShjaGlsZC5wcm90b3R5cGUpO1xuICAgICAgY2hpbGQuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBwcm90b2NsYXNzOyIsIi8qKlxuICogVHdlZW4uanMgLSBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS90d2VlbmpzL3R3ZWVuLmpzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90d2VlbmpzL3R3ZWVuLmpzL2dyYXBocy9jb250cmlidXRvcnMgZm9yIHRoZSBmdWxsIGxpc3Qgb2YgY29udHJpYnV0b3JzLlxuICogVGhhbmsgeW91IGFsbCwgeW91J3JlIGF3ZXNvbWUhXG4gKi9cblxuLy8gSW5jbHVkZSBhIHBlcmZvcm1hbmNlLm5vdyBwb2x5ZmlsbFxuKGZ1bmN0aW9uICgpIHtcblxuXHRpZiAoJ3BlcmZvcm1hbmNlJyBpbiB3aW5kb3cgPT09IGZhbHNlKSB7XG5cdFx0d2luZG93LnBlcmZvcm1hbmNlID0ge307XG5cdH1cblxuXHQvLyBJRSA4XG5cdERhdGUubm93ID0gKERhdGUubm93IHx8IGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdH0pO1xuXG5cdGlmICgnbm93JyBpbiB3aW5kb3cucGVyZm9ybWFuY2UgPT09IGZhbHNlKSB7XG5cdFx0dmFyIG9mZnNldCA9IHdpbmRvdy5wZXJmb3JtYW5jZS50aW1pbmcgJiYgd2luZG93LnBlcmZvcm1hbmNlLnRpbWluZy5uYXZpZ2F0aW9uU3RhcnQgPyB3aW5kb3cucGVyZm9ybWFuY2UudGltaW5nLm5hdmlnYXRpb25TdGFydFxuXHRcdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogRGF0ZS5ub3coKTtcblxuXHRcdHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gRGF0ZS5ub3coKSAtIG9mZnNldDtcblx0XHR9O1xuXHR9XG5cbn0pKCk7XG5cbnZhciBUV0VFTiA9IFRXRUVOIHx8IChmdW5jdGlvbiAoKSB7XG5cblx0dmFyIF90d2VlbnMgPSBbXTtcblxuXHRyZXR1cm4ge1xuXG5cdFx0Z2V0QWxsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHJldHVybiBfdHdlZW5zO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZUFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRfdHdlZW5zID0gW107XG5cblx0XHR9LFxuXG5cdFx0YWRkOiBmdW5jdGlvbiAodHdlZW4pIHtcblxuXHRcdFx0X3R3ZWVucy5wdXNoKHR3ZWVuKTtcblxuXHRcdH0sXG5cblx0XHRyZW1vdmU6IGZ1bmN0aW9uICh0d2Vlbikge1xuXG5cdFx0XHR2YXIgaSA9IF90d2VlbnMuaW5kZXhPZih0d2Vlbik7XG5cblx0XHRcdGlmIChpICE9PSAtMSkge1xuXHRcdFx0XHRfdHdlZW5zLnNwbGljZShpLCAxKTtcblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHRcdGlmIChfdHdlZW5zLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBpID0gMDtcblxuXHRcdFx0dGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG5cblx0XHRcdHdoaWxlIChpIDwgX3R3ZWVucy5sZW5ndGgpIHtcblxuXHRcdFx0XHRpZiAoX3R3ZWVuc1tpXS51cGRhdGUodGltZSkpIHtcblx0XHRcdFx0XHRpKys7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxufSkoKTtcblxuVFdFRU4uVHdlZW4gPSBmdW5jdGlvbiAob2JqZWN0KSB7XG5cblx0dmFyIF9vYmplY3QgPSBvYmplY3Q7XG5cdHZhciBfdmFsdWVzU3RhcnQgPSB7fTtcblx0dmFyIF92YWx1ZXNFbmQgPSB7fTtcblx0dmFyIF92YWx1ZXNTdGFydFJlcGVhdCA9IHt9O1xuXHR2YXIgX2R1cmF0aW9uID0gMTAwMDtcblx0dmFyIF9yZXBlYXQgPSAwO1xuXHR2YXIgX3lveW8gPSBmYWxzZTtcblx0dmFyIF9pc1BsYXlpbmcgPSBmYWxzZTtcblx0dmFyIF9yZXZlcnNlZCA9IGZhbHNlO1xuXHR2YXIgX2RlbGF5VGltZSA9IDA7XG5cdHZhciBfc3RhcnRUaW1lID0gbnVsbDtcblx0dmFyIF9lYXNpbmdGdW5jdGlvbiA9IFRXRUVOLkVhc2luZy5MaW5lYXIuTm9uZTtcblx0dmFyIF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLkxpbmVhcjtcblx0dmFyIF9jaGFpbmVkVHdlZW5zID0gW107XG5cdHZhciBfb25TdGFydENhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXHR2YXIgX29uVXBkYXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdG9wQ2FsbGJhY2sgPSBudWxsO1xuXG5cdC8vIFNldCBhbGwgc3RhcnRpbmcgdmFsdWVzIHByZXNlbnQgb24gdGhlIHRhcmdldCBvYmplY3Rcblx0Zm9yICh2YXIgZmllbGQgaW4gb2JqZWN0KSB7XG5cdFx0X3ZhbHVlc1N0YXJ0W2ZpZWxkXSA9IHBhcnNlRmxvYXQob2JqZWN0W2ZpZWxkXSwgMTApO1xuXHR9XG5cblx0dGhpcy50byA9IGZ1bmN0aW9uIChwcm9wZXJ0aWVzLCBkdXJhdGlvbikge1xuXG5cdFx0aWYgKGR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdF9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH1cblxuXHRcdF92YWx1ZXNFbmQgPSBwcm9wZXJ0aWVzO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0YXJ0ID0gZnVuY3Rpb24gKHRpbWUpIHtcblxuXHRcdFRXRUVOLmFkZCh0aGlzKTtcblxuXHRcdF9pc1BsYXlpbmcgPSB0cnVlO1xuXG5cdFx0X29uU3RhcnRDYWxsYmFja0ZpcmVkID0gZmFsc2U7XG5cblx0XHRfc3RhcnRUaW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcblx0XHRfc3RhcnRUaW1lICs9IF9kZWxheVRpbWU7XG5cblx0XHRmb3IgKHZhciBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kKSB7XG5cblx0XHRcdC8vIENoZWNrIGlmIGFuIEFycmF5IHdhcyBwcm92aWRlZCBhcyBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0aWYgKF92YWx1ZXNFbmRbcHJvcGVydHldIGluc3RhbmNlb2YgQXJyYXkpIHtcblxuXHRcdFx0XHRpZiAoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDcmVhdGUgYSBsb2NhbCBjb3B5IG9mIHRoZSBBcnJheSB3aXRoIHRoZSBzdGFydCB2YWx1ZSBhdCB0aGUgZnJvbnRcblx0XHRcdFx0X3ZhbHVlc0VuZFtwcm9wZXJ0eV0gPSBbX29iamVjdFtwcm9wZXJ0eV1dLmNvbmNhdChfdmFsdWVzRW5kW3Byb3BlcnR5XSk7XG5cblx0XHRcdH1cblxuXHRcdFx0X3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSA9IF9vYmplY3RbcHJvcGVydHldO1xuXG5cdFx0XHRpZiAoKF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gaW5zdGFuY2VvZiBBcnJheSkgPT09IGZhbHNlKSB7XG5cdFx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gKj0gMS4wOyAvLyBFbnN1cmVzIHdlJ3JlIHVzaW5nIG51bWJlcnMsIG5vdCBzdHJpbmdzXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRbcHJvcGVydHldIHx8IDA7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGlmICghX2lzUGxheWluZykge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0VFdFRU4ucmVtb3ZlKHRoaXMpO1xuXHRcdF9pc1BsYXlpbmcgPSBmYWxzZTtcblxuXHRcdGlmIChfb25TdG9wQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdF9vblN0b3BDYWxsYmFjay5jYWxsKF9vYmplY3QpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3RvcENoYWluZWRUd2VlbnMoKTtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcENoYWluZWRUd2VlbnMgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRmb3IgKHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKykge1xuXHRcdFx0X2NoYWluZWRUd2VlbnNbaV0uc3RvcCgpO1xuXHRcdH1cblxuXHR9O1xuXG5cdHRoaXMuZGVsYXkgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG5cblx0XHRfZGVsYXlUaW1lID0gYW1vdW50O1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5yZXBlYXQgPSBmdW5jdGlvbiAodGltZXMpIHtcblxuXHRcdF9yZXBlYXQgPSB0aW1lcztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMueW95byA9IGZ1bmN0aW9uICh5b3lvKSB7XG5cblx0XHRfeW95byA9IHlveW87XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXG5cdHRoaXMuZWFzaW5nID0gZnVuY3Rpb24gKGVhc2luZykge1xuXG5cdFx0X2Vhc2luZ0Z1bmN0aW9uID0gZWFzaW5nO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5pbnRlcnBvbGF0aW9uID0gZnVuY3Rpb24gKGludGVycG9sYXRpb24pIHtcblxuXHRcdF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBpbnRlcnBvbGF0aW9uO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdF9jaGFpbmVkVHdlZW5zID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0YXJ0ID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25TdGFydENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uVXBkYXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25VcGRhdGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vbkNvbXBsZXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25Db21wbGV0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RvcCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uU3RvcENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHR2YXIgcHJvcGVydHk7XG5cdFx0dmFyIGVsYXBzZWQ7XG5cdFx0dmFyIHZhbHVlO1xuXG5cdFx0aWYgKHRpbWUgPCBfc3RhcnRUaW1lKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoX29uU3RhcnRDYWxsYmFja0ZpcmVkID09PSBmYWxzZSkge1xuXG5cdFx0XHRpZiAoX29uU3RhcnRDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0XHRfb25TdGFydENhbGxiYWNrLmNhbGwoX29iamVjdCk7XG5cdFx0XHR9XG5cblx0XHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IHRydWU7XG5cblx0XHR9XG5cblx0XHRlbGFwc2VkID0gKHRpbWUgLSBfc3RhcnRUaW1lKSAvIF9kdXJhdGlvbjtcblx0XHRlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuXHRcdHZhbHVlID0gX2Vhc2luZ0Z1bmN0aW9uKGVsYXBzZWQpO1xuXG5cdFx0Zm9yIChwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kKSB7XG5cblx0XHRcdHZhciBzdGFydCA9IF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gfHwgMDtcblx0XHRcdHZhciBlbmQgPSBfdmFsdWVzRW5kW3Byb3BlcnR5XTtcblxuXHRcdFx0aWYgKGVuZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cblx0XHRcdFx0X29iamVjdFtwcm9wZXJ0eV0gPSBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uKGVuZCwgdmFsdWUpO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdC8vIFBhcnNlcyByZWxhdGl2ZSBlbmQgdmFsdWVzIHdpdGggc3RhcnQgYXMgYmFzZSAoZS5nLjogKzEwLCAtMylcblx0XHRcdFx0aWYgKHR5cGVvZiAoZW5kKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRlbmQgPSBzdGFydCArIHBhcnNlRmxvYXQoZW5kLCAxMCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBQcm90ZWN0IGFnYWluc3Qgbm9uIG51bWVyaWMgcHJvcGVydGllcy5cblx0XHRcdFx0aWYgKHR5cGVvZiAoZW5kKSA9PT0gJ251bWJlcicpIHtcblx0XHRcdFx0XHRfb2JqZWN0W3Byb3BlcnR5XSA9IHN0YXJ0ICsgKGVuZCAtIHN0YXJ0KSAqIHZhbHVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGlmIChfb25VcGRhdGVDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0X29uVXBkYXRlQ2FsbGJhY2suY2FsbChfb2JqZWN0LCB2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0aWYgKGVsYXBzZWQgPT09IDEpIHtcblxuXHRcdFx0aWYgKF9yZXBlYXQgPiAwKSB7XG5cblx0XHRcdFx0aWYgKGlzRmluaXRlKF9yZXBlYXQpKSB7XG5cdFx0XHRcdFx0X3JlcGVhdC0tO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVhc3NpZ24gc3RhcnRpbmcgdmFsdWVzLCByZXN0YXJ0IGJ5IG1ha2luZyBzdGFydFRpbWUgPSBub3dcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBfdmFsdWVzU3RhcnRSZXBlYXQpIHtcblxuXHRcdFx0XHRcdGlmICh0eXBlb2YgKF92YWx1ZXNFbmRbcHJvcGVydHldKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldICsgcGFyc2VGbG9hdChfdmFsdWVzRW5kW3Byb3BlcnR5XSwgMTApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdFx0dmFyIHRtcCA9IF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV07XG5cblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzRW5kW3Byb3BlcnR5XTtcblx0XHRcdFx0XHRcdF92YWx1ZXNFbmRbcHJvcGVydHldID0gdG1wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRfcmV2ZXJzZWQgPSAhX3JldmVyc2VkO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0X3N0YXJ0VGltZSA9IHRpbWUgKyBfZGVsYXlUaW1lO1xuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdGlmIChfb25Db21wbGV0ZUNhbGxiYWNrICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0X29uQ29tcGxldGVDYWxsYmFjay5jYWxsKF9vYmplY3QpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKyspIHtcblx0XHRcdFx0XHQvLyBNYWtlIHRoZSBjaGFpbmVkIHR3ZWVucyBzdGFydCBleGFjdGx5IGF0IHRoZSB0aW1lIHRoZXkgc2hvdWxkLFxuXHRcdFx0XHRcdC8vIGV2ZW4gaWYgdGhlIGB1cGRhdGUoKWAgbWV0aG9kIHdhcyBjYWxsZWQgd2F5IHBhc3QgdGhlIGR1cmF0aW9uIG9mIHRoZSB0d2VlblxuXHRcdFx0XHRcdF9jaGFpbmVkVHdlZW5zW2ldLnN0YXJ0KF9zdGFydFRpbWUgKyBfZHVyYXRpb24pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHR9O1xuXG59O1xuXG5cblRXRUVOLkVhc2luZyA9IHtcblxuXHRMaW5lYXI6IHtcblxuXHRcdE5vbmU6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhZHJhdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiAoMiAtIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC0gMC41ICogKC0tayAqIChrIC0gMikgLSAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEN1YmljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiBrICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFydGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtICgtLWsgKiBrICogayAqIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoKGsgLT0gMikgKiBrICogayAqIGsgLSAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1aW50aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKChrIC09IDIpICogayAqIGsgKiBrICogayArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0U2ludXNvaWRhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5jb3MoayAqIE1hdGguUEkgLyAyKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNpbihrICogTWF0aC5QSSAvIDIpO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RXhwb25lbnRpYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMCA/IDAgOiBNYXRoLnBvdygxMDI0LCBrIC0gMSk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMSA/IDEgOiAxIC0gTWF0aC5wb3coMiwgLSAxMCAqIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIE1hdGgucG93KDEwMjQsIGsgLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgtIE1hdGgucG93KDIsIC0gMTAgKiAoayAtIDEpKSArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q2lyY3VsYXI6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguc3FydCgxIC0gayAqIGspO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gLSAwLjUgKiAoTWF0aC5zcXJ0KDEgLSBrICogaykgLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqIChNYXRoLnNxcnQoMSAtIChrIC09IDIpICogaykgKyAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEVsYXN0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcztcblx0XHRcdHZhciBhID0gMC4xO1xuXHRcdFx0dmFyIHAgPSAwLjQ7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFhIHx8IGEgPCAxKSB7XG5cdFx0XHRcdGEgPSAxO1xuXHRcdFx0XHRzID0gcCAvIDQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzID0gcCAqIE1hdGguYXNpbigxIC8gYSkgLyAoMiAqIE1hdGguUEkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gLSAoYSAqIE1hdGgucG93KDIsIDEwICogKGsgLT0gMSkpICogTWF0aC5zaW4oKGsgLSBzKSAqICgyICogTWF0aC5QSSkgLyBwKSk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcztcblx0XHRcdHZhciBhID0gMC4xO1xuXHRcdFx0dmFyIHAgPSAwLjQ7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFhIHx8IGEgPCAxKSB7XG5cdFx0XHRcdGEgPSAxO1xuXHRcdFx0XHRzID0gcCAvIDQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzID0gcCAqIE1hdGguYXNpbigxIC8gYSkgLyAoMiAqIE1hdGguUEkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gKGEgKiBNYXRoLnBvdygyLCAtIDEwICogaykgKiBNYXRoLnNpbigoayAtIHMpICogKDIgKiBNYXRoLlBJKSAvIHApICsgMSk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzO1xuXHRcdFx0dmFyIGEgPSAwLjE7XG5cdFx0XHR2YXIgcCA9IDAuNDtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWEgfHwgYSA8IDEpIHtcblx0XHRcdFx0YSA9IDE7XG5cdFx0XHRcdHMgPSBwIC8gNDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHMgPSBwICogTWF0aC5hc2luKDEgLyBhKSAvICgyICogTWF0aC5QSSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIC0gMC41ICogKGEgKiBNYXRoLnBvdygyLCAxMCAqIChrIC09IDEpKSAqIE1hdGguc2luKChrIC0gcykgKiAoMiAqIE1hdGguUEkpIC8gcCkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYSAqIE1hdGgucG93KDIsIC0xMCAqIChrIC09IDEpKSAqIE1hdGguc2luKChrIC0gcykgKiAoMiAqIE1hdGguUEkpIC8gcCkgKiAwLjUgKyAxO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0QmFjazoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogKChzICsgMSkgKiBrIC0gcyk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogKChzICsgMSkgKiBrICsgcykgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTggKiAxLjUyNTtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogKGsgKiBrICogKChzICsgMSkgKiBrIC0gcykpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKChrIC09IDIpICogayAqICgocyArIDEpICogayArIHMpICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCb3VuY2U6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KDEgLSBrKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrIDwgKDEgLyAyLjc1KSkge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogayAqIGs7XG5cdFx0XHR9IGVsc2UgaWYgKGsgPCAoMiAvIDIuNzUpKSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoayAtPSAoMS41IC8gMi43NSkpICogayArIDAuNzU7XG5cdFx0XHR9IGVsc2UgaWYgKGsgPCAoMi41IC8gMi43NSkpIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjI1IC8gMi43NSkpICogayArIDAuOTM3NTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi42MjUgLyAyLjc1KSkgKiBrICsgMC45ODQzNzU7XG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrIDwgMC41KSB7XG5cdFx0XHRcdHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLkluKGsgKiAyKSAqIDAuNTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuT3V0KGsgKiAyIC0gMSkgKiAwLjUgKyAwLjU7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG5UV0VFTi5JbnRlcnBvbGF0aW9uID0ge1xuXG5cdExpbmVhcjogZnVuY3Rpb24gKHYsIGspIHtcblxuXHRcdHZhciBtID0gdi5sZW5ndGggLSAxO1xuXHRcdHZhciBmID0gbSAqIGs7XG5cdFx0dmFyIGkgPSBNYXRoLmZsb29yKGYpO1xuXHRcdHZhciBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuTGluZWFyO1xuXG5cdFx0aWYgKGsgPCAwKSB7XG5cdFx0XHRyZXR1cm4gZm4odlswXSwgdlsxXSwgZik7XG5cdFx0fVxuXG5cdFx0aWYgKGsgPiAxKSB7XG5cdFx0XHRyZXR1cm4gZm4odlttXSwgdlttIC0gMV0sIG0gLSBmKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZm4odltpXSwgdltpICsgMSA+IG0gPyBtIDogaSArIDFdLCBmIC0gaSk7XG5cblx0fSxcblxuXHRCZXppZXI6IGZ1bmN0aW9uICh2LCBrKSB7XG5cblx0XHR2YXIgYiA9IDA7XG5cdFx0dmFyIG4gPSB2Lmxlbmd0aCAtIDE7XG5cdFx0dmFyIHB3ID0gTWF0aC5wb3c7XG5cdFx0dmFyIGJuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5CZXJuc3RlaW47XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8PSBuOyBpKyspIHtcblx0XHRcdGIgKz0gcHcoMSAtIGssIG4gLSBpKSAqIHB3KGssIGkpICogdltpXSAqIGJuKG4sIGkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBiO1xuXG5cdH0sXG5cblx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKHYsIGspIHtcblxuXHRcdHZhciBtID0gdi5sZW5ndGggLSAxO1xuXHRcdHZhciBmID0gbSAqIGs7XG5cdFx0dmFyIGkgPSBNYXRoLmZsb29yKGYpO1xuXHRcdHZhciBmbiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQ2F0bXVsbFJvbTtcblxuXHRcdGlmICh2WzBdID09PSB2W21dKSB7XG5cblx0XHRcdGlmIChrIDwgMCkge1xuXHRcdFx0XHRpID0gTWF0aC5mbG9vcihmID0gbSAqICgxICsgaykpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZm4odlsoaSAtIDEgKyBtKSAlIG1dLCB2W2ldLCB2WyhpICsgMSkgJSBtXSwgdlsoaSArIDIpICUgbV0sIGYgLSBpKTtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdGlmIChrIDwgMCkge1xuXHRcdFx0XHRyZXR1cm4gdlswXSAtIChmbih2WzBdLCB2WzBdLCB2WzFdLCB2WzFdLCAtZikgLSB2WzBdKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPiAxKSB7XG5cdFx0XHRcdHJldHVybiB2W21dIC0gKGZuKHZbbV0sIHZbbV0sIHZbbSAtIDFdLCB2W20gLSAxXSwgZiAtIG0pIC0gdlttXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmbih2W2kgPyBpIC0gMSA6IDBdLCB2W2ldLCB2W20gPCBpICsgMSA/IG0gOiBpICsgMV0sIHZbbSA8IGkgKyAyID8gbSA6IGkgKyAyXSwgZiAtIGkpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0VXRpbHM6IHtcblxuXHRcdExpbmVhcjogZnVuY3Rpb24gKHAwLCBwMSwgdCkge1xuXG5cdFx0XHRyZXR1cm4gKHAxIC0gcDApICogdCArIHAwO1xuXG5cdFx0fSxcblxuXHRcdEJlcm5zdGVpbjogZnVuY3Rpb24gKG4sIGkpIHtcblxuXHRcdFx0dmFyIGZjID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5GYWN0b3JpYWw7XG5cblx0XHRcdHJldHVybiBmYyhuKSAvIGZjKGkpIC8gZmMobiAtIGkpO1xuXG5cdFx0fSxcblxuXHRcdEZhY3RvcmlhbDogKGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0dmFyIGEgPSBbMV07XG5cblx0XHRcdHJldHVybiBmdW5jdGlvbiAobikge1xuXG5cdFx0XHRcdHZhciBzID0gMTtcblxuXHRcdFx0XHRpZiAoYVtuXSkge1xuXHRcdFx0XHRcdHJldHVybiBhW25dO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IG47IGkgPiAxOyBpLS0pIHtcblx0XHRcdFx0XHRzICo9IGk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhW25dID0gcztcblx0XHRcdFx0cmV0dXJuIHM7XG5cblx0XHRcdH07XG5cblx0XHR9KSgpLFxuXG5cdFx0Q2F0bXVsbFJvbTogZnVuY3Rpb24gKHAwLCBwMSwgcDIsIHAzLCB0KSB7XG5cblx0XHRcdHZhciB2MCA9IChwMiAtIHAwKSAqIDAuNTtcblx0XHRcdHZhciB2MSA9IChwMyAtIHAxKSAqIDAuNTtcblx0XHRcdHZhciB0MiA9IHQgKiB0O1xuXHRcdFx0dmFyIHQzID0gdCAqIHQyO1xuXG5cdFx0XHRyZXR1cm4gKDIgKiBwMSAtIDIgKiBwMiArIHYwICsgdjEpICogdDMgKyAoLSAzICogcDEgKyAzICogcDIgLSAyICogdjAgLSB2MSkgKiB0MiArIHYwICogdCArIHAxO1xuXG5cdFx0fVxuXG5cdH1cblxufTtcblxuLy8gVU1EIChVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24pXG4oZnVuY3Rpb24gKHJvb3QpIHtcblxuXHRpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG5cblx0XHQvLyBBTURcblx0XHRkZWZpbmUoW10sIGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBUV0VFTjtcblx0XHR9KTtcblxuXHR9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuXG5cdFx0Ly8gTm9kZS5qc1xuXHRcdG1vZHVsZS5leHBvcnRzID0gVFdFRU47XG5cblx0fSBlbHNlIHtcblxuXHRcdC8vIEdsb2JhbCB2YXJpYWJsZVxuXHRcdHJvb3QuVFdFRU4gPSBUV0VFTjtcblxuXHR9XG5cbn0pKHRoaXMpO1xuIl19