/**
 *
 * ANNAKUT LOOT
 * ----
 * Temple-Run style game themed around Annakut, created by Pushtiseva App.
 *
 */

/**
 * Constants used in this game.
 */
var Colors = {
	saffron: 0xFF9933,        // Saffron for devotion
	deepRed: 0x990000,        // Deep red for tradition
	gold: 0xFFD700,           // Gold for prosperity
	maroon: 0x800000,         // Maroon for devotion
	orange: 0xFFA500,         // Orange for spirituality
	yellow: 0xFFFF00,         // Yellow for knowledge
	white: 0xFFFFFF,          // White for purity
	black: 0x000000,          // Black for contrast
	brown: 0x8B4513,          // Brown for earth
	peach: 0xFFDAB9,          // Peach for skin tones
	sandstone: 0xC2B280,      // Sandstone for temple
	mountainDark: 0x4a3b2b,   // Dark mountain shade
	mountainLight: 0x9b7653,  // Light mountain shade
	eveningSkyTop: 0x1e2460,  // Deep blue for sky top
	eveningSkyBottom: 0xff7e47, // Warm orange for horizon
	sunsetGlow: 0xff5e62,     // Warm sunset color
	sunsetCloud: 0xff9999     // Pink clouds
};

var deg2Rad = Math.PI / 180;

// Make a new world when the page is loaded.
window.addEventListener('load', function(){
	new World();
});

/** 
 *
 * THE WORLD
 * 
 * The world in which Boxy Run takes place.
 *
 */

/** 
  * A class of which the world is an instance. Initializes the game
  * and contains the main game loop.
  *
  */
function World() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Scoped variables in this world.
	var element, scene, camera, character, renderer, light,
		objects, coins, paused, keysAllowed, score, difficulty,
		treePresenceProb, maxTreeSize, fogDistance, gameOver, coinCount;

	// Initialize the world.
	init();
	
	/**
	  * Builds the renderer, scene, lights, camera, and the character,
	  * then begins the rendering loop.
	  */
	function init() {

		// Locate where the world is to be located on the screen.
		element = document.getElementById('world');

		// Initialize the renderer.
		renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true
		});
		renderer.setSize(element.clientWidth, element.clientHeight);
		renderer.shadowMap.enabled = true;
		element.appendChild(renderer.domElement);

		// Initialize the scene.
		scene = new THREE.Scene();
		fogDistance = 150000;
		scene.fog = new THREE.Fog(Colors.eveningSkyBottom, 1000, fogDistance);

		// Initialize the camera with field of view, aspect ratio,
		// near plane, and far plane.
		camera = new THREE.PerspectiveCamera(
			60, element.clientWidth / element.clientHeight, 1, 120000);
		camera.position.set(0, 1500, -2000);
		camera.lookAt(new THREE.Vector3(0, 600, -5000));
		window.camera = camera;

		// Set up resizing capabilities.
		window.addEventListener('resize', handleWindowResize, false);

		// Initialize the lights.
		light = new THREE.HemisphereLight(Colors.sunsetGlow, Colors.eveningSkyTop, 1);
		scene.add(light);

		// Initialize the character and add it to the scene.
		character = new Character();
		scene.add(character.element);

		var ground = createBox(3000, 20, 120000, Colors.sandstone, 0, -400, -60000);
		scene.add(ground);

		objects = [];
		coins = [];
		treePresenceProb = 0.2;
		maxTreeSize = 0.5;
		for (var i = 10; i < 40; i++) {
			createRowOfTrees(i * -3000, treePresenceProb, 0.5, maxTreeSize);
		}

		// The game is paused to begin with and the game is not over.
		gameOver = false;
		paused = true;

		// Start receiving feedback from the player.
		var left = 37;
		var up = 38;
		var right = 39;
		var p = 80;
		
		keysAllowed = {};
		document.addEventListener(
			'keydown',
			function(e) {
				if (!gameOver) {
					var key = e.keyCode;
					if (keysAllowed[key] === false) return;
					keysAllowed[key] = false;
					if (paused && !collisionsDetected() && key > 18) {
						paused = false;
						character.onUnpause();
						document.getElementById(
							"variable-content").style.visibility = "hidden";
						document.getElementById(
							"controls").style.display = "none";
					} else {
						if (key == p) {
							paused = true;
							character.onPause();
							document.getElementById(
								"variable-content").style.visibility = "visible";
							document.getElementById(
								"variable-content").innerHTML = 
								"Game is paused. Press any key to resume.";
						}
						if (key == up && !paused) {
							character.onUpKeyPressed();
						}
						if (key == left && !paused) {
							character.onLeftKeyPressed();
						}
						if (key == right && !paused) {
							character.onRightKeyPressed();
						}
					}
				}
			}
		);
		document.addEventListener(
			'keyup',
			function(e) {
				keysAllowed[e.keyCode] = true;
			}
		);
		document.addEventListener(
			'focus',
			function(e) {
				keysAllowed = {};
			}
		);

		// Initialize the scores, difficulty, and coins
		score = 0;
		coinCount = 0;
		difficulty = 0;
		document.getElementById("score").innerHTML = score;
		document.getElementById("coins").innerHTML = coinCount;

		// Create sunset background
		createSunsetBackground();

		// Update lighting for sunset
		light = new THREE.HemisphereLight(Colors.sunsetGlow, Colors.eveningSkyTop, 1);
		scene.add(light);

		// Add directional light for sunset effect
		var sunLight = new THREE.DirectionalLight(Colors.sunsetGlow, 1);
		sunLight.position.set(-1, 0.5, -1);
		scene.add(sunLight);

		// Add ambient light for overall scene brightness
		var ambientLight = new THREE.AmbientLight(0x555555, 0.5);
		scene.add(ambientLight);

		// Begin the rendering loop.
		loop();

	}
	
	/**
	  * The main animation loop.
	  */
	function loop() {

		// Update the game.
		if (!paused) {

			// Add more trees and increase the difficulty.
			if ((objects[objects.length - 1].mesh.position.z) % 3000 == 0) {
				difficulty += 1;
				var levelLength = 30;
				if (difficulty % levelLength == 0) {
					var level = difficulty / levelLength;
					switch (level) {
						case 1:
							treePresenceProb = 0.35;
							maxTreeSize = 0.6;
							break;
						case 2:
							treePresenceProb = 0.35;
							maxTreeSize = 0.9;
							break;
						case 3:
							treePresenceProb = 0.4;
							maxTreeSize = 1.0;
							break;
						case 4:
							treePresenceProb = 0.4;
							maxTreeSize = 1.2;
							break;
						case 5:
							treePresenceProb = 0.45;
							maxTreeSize = 1.3;
							break;
						case 6:
							treePresenceProb = 0.45;
							maxTreeSize = 1.4;
							break;
						default:
							treePresenceProb = 0.5;
							maxTreeSize = 1.5;
					}
				}
				if ((difficulty >= 5 * levelLength && difficulty < 6 * levelLength)) {
					fogDistance -= (25000 / levelLength);
				} else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
					fogDistance -= (5000 / levelLength);
				}
				createRowOfTrees(-120000, treePresenceProb, 0.5, maxTreeSize);
				scene.fog.far = fogDistance;
			}

			// Move the trees closer to the character.
			objects.forEach(function(object) {
				object.mesh.position.z += 100;
			});

			// Remove trees that are outside of the world.
			objects = objects.filter(function(object) {
				return object.mesh.position.z < 0;
			});

			// Update and check coins
			coins.forEach(function(coin) {
				coin.mesh.position.z += 100;
				coin.rotate();
			});

			// Check coin collisions with better character hitbox
			coins = coins.filter(function(coin) {
				if (coin.collides(
					character.element.position.x - 150,  // Wider collision box
					character.element.position.x + 150,
					character.element.position.y - 350,  // Higher collision box
					character.element.position.y + 350,
					character.element.position.z - 60,   // Deeper collision box
					character.element.position.z + 60
				)) {
					scene.remove(coin.mesh);
					score += 100;
					coinCount++;
					document.getElementById("score").innerHTML = score;
					document.getElementById("coins").innerHTML = coinCount;
					
					// Play coin collection effect
					coin.collect(); // Trigger collection animation
					
					return false;
				}
				return true;
			});

			// Remove coins that are out of view
			coins = coins.filter(function(coin) {
				if (coin.mesh.position.z >= 0) {
					scene.remove(coin.mesh);
					return false;
				}
				return true;
			});

			// Make the character move according to the controls.
			character.update();

			// Check for collisions between the character and objects.
			if (collisionsDetected()) {
				gameOver = true;
				paused = true;
				document.addEventListener(
        			'keydown',
        			function(e) {
        				if (e.keyCode == 40)
            			document.location.reload(true);
        			}
    			);
    			var variableContent = document.getElementById("variable-content");
    			variableContent.style.visibility = "visible";
    			variableContent.innerHTML = 
    				"Game over! You collected " + coinCount + " coins! Press the down arrow to try again.";
    			var table = document.getElementById("ranks");
    			var rankNames = [
                    "Novice Sevak",          // 0-15k
                    "Temple Helper",          // 15k-30k
                    "Dedicated Devotee",      // 30k-45k
                    "Annakut Assistant",      // 45k-60k
                    "Prasad Master",          // 60k-75k
                    "Seva Champion",          // 75k-90k
                    "Bhog Expert",            // 90k-105k
                    "Maharaj's Blessing"      // 105k+
                ];
    			var rankIndex = Math.floor(score / 15000);

				// If applicable, display the next achievable rank.
				if (score < 124000) {
					var nextRankRow = table.insertRow(0);
					nextRankRow.insertCell(0).innerHTML = (rankIndex <= 5)
						? "".concat((rankIndex + 1) * 15, "k-", (rankIndex + 2) * 15, "k")
						: (rankIndex == 6)
							? "105k-124k"
							: "124k+";
					nextRankRow.insertCell(1).innerHTML = "*Score within this range to earn the next rank*";
				}

				// Display the achieved rank.
				var achievedRankRow = table.insertRow(0);
				achievedRankRow.insertCell(0).innerHTML = (rankIndex <= 6)
					? "".concat(rankIndex * 15, "k-", (rankIndex + 1) * 15, "k").bold()
					: (score < 124000)
						? "105k-124k".bold()
						: "124k+".bold();
				achievedRankRow.insertCell(1).innerHTML = (rankIndex <= 6)
					? "Congrats! You're a ".concat(rankNames[rankIndex], "!").bold()
					: (score < 124000)
						? "Congrats! You're a ".concat(rankNames[7], "!").bold()
						: "Congrats! You exceeded the creator's high score of 123790 and beat the game!".bold();

    			// Display all ranks lower than the achieved rank.
    			if (score >= 120000) {
    				rankIndex = 7;
    			}
    			for (var i = 0; i < rankIndex; i++) {
    				var row = table.insertRow(i);
    				row.insertCell(0).innerHTML = "".concat(i * 15, "k-", (i + 1) * 15, "k");
    				row.insertCell(1).innerHTML = rankNames[i];
    			}
    			if (score > 124000) {
    				var row = table.insertRow(7);
    				row.insertCell(0).innerHTML = "105k-124k";
    				row.insertCell(1).innerHTML = rankNames[7];
    			}

			}

			// Update the scores.
			score += 10;
			document.getElementById("score").innerHTML = score;

		}

		// Render the page and repeat.
		renderer.render(scene, camera);
		requestAnimationFrame(loop);
	}

	/**
	  * A method called when window is resized.
	  */
	function handleWindowResize() {
		renderer.setSize(element.clientWidth, element.clientHeight);
		camera.aspect = element.clientWidth / element.clientHeight;
		camera.updateProjectionMatrix();
	}

	/**
	 * Creates and returns a row of trees according to the specifications.
	 *
	 * @param {number} POSITION The z-position of the row of trees.
 	 * @param {number} PROBABILITY The probability that a given lane in the row
 	 *                             has a tree.
 	 * @param {number} MINSCALE The minimum size of the trees. The trees have a 
 	 *							uniformly distributed size from minScale to maxScale.
 	 * @param {number} MAXSCALE The maximum size of the trees.
 	 *
	 */
	function createRowOfTrees(position, probability, minScale, maxScale) {
		for (var lane = -1; lane < 2; lane++) {
			var randomNumber = Math.random();
			if (randomNumber < probability) {
				// Base scale calculation
				var baseScale = minScale + (maxScale - minScale) * Math.random();
				
				// Additional scale variation based on difficulty
				var difficultyBonus = Math.min(difficulty / 100, 0.5); // Cap at 50% bonus
				var randomBonus = (Math.random() * 0.4 - 0.2) * difficultyBonus; // Random -20% to +20% of bonus
				
				// Final scale with minimum and maximum limits
				var finalScale = Math.min(Math.max(baseScale * (1 + randomBonus), minScale), maxScale * 1.5);
				
				var tree = new Tree(lane * 800, -400, position, finalScale);
				objects.push(tree);
				scene.add(tree.mesh);
			} else if (Math.random() < 0.5) { // 50% chance to add coin if no obstacle
				// Place coin at ground level (-400 + 40 for half coin height)
				var coin = new Coin(lane * 800, -360, position, scene);
				coins.push(coin);
				scene.add(coin.mesh);
			}
		}
	}

	/**
	 * Returns true if and only if the character is currently colliding with
	 * an object on the map.
	 */
 	function collisionsDetected() {
 		var charMinX = character.element.position.x - 115;
 		var charMaxX = character.element.position.x + 115;
 		var charMinY = character.element.position.y - 310;
 		var charMaxY = character.element.position.y + 320;
 		var charMinZ = character.element.position.z - 40;
 		var charMaxZ = character.element.position.z + 40;
 		for (var i = 0; i < objects.length; i++) {
 			if (objects[i].collides(charMinX, charMaxX, charMinY, 
 					charMaxY, charMinZ, charMaxZ)) {
 				return true;
 			}
 		}
 		return false;
 	}
	
	/**
	 * Creates a sunset background.
	 */
	function createSunsetBackground() {
		// Create gradient sky
		var skyGeometry = new THREE.PlaneGeometry(400000, 100000);
		var skyMaterial = new THREE.ShaderMaterial({
			uniforms: {
				topColor: { value: new THREE.Color(Colors.eveningSkyTop) },
				bottomColor: { value: new THREE.Color(Colors.eveningSkyBottom) }
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 topColor;
				uniform vec3 bottomColor;
				varying vec2 vUv;
				void main() {
					gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
				}
			`,
			side: THREE.DoubleSide,
			fog: false
		});
		var sky = new THREE.Mesh(skyGeometry, skyMaterial);
		sky.position.set(0, 35000, -180000);
		scene.add(sky);

		// Add mountains in the background
		function createMountain(x, z, scale) {
			var mountain = new THREE.Group();
			
			// Main peak
			var mainPeak = createCylinder(
				0, 8000 * scale, 15000 * scale, 4,
				Colors.mountainDark,
				0, 0, 0
			);
			mainPeak.rotation.y = Math.PI / 4;
			mountain.add(mainPeak);

			// Secondary peaks
			var sidePeak1 = createCylinder(
				0, 6000 * scale, 12000 * scale, 4,
				Colors.mountainLight,
				4000 * scale, -1500 * scale, 2000 * scale
			);
			sidePeak1.rotation.y = Math.PI / 3;
			mountain.add(sidePeak1);

			var sidePeak2 = createCylinder(
				0, 5000 * scale, 10000 * scale, 4,
				Colors.mountainDark,
				-3000 * scale, -2500 * scale, -1000 * scale
			);
			sidePeak2.rotation.y = -Math.PI / 6;
			mountain.add(sidePeak2);

			mountain.position.set(x, -2000, z);
			return mountain;
		}

		// Add castle in the background
		function createCastle(x, z, scale) {
			var castle = new THREE.Group();

			// Main tower
			var mainTower = createCylinder(
				2000 * scale, 2000 * scale, 12000 * scale, 8,
				Colors.grey,
				0, 0, 0
			);
			castle.add(mainTower);

			// Tower top
			var towerTop = createCylinder(
				2200 * scale, 2000 * scale, 1000 * scale, 8,
				Colors.grey,
				0, 6000 * scale, 0
			);
			castle.add(towerTop);

			// Side towers
			function createSideTower(x, z) {
				var tower = createCylinder(
					1000 * scale, 1000 * scale, 8000 * scale, 8,
					Colors.grey,
					x, -2000 * scale, z
				);
				castle.add(tower);

				var top = createCylinder(
					1200 * scale, 1000 * scale, 800 * scale, 8,
					Colors.grey,
					x, 2000 * scale, z
				);
				castle.add(top);
			}

			createSideTower(3000 * scale, 3000 * scale);
			createSideTower(-3000 * scale, 3000 * scale);
			createSideTower(3000 * scale, -3000 * scale);
			createSideTower(-3000 * scale, -3000 * scale);

			castle.position.set(x, 0, z);
			return castle;
		}

		// Add mountains at different distances
		var mountains = [
			createMountain(-80000, -150000, 1.5),
			createMountain(-40000, -160000, 1.2),
			createMountain(0, -155000, 1.3),
			createMountain(40000, -165000, 1.4),
			createMountain(80000, -150000, 1.6)
		];
		mountains.forEach(mountain => scene.add(mountain));

		// Add castle
		var castle = createCastle(0, -140000, 1);
		scene.add(castle);

		// Add sun
		var sunGeometry = new THREE.CircleGeometry(15000, 32);
		var sunMaterial = new THREE.MeshBasicMaterial({
			color: Colors.sunsetGlow,
			transparent: true,
			opacity: 0.8,
			fog: false
		});
		var sun = new THREE.Mesh(sunGeometry, sunMaterial);
		sun.position.set(-40000, 30000, -170000);
		scene.add(sun);

		// Add sun glow
		var glowGeometry = new THREE.CircleGeometry(20000, 32);
		var glowMaterial = new THREE.MeshBasicMaterial({
			color: Colors.sunsetGlow,
			transparent: true,
			opacity: 0.4,
			fog: false
		});
		var glow = new THREE.Mesh(glowGeometry, glowMaterial);
		glow.position.copy(sun.position);
		scene.add(glow);

		// Add clouds
		function createCloud(x, y, z, scale) {
			var cloud = new THREE.Group();
			var cloudMaterial = new THREE.MeshPhongMaterial({
				color: Colors.sunsetCloud,
				transparent: true,
				opacity: 0.8,
				fog: false
			});

			for(var i = 0; i < 5; i++) {
				var cloudPiece = new THREE.Mesh(
					new THREE.SphereGeometry(2000, 16, 16),
					cloudMaterial
				);
				cloudPiece.position.set(
					i * 3000 * Math.random(),
					Math.random() * 1000,
					Math.random() * 1000
				);
				cloudPiece.scale.set(scale, scale * 0.6, scale);
				cloud.add(cloudPiece);
			}
			cloud.position.set(x, y, z);
			return cloud;
		}

		// Add several clouds
		for(var i = 0; i < 8; i++) {
			var cloud = createCloud(
				-60000 + Math.random() * 120000,
				35000 + Math.random() * 15000,
				-160000,
				1 + Math.random()
			);
			scene.add(cloud);
		}
	}

}

/** 
 *
 * IMPORTANT OBJECTS
 * 
 * The character and environmental objects in the game.
 *
 */

/**
 * The player's character in the game.
 */
function Character() {

	// Explicit binding of this even in changing contexts.
	var self = this;

	// Character defaults that don't change throughout the game.
	this.skinColor = Colors.peach;
	this.hairColor = Colors.black;
	this.shirtColor = Colors.saffron;
	this.shortsColor = Colors.maroon;
	this.jumpDuration = 0.6;
	this.jumpHeight = 2000;

	// Initialize the character.
	init();

	/**
	  * Builds the character in depth-first order. The parts of are 
  	  * modelled by the following object hierarchy:
	  *
	  * - character (this.element)
	  *    - head
	  *       - face
	  *       - hair
	  *    - torso
	  *    - leftArm
	  *       - leftLowerArm
	  *    - rightArm
	  *       - rightLowerArm
	  *    - leftLeg
	  *       - rightLowerLeg
	  *    - rightLeg
	  *       - rightLowerLeg
	  *
	  * Also set up the starting values for evolving parameters throughout
	  * the game.
	  * 
	  */
	function init() {

		// Build the character.
		self.face = createBox(100, 100, 60, self.skinColor, 0, 0, 0);
		self.hair = createBox(105, 20, 65, self.hairColor, 0, 50, 0);
		self.head = createGroup(0, 260, -25);
		self.head.add(self.face);
		self.head.add(self.hair);

		self.torso = createBox(150, 190, 40, self.shirtColor, 0, 100, 0);

		self.leftLowerArm = createLimb(20, 120, 30, self.skinColor, 0, -170, 0);
		self.leftArm = createLimb(30, 140, 40, self.skinColor, -100, 190, -10);
		self.leftArm.add(self.leftLowerArm);

		self.rightLowerArm = createLimb(
			20, 120, 30, self.skinColor, 0, -170, 0);
		self.rightArm = createLimb(30, 140, 40, self.skinColor, 100, 190, -10);
		self.rightArm.add(self.rightLowerArm);

		self.leftLowerLeg = createLimb(40, 200, 40, self.skinColor, 0, -200, 0);
		self.leftLeg = createLimb(50, 170, 50, self.shortsColor, -50, -10, 30);
		self.leftLeg.add(self.leftLowerLeg);

		self.rightLowerLeg = createLimb(
			40, 200, 40, self.skinColor, 0, -200, 0);
		self.rightLeg = createLimb(50, 170, 50, self.shortsColor, 50, -10, 30);
		self.rightLeg.add(self.rightLowerLeg);

		self.element = createGroup(0, 0, -4000);
		self.element.add(self.head);
		self.element.add(self.torso);
		self.element.add(self.leftArm);
		self.element.add(self.rightArm);
		self.element.add(self.leftLeg);
		self.element.add(self.rightLeg);

		// Initialize the player's changing parameters.
		self.isJumping = false;
		self.isSwitchingLeft = false;
		self.isSwitchingRight = false;
		self.currentLane = 0;
		self.runningStartTime = new Date() / 1000;
		self.pauseStartTime = new Date() / 1000;
		self.stepFreq = 2;
		self.queuedActions = [];

	}

	/**
	 * Creates and returns a limb with an axis of rotation at the top.
	 *
	 * @param {number} DX The width of the limb.
	 * @param {number} DY The length of the limb.
	 * @param {number} DZ The depth of the limb.
	 * @param {color} COLOR The color of the limb.
	 * @param {number} X The x-coordinate of the rotation center.
	 * @param {number} Y The y-coordinate of the rotation center.
	 * @param {number} Z The z-coordinate of the rotation center.
	 * @return {THREE.GROUP} A group that includes a box representing
	 *                       the limb, with the specified properties.
	 *
	 */
	function createLimb(dx, dy, dz, color, x, y, z) {
	    var limb = createGroup(x, y, z);
	    var offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
		var limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
		limb.add(limbBox);
		return limb;
	}
	
	/**
	 * A method called on the character when time moves forward.
	 */
	this.update = function() {

		// Obtain the curren time for future calculations.
		var currentTime = new Date() / 1000;

		// Apply actions to the character if none are currently being
		// carried out.
		if (!self.isJumping &&
			!self.isSwitchingLeft &&
			!self.isSwitchingRight &&
			self.queuedActions.length > 0) {
			switch(self.queuedActions.shift()) {
				case "up":
					self.isJumping = true;
					self.jumpStartTime = new Date() / 1000;
					break;
				case "left":
					if (self.currentLane != -1) {
						self.isSwitchingLeft = true;
					}
					break;
				case "right":
					if (self.currentLane != 1) {
						self.isSwitchingRight = true;
					}
					break;
			}
		}

		// If the character is jumping, update the height of the character.
		// Otherwise, the character continues running.
		if (self.isJumping) {
			var jumpClock = currentTime - self.jumpStartTime;
			self.element.position.y = self.jumpHeight * Math.sin(
				(1 / self.jumpDuration) * Math.PI * jumpClock) +
				sinusoid(2 * self.stepFreq, 0, 20, 0,
					self.jumpStartTime - self.runningStartTime);
			if (jumpClock > self.jumpDuration) {
				self.isJumping = false;
				self.runningStartTime += self.jumpDuration;
			}
		} else {
			var runningClock = currentTime - self.runningStartTime;
			self.element.position.y = sinusoid(
				2 * self.stepFreq, 0, 20, 0, runningClock);
			self.head.rotation.x = sinusoid(
				2 * self.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
			self.torso.rotation.x = sinusoid(
				2 * self.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
			self.leftArm.rotation.x = sinusoid(
				self.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
			self.rightArm.rotation.x = sinusoid(
				self.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
			self.leftLowerArm.rotation.x = sinusoid(
				self.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
			self.rightLowerArm.rotation.x = sinusoid(
				self.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
			self.leftLeg.rotation.x = sinusoid(
				self.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
			self.rightLeg.rotation.x = sinusoid(
				self.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
			self.leftLowerLeg.rotation.x = sinusoid(
				self.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
			self.rightLowerLeg.rotation.x = sinusoid(
				self.stepFreq, -130, 5, 60, runningClock) * deg2Rad;

			// If the character is not jumping, it may be switching lanes.
			if (self.isSwitchingLeft) {
				self.element.position.x -= 200;
				var offset = self.currentLane * 800 - self.element.position.x;
				if (offset > 800) {
					self.currentLane -= 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingLeft = false;
				}
			}
			if (self.isSwitchingRight) {
				self.element.position.x += 200;
				var offset = self.element.position.x - self.currentLane * 800;
				if (offset > 800) {
					self.currentLane += 1;
					self.element.position.x = self.currentLane * 800;
					self.isSwitchingRight = false;
				}
			}
		}
	}

	/**
	  * Handles character activity when the left key is pressed.
	  */
	this.onLeftKeyPressed = function() {
		self.queuedActions.push("left");
	}

	/**
	  * Handles character activity when the up key is pressed.
	  */
	this.onUpKeyPressed = function() {
		self.queuedActions.push("up");
	}

	/**
	  * Handles character activity when the right key is pressed.
	  */
	this.onRightKeyPressed = function() {
		self.queuedActions.push("right");
	}

	/**
	  * Handles character activity when the game is paused.
	  */
	this.onPause = function() {
		self.pauseStartTime = new Date() / 1000;
	}

	/**
	  * Handles character activity when the game is unpaused.
	  */
	this.onUnpause = function() {
		var currentTime = new Date() / 1000;
		var pauseDuration = currentTime - self.pauseStartTime;
		self.runningStartTime += pauseDuration;
		if (self.isJumping) {
			self.jumpStartTime += pauseDuration;
		}
	}

}

/**
 * A person as an obstacle in the game positioned at X, Y, Z with scale S.
 */
function Tree(x, y, z, s) {
	var self = this;
	this.mesh = new THREE.Object3D();

	// More realistic skin and cloth colors with Annakut theme
	var skinTones = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0xffdbac];
	var clothColors = [Colors.saffron, Colors.deepRed, Colors.maroon, Colors.orange, Colors.gold];
	var bagColors = [Colors.brown, Colors.maroon, Colors.deepRed];

	// Random selections
	var skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
	var clothColor = clothColors[Math.floor(Math.random() * clothColors.length)];
	var bagColor = bagColors[Math.floor(Math.random() * bagColors.length)];

	// Random size variations for more realism
	var heightVariation = 0.9 + Math.random() * 0.3;  // Height varies from 0.9 to 1.2
	var widthVariation = 0.85 + Math.random() * 0.3;  // Width varies from 0.85 to 1.15
	var poseVariation = -0.1 + Math.random() * 0.2;   // Slight random pose variation

	// Create body parts with better proportions
	// Head with neck
	var head = createBox(
		70 * widthVariation, 
		90 * heightVariation, 
		70 * widthVariation, 
		skinColor, 
		0, 
		1000 * heightVariation, 
		0
	);

	var neck = createBox(
		40 * widthVariation,
		30 * heightVariation,
		40 * widthVariation,
		skinColor,
		0,
		940 * heightVariation,
		0
	);

	// Torso with realistic lean
	var torso = createBox(
		130 * widthVariation, 
		250 * heightVariation, 
		80 * widthVariation, 
		clothColor, 
		0, 
		800 * heightVariation, 
		0
	);
	torso.rotation.x = -0.15 + poseVariation; // Random slight forward lean

	// Large bag on back with realistic positioning
	var bagWidth = 160 * (0.8 + Math.random() * 0.4);
	var bagHeight = 200 * (0.8 + Math.random() * 0.4);
	var bag = createBox(
		bagWidth * widthVariation,
		bagHeight * heightVariation,
		120 * widthVariation,
		bagColor,
		0,
		820 * heightVariation,
		60
	);
	bag.rotation.x = 0.15 + poseVariation; // Align with torso

	// Arms with better positioning for carrying bag
	var leftArm = createBox(
		35 * widthVariation,
		180 * heightVariation,
		35 * widthVariation,
		skinColor,
		-80 * widthVariation,
		850 * heightVariation,
		20
	);
	leftArm.rotation.z = 0.2 + poseVariation;
	leftArm.rotation.x = -0.1;

	var rightArm = createBox(
		35 * widthVariation,
		180 * heightVariation,
		35 * widthVariation,
		skinColor,
		80 * widthVariation,
		850 * heightVariation,
		20
	);
	rightArm.rotation.z = -0.2 + poseVariation;
	rightArm.rotation.x = -0.1;

	// Legs with natural stance
	var leftLeg = createBox(
		50 * widthVariation,
		180 * heightVariation,
		50 * widthVariation,
		clothColor,
		-35 * widthVariation,
		600 * heightVariation,
		0
	);
	leftLeg.rotation.x = 0.05 + poseVariation;

	var rightLeg = createBox(
		50 * widthVariation,
		180 * heightVariation,
		50 * widthVariation,
		clothColor,
		35 * widthVariation,
		600 * heightVariation,
		0
	);
	rightLeg.rotation.x = 0.05 + poseVariation;

	// Add all parts to the mesh
	this.mesh.add(head);
	this.mesh.add(neck);
	this.mesh.add(torso);
	this.mesh.add(bag);
	this.mesh.add(leftArm);
	this.mesh.add(rightArm);
	this.mesh.add(leftLeg);
	this.mesh.add(rightLeg);

	// Random rotation for variety in poses
	this.mesh.rotation.y = (Math.random() - 0.5) * 0.2; // Slight random rotation

	// Position and scale
	this.mesh.position.set(x, y, z);
	this.mesh.scale.set(s, s, s);
	this.scale = s;

	// Adjust collision detection for more accurate human shape
	this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
		var personMinX = self.mesh.position.x - this.scale * 120;
		var personMaxX = self.mesh.position.x + this.scale * 120;
		var personMinY = self.mesh.position.y;
		var personMaxY = self.mesh.position.y + this.scale * 1100;
		var personMinZ = self.mesh.position.z - this.scale * 120;
		var personMaxZ = self.mesh.position.z + this.scale * 120;
		return personMinX <= maxX && personMaxX >= minX
			&& personMinY <= maxY && personMaxY >= minY
			&& personMinZ <= maxZ && personMaxZ >= minZ;
	}
}

/**
 * A collectible coin in the game.
 */
function Coin(x, y, z, sceneRef) {
	var self = this;
	this.scene = sceneRef;
	this.mesh = new THREE.Object3D();

	// Create the main coin body
	var coinGeometry = new THREE.CylinderGeometry(40, 40, 10, 32);
	var coinMaterial = new THREE.MeshPhongMaterial({
		color: Colors.gold,
		shininess: 100,
		specular: 0xFFD700,
		emissive: Colors.gold,
		emissiveIntensity: 0.6
	});
	var coin = new THREE.Mesh(coinGeometry, coinMaterial);
	coin.rotation.x = Math.PI / 2;

	// Add decorative details
	var ringGeometry = new THREE.TorusGeometry(30, 5, 16, 32);
	var ring = new THREE.Mesh(ringGeometry, coinMaterial);
	ring.rotation.x = Math.PI / 2;

	// Add inner design
	var innerRingGeometry = new THREE.TorusGeometry(20, 3, 16, 32);
	var innerRing = new THREE.Mesh(innerRingGeometry, coinMaterial);
	innerRing.rotation.x = Math.PI / 2;

	// Add glow effect
	var glowGeometry = new THREE.CylinderGeometry(45, 45, 5, 32);
	var glowMaterial = new THREE.MeshPhongMaterial({
		color: Colors.gold,
		transparent: true,
		opacity: 0.3,
		emissive: Colors.gold,
		emissiveIntensity: 1,
		shininess: 50
	});
	var glow = new THREE.Mesh(glowGeometry, glowMaterial);
	glow.rotation.x = Math.PI / 2;

	// Add sparkle effect
	var sparkleGeometry = new THREE.CircleGeometry(5, 4);
	var sparkleMaterial = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: 0.8
	});
	
	for (var i = 0; i < 4; i++) {
		var sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
		sparkle.position.set(
			Math.cos(i * Math.PI/2) * 35,
			Math.sin(i * Math.PI/2) * 35,
			0
		);
		sparkle.rotation.z = i * Math.PI/4;
		this.mesh.add(sparkle);
	}
	
	this.mesh.add(coin);
	this.mesh.add(ring);
	this.mesh.add(innerRing);
	this.mesh.add(glow);
	this.mesh.position.set(x, y, z);
	
	// Enhanced animation
	this.rotate = function() {
		// Coin rotation
		this.mesh.rotation.y += 0.1;
		
		// Gentle floating motion
		this.mesh.position.y = y + Math.sin(Date.now() * 0.003) * 10;
		
		// Sparkle rotation
		this.mesh.children.forEach(function(child, index) {
			if (child.geometry === sparkleGeometry) {
				child.rotation.z += 0.1;
				child.scale.x = 0.5 + Math.sin(Date.now() * 0.01 + index) * 0.5;
				child.scale.y = 0.5 + Math.sin(Date.now() * 0.01 + index) * 0.5;
			}
		});
	};

	// Collection effect
	this.collect = function() {
		var duration = 15;
		var scaleStep = 1/duration;
		
		function animate() {
			if (duration <= 0) {
				self.scene.remove(self.mesh);
				return;
			}
			
			self.mesh.scale.multiplyScalar(1 + scaleStep);
			duration--;
			
			requestAnimationFrame(animate);
		}
		
		animate();
	};

	// Collision detection
	this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
		var coinMinX = self.mesh.position.x - 60;
		var coinMaxX = self.mesh.position.x + 60;
		var coinMinY = self.mesh.position.y - 60;
		var coinMaxY = self.mesh.position.y + 60;
		var coinMinZ = self.mesh.position.z - 20;
		var coinMaxZ = self.mesh.position.z + 20;
		return coinMinX <= maxX && coinMaxX >= minX
			&& coinMinY <= maxY && coinMaxY >= minY
			&& coinMinZ <= maxZ && coinMaxZ >= minZ;
	};
}

/** 
 *
 * UTILITY FUNCTIONS
 * 
 * Functions that simplify and minimize repeated code.
 *
 */

/**
 * Utility function for generating current values of sinusoidally
 * varying variables.
 *
 * @param {number} FREQUENCY The number of oscillations per second.
 * @param {number} MINIMUM The minimum value of the sinusoid.
 * @param {number} MAXIMUM The maximum value of the sinusoid.
 * @param {number} PHASE The phase offset in degrees.
 * @param {number} TIME The time, in seconds, in the sinusoid's scope.
 * @return {number} The value of the sinusoid.
 *
 */
function sinusoid(frequency, minimum, maximum, phase, time) {
	var amplitude = 0.5 * (maximum - minimum);
	var angularFrequency = 2 * Math.PI * frequency;
	var phaseRadians = phase * Math.PI / 180;
	var offset = amplitude * Math.sin(
		angularFrequency * time + phaseRadians);
	var average = (minimum + maximum) / 2;
	return average + offset;
}

/**
 * Creates an empty group of objects at a specified location.
 *
 * @param {number} X The x-coordinate of the group.
 * @param {number} Y The y-coordinate of the group.
 * @param {number} Z The z-coordinate of the group.
 * @return {Three.Group} An empty group at the specified coordinates.
 *
 */
function createGroup(x, y, z) {
	var group = new THREE.Group();
	group.position.set(x, y, z);
	return group;
}

/**
 * Creates and returns a simple box with the specified properties.
 *
 * @param {number} DX The width of the box.
 * @param {number} DY The height of the box.
 * @param {number} DZ The depth of the box.
 * @param {color} COLOR The color of the box.
 * @param {number} X The x-coordinate of the center of the box.
 * @param {number} Y The y-coordinate of the center of the box.
 * @param {number} Z The z-coordinate of the center of the box.
 * @param {boolean} NOTFLATSHADING True iff the flatShading is false.
 * @return {THREE.Mesh} A box with the specified properties.
 *
 */
function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
    var geom = new THREE.BoxGeometry(dx, dy, dz);
    var mat = new THREE.MeshPhongMaterial({
		color:color, 
    	flatShading: notFlatShading != true
    });
    var box = new THREE.Mesh(geom, mat);
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(x, y, z);
    return box;
}

/**
 * Creates and returns a (possibly asymmetrical) cyinder with the 
 * specified properties.
 *
 * @param {number} RADIUSTOP The radius of the cylinder at the top.
 * @param {number} RADIUSBOTTOM The radius of the cylinder at the bottom.
 * @param {number} HEIGHT The height of the cylinder.
 * @param {number} RADIALSEGMENTS The number of segmented faces around 
 *                                the circumference of the cylinder.
 * @param {color} COLOR The color of the cylinder.
 * @param {number} X The x-coordinate of the center of the cylinder.
 * @param {number} Y The y-coordinate of the center of the cylinder.
 * @param {number} Z The z-coordinate of the center of the cylinder.
 * @return {THREE.Mesh} A box with the specified properties.
 */
function createCylinder(radiusTop, radiusBottom, height, radialSegments, 
						color, x, y, z) {
    var geom = new THREE.CylinderGeometry(
    	radiusTop, radiusBottom, height, radialSegments);
    var mat = new THREE.MeshPhongMaterial({
    	color: color,
    	flatShading: true
    });
    var cylinder = new THREE.Mesh(geom, mat);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.position.set(x, y, z);
    return cylinder;
}
