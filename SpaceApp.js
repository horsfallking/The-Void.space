const canvas = document.getElementById("space-canvas");
const ctx = canvas.getContext("2d");
const themeToggle = document.querySelector(".theme-toggle");
const engageButton = document.querySelector(".engage-button");
const statusText = document.querySelector(".status");
const messageText = document.querySelector(".message");

// These variables hold the live canvas size and all animated objects.
let width = 0;
let height = 0;
let stars = [];
let particles = [];
let asteroids = [];
let hugeFlybys = [];
let supernovas = [];
let blackHoles = [];
let startTime = performance.now();
let lastFrameTime = startTime;
let lastHugeFlybyExitTime = startTime;
let lastSupernovaTime = startTime;
let nextHugeFlybyId = 1;
let chaosMode = false;
let chaosStartedAt = 0;
const hugeFlybyInterval = 20000;
const supernovaInterval = 40000;
const gravityScale = 0.00011;
const spaceDrag = 0.9998;
const beltCentralMass = 52000;
const maxAsteroidSpeed = 9.5;
const collisionPadding = 4;
const asteroidSizeScale = 1.35;
let draggedAsteroid = null;
let collisionCooldowns = new Map();

// Resize the canvas for the actual screen size and rebuild positioned objects.
function resizeCanvas() {
    const scale = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    buildScene();
}

// Create the stars, dust, and asteroids using percentages of the window size.
function buildScene() {
    collisionCooldowns = new Map();
    hugeFlybys = [];
    supernovas = [];
    blackHoles = [];
    lastHugeFlybyExitTime = performance.now();
    lastSupernovaTime = performance.now();

    stars = [
        [0.08, 0.18, 1.8, 0.30, "#f8f0ff"],
        [0.16, 0.36, 0.8, 0.86, "#9d8cff"],
        [0.23, 0.12, 0.9, 0.72, "#c6baff"],
        [0.31, 0.27, 1.7, 0.42, "#f8f0ff"],
        [0.43, 0.16, 0.8, 0.92, "#8f83d8"],
        [0.52, 0.33, 1.8, 0.36, "#f2ecff"],
        [0.61, 0.11, 0.8, 0.82, "#a887ff"],
        [0.74, 0.24, 1.5, 0.48, "#e4c1ff"],
        [0.84, 0.14, 0.9, 0.78, "#b8abff"],
        [0.92, 0.38, 1.7, 0.40, "#f8f0ff"],
        [0.12, 0.72, 0.8, 0.88, "#8e82d6"],
        [0.36, 0.81, 1.6, 0.46, "#f2ecff"],
        [0.67, 0.75, 0.9, 0.76, "#a887ff"],
        [0.88, 0.68, 1.7, 0.34, "#f8f0ff"],
        [0.05, 0.48, 0.7, 0.96, "#7469b8"],
        [0.19, 0.86, 1.0, 0.68, "#c9c0ff"],
        [0.48, 0.58, 0.7, 0.98, "#6f64aa"],
        [0.57, 0.88, 1.1, 0.62, "#d9d1ff"],
        [0.78, 0.54, 0.8, 0.90, "#8579c8"],
        [0.96, 0.82, 1.0, 0.70, "#c6baff"],
    ].map(([x, y, size, distance, color], index) => ({
        x: x * width,
        y: y * height,
        size,
        distance,
        color,
        phase: index * 1.73,
        // Distant stars twinkle slowly and delicately instead of flashing.
        twinkleSpeed: 0.10 + (1 - distance) * 0.34,
        twinkleDepth: 0.04 + (1 - distance) * 0.12,
        flickerPhase: index * 2.41,
    }));

    // Add a deep field of tiny far stars so the background feels like real cosmic distance.
    const farStarColors = ["#f8f0ff", "#d9d1ff", "#b8abff", "#8579c8", "#77f2dc"];

    for (let index = 0; index < 150; index += 1) {
        const distance = randomBetween(0.72, 1);
        const size = randomBetween(0.28, 0.95) * (1.12 - distance * 0.42);
 
        stars.push({
            x: randomBetween(0, width),
            y: randomBetween(0, height),
            size,
            distance,
            color: farStarColors[index % farStarColors.length],
            phase: randomBetween(0, Math.PI * 2),
            // The farthest stars change almost imperceptibly, like atmospheric scintillation.
            twinkleSpeed: randomBetween(0.035, 0.16) * (1.15 - distance * 0.45),
            twinkleDepth: randomBetween(0.018, 0.07) * (1.12 - distance * 0.35),
            flickerPhase: randomBetween(0, Math.PI * 2),
        });
    }

    // One distant black hole sits in the background and visually bends nearby starlight.
    const blackHoleRadius = Math.min(width, height) * 0.035;

    blackHoles.push({
        x: width * randomBetween(0.18, 0.82),
        y: height * randomBetween(0.12, 0.42),
        radius: blackHoleRadius,
        lensRadius: blackHoleRadius * 8.5,
        lensStrength: blackHoleRadius * 0.42,
        rotation: randomBetween(0, Math.PI * 2),
        spinSpeed: randomBetween(0.018, 0.032),
    });

    particles = [
        [0.10, 0.24, 1.0, 0.16, "#21133b"],
        [0.18, 0.58, 1.2, 0.12, "#3a2b58"],
        [0.27, 0.42, 0.8, 0.14, "#f2ecff"],
        [0.36, 0.17, 1.0, 0.10, "#2a1a4a"],
        [0.45, 0.79, 1.2, 0.15, "#4b3570"],
        [0.54, 0.36, 0.8, 0.11, "#f2ecff"],
        [0.63, 0.68, 1.0, 0.13, "#2d1d4f"],
        [0.72, 0.48, 1.2, 0.09, "#3f2f63"],
        [0.80, 0.21, 0.8, 0.12, "#f2ecff"],
        [0.90, 0.74, 1.1, 0.10, "#2a1a4a"],
    ].map(([x, y, size, speed, color]) => ({
        x: x * width,
        y: y * height,
        size,
        speed,
        color,
        angle: Math.atan2(y - 0.5, x - 0.5),
        radiusFromCenter: Math.hypot((x - 0.5) * width, (y - 0.5) * height),
        spiralOffset: randomBetween(0, Math.PI * 2),
    }));

    // Add many faint galaxy-dust particles so the belt sits inside a richer Andromeda-like field.
    const particleColors = ["#21133b", "#2a1a4a", "#3a2b58", "#4b3570", "#f2ecff"];

    for (let index = 0; index < 1800; index += 1) {
        const angle = randomBetween(0, Math.PI * 2);
        const distance = randomBetween(0.18, 0.98);
        const spiral = angle + distance * 2.4;
        const x = 0.5 + Math.cos(spiral) * distance * 0.58;
        const y = 0.5 + Math.sin(spiral) * distance * 0.28;
        const size = randomBetween(0.45, 1.25);
        const speed = randomBetween(0.025, 0.08);
        const color = particleColors[index % particleColors.length];

        particles.push({
            x: x * width,
            y: y * height,
            size,
            speed,
            color,
            angle: spiral,
            radiusFromCenter: distance * Math.min(width, height) * 0.62,
            spiralOffset: randomBetween(0, Math.PI * 2),
        });
    }

    asteroids = [
        [-0.04, 0.16, 32, 0.42, "#40394d"],
        [0.04, 0.31, 10, 0.9, "#53475f"],
        [0.09, 0.04, 12, 1.1, "#53475f"],
        [0.15, 0.87, 11, 0.8, "#40394d"],
        [0.22, 0.08, 13, 0.7, "#5a4d68"],
        [0.28, -0.02, 16, 0.8, "#353044"],
        [0.33, 1.03, 29, 0.46, "#5a4d68"],
        [0.39, 0.93, 12, 1.0, "#665875"],
        [0.45, 0.06, 14, 0.75, "#3b3448"],
        [0.52, 0.03, 10, 1.4, "#665875"],
        [0.58, 0.96, 13, 0.9, "#4c415c"],
        [0.65, -0.03, 15, 0.8, "#605270"],
        [0.70, 0.90, 11, 1.1, "#393348"],
        [0.77, -0.01, 19, 0.6, "#473d56"],
        [0.84, 0.10, 12, 0.95, "#6a5a7b"],
        [0.88, 1.02, 13, 1.2, "#6a5a7b"],
        [0.96, 0.23, 16, 0.7, "#514663"],
        [1.02, 0.13, 15, 1.0, "#5c4f6b"],
        [0.98, 0.38, 11, 1.5, "#393348"],
        [1.04, 0.53, 17, 0.85, "#4c415c"],
        [1.03, 0.69, 31, 0.44, "#514663"],
        [0.94, 0.84, 12, 1.1, "#40394d"],
        [0.78, 0.98, 16, 0.7, "#605270"],
        [0.61, 0.97, 17, 0.9, "#43384f"],
        [0.47, 1.05, 10, 1.25, "#393348"],
        [0.08, 0.94, 14, 1.3, "#3b3448"],
        [-0.03, 0.73, 27, 0.5, "#605270"],
        [0.02, 0.46, 12, 1.6, "#4c415c"],
        [-0.04, 0.58, 10, 1.2, "#353044"],
        [0.14, 0.52, 9, 0.9, "#53475f"],
        [0.18, -0.05, 9, 1.05, "#514663"],
        [0.36, -0.06, 8, 1.15, "#40394d"],
        [0.72, -0.06, 9, 0.95, "#5a4d68"],
        [0.91, -0.04, 8, 1.1, "#353044"],
        [1.06, 0.30, 9, 1.25, "#665875"],
        [1.05, 0.44, 8, 1.05, "#40394d"],
        [1.07, 0.78, 10, 0.9, "#5c4f6b"],
        [0.98, 0.96, 9, 1.0, "#393348"],
        [0.71, 1.08, 8, 1.2, "#53475f"],
        [0.54, 1.08, 9, 1.05, "#514663"],
        [0.25, 1.07, 10, 0.95, "#473d56"],
        [-0.06, 0.86, 8, 1.3, "#3b3448"],
        [-0.07, 0.38, 9, 1.1, "#605270"],
        [-0.05, 0.24, 8, 1.2, "#514663"],
        [0.20, 0.24, 7, 0.8, "#393348"],
        [0.28, 0.74, 8, 0.9, "#4c415c"],
        [0.72, 0.76, 7, 0.85, "#53475f"],
        [0.80, 0.34, 8, 0.75, "#40394d"],
    ].map(([x, y, radius, speed, color]) => ({
        x: x * width,
        y: y * height,
        radius: radius * asteroidSizeScale,
        mass: (radius * asteroidSizeScale) * (radius * asteroidSizeScale),
        speed: speed * 0.52,
        color,
        phaseX: x * width,
        phaseY: y * height,
        targetPhaseX: x * width,
        targetPhaseY: y * height,
        driftX: 3 + radius * asteroidSizeScale * 0.10,
        driftY: 3 + radius * asteroidSizeScale * 0.08,
        targetDriftX: 3 + radius * asteroidSizeScale * 0.10,
        targetDriftY: 3 + radius * asteroidSizeScale * 0.08,
        rotationSpeed: 0.02 * speed,
        targetSpeed: speed * 0.52,
        targetRotationSpeed: 0.02 * speed,
        velocityX: randomBetween(-1.1, 1.1),
        velocityY: randomBetween(-1.1, 1.1),
        orbitDirection: Math.random() < 0.5 ? -1 : 1,
        currentX: x * width,
        currentY: y * height,
        nudgeX: 0,
        nudgeY: 0,
        nudgeVelocityX: 0,
        nudgeVelocityY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragTargetX: x * width,
        dragTargetY: y * height,
        dragVelocityX: 0,
        dragVelocityY: 0,
        lastPointerX: x * width,
        lastPointerY: y * height,
        isDragging: false,
        orbitSource: null,
        orbitDisruptUntil: 0,
        capturedByFlyby: null,
        captureDepth: 0,
        flashUntil: 0,
        shape: createRandomAsteroidShape(Math.floor(randomBetween(7, 12)), 0.30),
    }));

    // Add four extra procedural waves, making the asteroid field roughly 5x denser.
    const asteroidColors = ["#40394d", "#53475f", "#353044", "#665875", "#473d56", "#5c4f6b", "#393348", "#514663"];
    const extraAsteroidCount = asteroids.length * 4;

    for (let index = 0; index < extraAsteroidCount; index += 1) {
        const edge = index % 4;
        const radius = randomBetween(5, 11);
        const speed = randomBetween(0.45, 1.25);
        const color = asteroidColors[index % asteroidColors.length];
        let x = randomBetween(-0.08, 1.08);
        let y = randomBetween(-0.08, 1.08);

        // Most added rocks begin near the edges so the center panel stays readable.
        if (edge === 0) {
            y = randomBetween(-0.10, 0.10);
        } else if (edge === 1) {
            x = randomBetween(0.90, 1.10);
        } else if (edge === 2) {
            y = randomBetween(0.90, 1.10);
        } else {
            x = randomBetween(-0.10, 0.10);
        }

        // A few tiny inner rocks make the field feel layered, but not crowded.
        if (index % 9 === 0) {
            x = randomBetween(0.12, 0.88);
            y = randomBetween(0.12, 0.88);
        }

        asteroids.push(createAsteroidFromSpec(x, y, radius, speed, color));
    }

    initializeAsteroidBelt();
}

// Pick a random number inside a range.
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

// Generate a unique lumpy asteroid outline, like irregular rock formed in space.
function createRandomAsteroidShape(pointCount = 9, roughness = 0.24) {
    const shape = [];
    let maxMagnitude = 0;

    for (let index = 0; index < pointCount; index += 1) {
        const angle = (index / pointCount) * Math.PI * 2 + randomBetween(-0.12, 0.12);
        const radius = randomBetween(1 - roughness, 1 + roughness);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        maxMagnitude = Math.max(maxMagnitude, Math.hypot(x, y));
        shape.push([x, y]);
    }

    // Keep the whole visible polygon inside the collision circle so visual overlap matches physics.
    return shape.map(([x, y]) => [x / maxMagnitude, y / maxMagnitude]);
}

// Build a single asteroid object from percentage-based position data.
function createAsteroidFromSpec(x, y, radius, speed, color) {
    // Procedural asteroids use the same scale as the hand-placed ones.
    const displayRadius = radius * asteroidSizeScale;

    return {
        x: x * width,
        y: y * height,
        radius: displayRadius,
        mass: displayRadius * displayRadius,
        speed: speed * 0.52,
        color,
        phaseX: x * width,
        phaseY: y * height,
        targetPhaseX: x * width,
        targetPhaseY: y * height,
        driftX: 3 + displayRadius * 0.10,
        driftY: 3 + displayRadius * 0.08,
        targetDriftX: 3 + displayRadius * 0.10,
        targetDriftY: 3 + displayRadius * 0.08,
        rotationSpeed: 0.02 * speed,
        targetSpeed: speed * 0.52,
        targetRotationSpeed: 0.02 * speed,
        velocityX: randomBetween(-1.1, 1.1),
        velocityY: randomBetween(-1.1, 1.1),
        orbitDirection: Math.random() < 0.5 ? -1 : 1,
        currentX: x * width,
        currentY: y * height,
        nudgeX: 0,
        nudgeY: 0,
        nudgeVelocityX: 0,
        nudgeVelocityY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragTargetX: x * width,
        dragTargetY: y * height,
        dragVelocityX: 0,
        dragVelocityY: 0,
        lastPointerX: x * width,
        lastPointerY: y * height,
        isDragging: false,
        orbitSource: null,
        orbitDisruptUntil: 0,
        capturedByFlyby: null,
        captureDepth: 0,
        flashUntil: 0,
        shape: createRandomAsteroidShape(Math.floor(randomBetween(7, 12)), 0.30),
    };
}

// Arrange asteroids into a belt: annular shape, gaps, mostly prograde orbit, inner rocks faster.
function initializeAsteroidBelt() {
    const centerX = width / 2;
    const centerY = height / 2;
    const shortSide = Math.min(width, height);
    const innerRadius = shortSide * 0.36;
    const outerRadius = shortSide * 0.72;
    const resonanceGaps = [0.34, 0.52, 0.70];

    asteroids.forEach((asteroid, index) => {
        const angle = (index / asteroids.length) * Math.PI * 2 + randomBetween(-0.09, 0.09);
        let bandPosition = (index * 0.61803398875) % 1;

        // Kirkwood-like resonance gaps: avoid a few orbital bands so the belt has structure.
        resonanceGaps.forEach((gap) => {
            if (Math.abs(bandPosition - gap) < 0.025) {
                bandPosition += bandPosition < gap ? -0.035 : 0.035;
            }
        });

        bandPosition = Math.max(0.02, Math.min(0.98, bandPosition));

        const radius = innerRadius + (outerRadius - innerRadius) * bandPosition;
        const eccentricity = randomBetween(-0.08, 0.08);
        const verticalInclination = randomBetween(-0.055, 0.055) * shortSide;
        const orbitX = centerX + Math.cos(angle) * radius * (1 + eccentricity);
        const orbitY = centerY + Math.sin(angle) * radius * 0.58 + verticalInclination;
        const toCenterX = centerX - orbitX;
        const toCenterY = centerY - orbitY;
        const distance = Math.hypot(toCenterX, toCenterY) || 1;
        const tangentX = -toCenterY / distance;
        const tangentY = toCenterX / distance;
        const orbitalSpeed = Math.sqrt(beltCentralMass / distance) * 0.24;

        asteroid.x = orbitX;
        asteroid.y = orbitY;
        asteroid.currentX = orbitX;
        asteroid.currentY = orbitY;
        asteroid.velocityX = tangentX * orbitalSpeed + randomBetween(-0.05, 0.05);
        asteroid.velocityY = tangentY * orbitalSpeed + randomBetween(-0.05, 0.05);
        asteroid.beltRadius = radius;
        asteroid.beltInclination = verticalInclination;
        asteroid.galaxyPhase = angle + randomBetween(-0.14, 0.14);
        asteroid.galaxyShear = 1 / Math.sqrt(radius + 40);
        asteroid.chaosPhase = randomBetween(0, Math.PI * 2);
        asteroid.chaosArm = index % 3;
    });
}

// Create one rare humungous asteroid that flies across the whole screen.
function spawnHugeFlyby() {
    const edge = Math.floor(randomBetween(0, 4));
    const radius = randomBetween(78, 118);
    const speed = randomBetween(44, 68);
    const targetX = randomBetween(width * 0.16, width * 0.84);
    const targetY = randomBetween(height * 0.16, height * 0.84);
    let x = 0;
    let y = 0;

    if (edge === 0) {
        x = randomBetween(-radius * 2.2, width + radius * 2.2);
        y = -radius * 2.2;
    } else if (edge === 1) {
        x = width + radius * 2.2;
        y = randomBetween(-radius * 2.2, height + radius * 2.2);
    } else if (edge === 2) {
        x = randomBetween(-radius * 2.2, width + radius * 2.2);
        y = height + radius * 2.2;
    } else {
        x = -radius * 2.2;
        y = randomBetween(-radius * 2.2, height + radius * 2.2);
    }

    const directionX = targetX - x;
    const directionY = targetY - y;
    const distance = Math.hypot(directionX, directionY) || 1;

    hugeFlybys.push({
        id: nextHugeFlybyId,
        x,
        y,
        currentX: x,
        currentY: y,
        radius,
        mass: radius * radius * 7,
        velocityX: (directionX / distance) * speed,
        velocityY: (directionY / distance) * speed,
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-0.12, 0.12),
        gravityMultiplier: 3.4,
        orbitDirection: Math.random() < 0.5 ? -1 : 1,
        color: "#2d2638",
        trail: [],
        shape: createRandomAsteroidShape(Math.floor(randomBetween(10, 15)), 0.22),
    });

    nextHugeFlybyId += 1;
}

// Smoothly move a value toward a target in a frame-rate independent way.
function easeToward(current, target, strength, deltaTime) {
    const amount = 1 - Math.pow(strength, deltaTime);
    return current + (target - current) * amount;
}

// Draw a sharp polygon through a list of points for crisp asteroid edges.
function drawSharpShape(points) {
    ctx.beginPath();

    points.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
            return;
        }

        ctx.lineTo(point.x, point.y);
    });

    ctx.closePath();
}

// Give one asteroid a fresh path and a physical-looking push after it is released.
function setReleaseTrajectory(asteroid, directionX, directionY) {
    asteroid.targetPhaseX = randomBetween(0, Math.PI * 2);
    asteroid.targetPhaseY = randomBetween(0, Math.PI * 2);
    asteroid.targetSpeed = randomBetween(0.12, 0.48);
    asteroid.targetDriftX = randomBetween(1, 3.8 + asteroid.radius * 0.08);
    asteroid.targetDriftY = randomBetween(1, 3.8 + asteroid.radius * 0.08);
    asteroid.targetRotationSpeed = randomBetween(-0.04, 0.04);

    // Continue in the direction of the drag, but keep it restrained and smooth.
    const dragDistance = Math.hypot(directionX, directionY) || 1;
    const pushStrength = Math.min(18, 5 + dragDistance * 0.035);
    asteroid.velocityX += (directionX / dragDistance) * pushStrength;
    asteroid.velocityY += (directionY / dragDistance) * pushStrength;

    // Flash the asteroid gold gently so the release feels responsive.
    asteroid.flashUntil = performance.now() + 420;
}

// Return the asteroid under the cursor, if the click is close enough.
function findClickedAsteroid(mouseX, mouseY) {
    for (let index = asteroids.length - 1; index >= 0; index -= 1) {
        const asteroid = asteroids[index];
        const distance = Math.hypot(mouseX - asteroid.currentX, mouseY - asteroid.currentY);

        if (distance <= asteroid.radius * 1.35) {
            return asteroid;
        }
    }

    return null;
}

// Convert browser pointer coordinates into canvas coordinates.
function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

// Start dragging an asteroid if the pointer presses close enough to one.
function handlePointerDown(event) {
    const point = getCanvasPoint(event);
    const asteroid = findClickedAsteroid(point.x, point.y);

    if (!asteroid) {
        return;
    }

    event.preventDefault();
    draggedAsteroid = asteroid;
    asteroid.isDragging = true;
    asteroid.dragOffsetX = asteroid.currentX - point.x;
    asteroid.dragOffsetY = asteroid.currentY - point.y;
    asteroid.dragTargetX = asteroid.currentX;
    asteroid.dragTargetY = asteroid.currentY;
    asteroid.lastPointerX = point.x;
    asteroid.lastPointerY = point.y;
    asteroid.dragVelocityX = 0;
    asteroid.dragVelocityY = 0;
    asteroid.nudgeX = 0;
    asteroid.nudgeY = 0;
    asteroid.nudgeVelocityX = 0;
    asteroid.nudgeVelocityY = 0;
    asteroid.velocityX = 0;
    asteroid.velocityY = 0;
    asteroid.capturedByFlyby = null;
    asteroid.captureDepth = 0;
    asteroid.flashUntil = performance.now() + 180;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
}

// Move the dragged asteroid target. The drawing loop eases the asteroid toward it.
function handlePointerMove(event) {
    const point = getCanvasPoint(event);

    if (draggedAsteroid) {
        const movementX = point.x - draggedAsteroid.lastPointerX;
        const movementY = point.y - draggedAsteroid.lastPointerY;

        draggedAsteroid.dragTargetX = point.x + draggedAsteroid.dragOffsetX;
        draggedAsteroid.dragTargetY = point.y + draggedAsteroid.dragOffsetY;
        draggedAsteroid.dragVelocityX = easeToward(draggedAsteroid.dragVelocityX, movementX * 6, 0.08, 1 / 60);
        draggedAsteroid.dragVelocityY = easeToward(draggedAsteroid.dragVelocityY, movementY * 6, 0.08, 1 / 60);
        draggedAsteroid.lastPointerX = point.x;
        draggedAsteroid.lastPointerY = point.y;
        return;
    }

    canvas.style.cursor = findClickedAsteroid(point.x, point.y) ? "grab" : "default";
}

// Release the asteroid and convert the drag direction into its new trajectory.
function handlePointerUp(event) {
    if (!draggedAsteroid) {
        return;
    }

    const asteroid = draggedAsteroid;
    draggedAsteroid = null;
    asteroid.isDragging = false;
    asteroid.x = asteroid.currentX;
    asteroid.y = asteroid.currentY;

    // Reset the wave offset at release so the asteroid does not snap away.
    asteroid.nudgeX = 0;
    asteroid.nudgeY = 0;
    asteroid.phaseX = Math.PI / 2 - performance.now() * 0.00014 * asteroid.speed;
    asteroid.phaseY = -performance.now() * 0.00017 * asteroid.speed;
    asteroid.targetPhaseX = asteroid.phaseX;
    asteroid.targetPhaseY = asteroid.phaseY;

    setReleaseTrajectory(asteroid, asteroid.dragVelocityX, asteroid.dragVelocityY);
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
}

// Paint the black nebula-style background.
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#020008");
    gradient.addColorStop(1, "#080314");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

// Bend a point around distant black holes to mimic gravitational lensing of background light.
function lensPointAroundBlackHoles(x, y) {
    let lensedX = x;
    let lensedY = y;

    blackHoles.forEach((blackHole) => {
        const distanceX = lensedX - blackHole.x;
        const distanceY = lensedY - blackHole.y;
        const distance = Math.hypot(distanceX, distanceY) || 1;

        if (distance <= blackHole.radius * 1.25 || distance >= blackHole.lensRadius) {
            return;
        }

        const normalX = distanceX / distance;
        const normalY = distanceY / distance;
        const tangentX = -normalY;
        const tangentY = normalX;
        const lensAmount = Math.pow(1 - distance / blackHole.lensRadius, 2) * blackHole.lensStrength;
        const swirlAmount = lensAmount * 0.22;

        // Apparent positions are pushed around the gravity well, creating a quiet lensing arc.
        lensedX += normalX * lensAmount + tangentX * swirlAmount;
        lensedY += normalY * lensAmount + tangentY * swirlAmount;
    });

    return { x: lensedX, y: lensedY };
}

// Draw one far-distance star.
function drawStar(star, time) {
    // Real distant stars feel alive through tiny uneven scintillation, not hard blinking.
    const slowPulse = Math.sin(time * star.twinkleSpeed + star.phase);
    const softFlicker = Math.sin(time * star.twinkleSpeed * 2.7 + star.flickerPhase) * 0.35;
    const shimmer = slowPulse * 0.65 + softFlicker;
    const distanceFade = 1 - star.distance * 0.54;
    const baseAlpha = 0.08 + distanceFade * 0.46;
    const alpha = baseAlpha + shimmer * star.twinkleDepth;
    const radius = star.size * (0.82 + distanceFade * 0.42 + shimmer * 0.035);
    const haloRadius = radius * (1.7 + (1 - star.distance) * 1.8);
    const lensed = lensPointAroundBlackHoles(star.x, star.y);

    // Only brighter near-distance stars get a faint halo; far stars stay pin-sharp and intimate.
    ctx.globalAlpha = Math.max(0, Math.min(alpha * (1 - star.distance) * 0.22, 0.18));
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(lensed.x, lensed.y, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.max(0.03, Math.min(alpha, 0.72));
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(lensed.x, lensed.y, Math.max(0.18, radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// Draw a distant black hole with an event horizon and subtle photon glow.
function drawBlackHoles(time) {
    blackHoles.forEach((blackHole) => {
        const pulse = 0.92 + Math.sin(time * 0.34 + blackHole.rotation) * 0.08;

        // Photon ring: light orbiting near the event horizon before escaping toward us.
        const photonGlow = ctx.createRadialGradient(
            blackHole.x,
            blackHole.y,
            blackHole.radius * 0.78,
            blackHole.x,
            blackHole.y,
            blackHole.radius * 2.45
        );

        photonGlow.addColorStop(0, `rgba(248, 240, 255, ${0.22 * pulse})`);
        photonGlow.addColorStop(0.34, `rgba(184, 171, 255, ${0.16 * pulse})`);
        photonGlow.addColorStop(1, "rgba(2, 0, 8, 0)");

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = photonGlow;
        ctx.beginPath();
        ctx.arc(blackHole.x, blackHole.y, blackHole.radius * 2.45, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon: the actual black center where light cannot escape.
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2);
        ctx.fill();

        // Thin edge light makes the silhouette readable without turning it into a planet.
        ctx.globalAlpha = 0.48;
        ctx.strokeStyle = "#2a1a4a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(blackHole.x, blackHole.y, blackHole.radius * 1.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
}

// Start a far-away supernova bloom somewhere deep in the background cosmos.
function spawnSupernova(now) {
    const distance = randomBetween(0.82, 1);
    const maxRadius = Math.min(width, height) * randomBetween(0.11, 0.19) * (1.18 - distance * 0.28);

    supernovas.push({
        x: randomBetween(width * 0.08, width * 0.92),
        y: randomBetween(height * 0.08, height * 0.92),
        bornAt: now,
        duration: randomBetween(10500, 13500),
        maxRadius,
        distance,
        phase: randomBetween(0, Math.PI * 2),
        colorCore: "#f8f0ff",
        colorGlow: Math.random() < 0.5 ? "#b8abff" : "#77f2dc",
    });
}

// Draw distant supernovas as slow, quiet blooms so they feel cosmic, not foreground-explosive.
function updateSupernovas(time, now) {
    if (now - lastSupernovaTime >= supernovaInterval) {
        spawnSupernova(now);
        lastSupernovaTime = now;
    }

    supernovas = supernovas.filter((supernova) => {
        const age = now - supernova.bornAt;
        const progress = age / supernova.duration;

        if (progress >= 1) {
            return false;
        }

        const bloom = Math.sin(progress * Math.PI);
        const expansion = 1 - Math.pow(1 - progress, 3);
        const shimmer = 0.92 + Math.sin(time * 1.4 + supernova.phase) * 0.08;
        const radius = supernova.maxRadius * expansion;
        const alpha = bloom * shimmer * (0.22 - supernova.distance * 0.08);
        const coreRadius = Math.max(0.8, radius * 0.055 * (1 - progress * 0.45));

        // A soft radial glow makes the explosion read as very distant light spreading through space.
        const glow = ctx.createRadialGradient(
            supernova.x,
            supernova.y,
            0,
            supernova.x,
            supernova.y,
            Math.max(radius, 1)
        );

        glow.addColorStop(0, `rgba(248, 240, 255, ${alpha * 0.95})`);
        glow.addColorStop(0.24, `rgba(184, 171, 255, ${alpha * 0.42})`);
        glow.addColorStop(0.62, `rgba(119, 242, 220, ${alpha * 0.12})`);
        glow.addColorStop(1, "rgba(2, 0, 8, 0)");

        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(supernova.x, supernova.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // The thin shell is the visible shockwave, kept faint because this is far, far away.
        ctx.globalAlpha = alpha * 0.52;
        ctx.strokeStyle = supernova.colorGlow;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(supernova.x, supernova.y, radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha * 1.4;
        ctx.fillStyle = supernova.colorCore;
        ctx.beginPath();
        ctx.arc(supernova.x, supernova.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        return true;
    });
}

// Draw one tiny dust particle with very soft shimmer.
function drawParticle(particle, time) {
    // Andromeda-like dust: slow tilted spiral rotation, with outer dust moving more lazily.
    const centerX = width / 2;
    const centerY = height / 2;
    const galaxyRotation = time * particle.speed;
    const spiralAngle = particle.angle + galaxyRotation + particle.radiusFromCenter * 0.0025;
    const driftX = Math.cos(spiralAngle + particle.spiralOffset) * 4;
    const driftY = Math.sin(spiralAngle + particle.spiralOffset) * 2;
    const galaxyX = centerX + Math.cos(spiralAngle) * particle.radiusFromCenter;
    const galaxyY = centerY + Math.sin(spiralAngle) * particle.radiusFromCenter * 0.42;
    const shimmer = 0.5 + 0.5 * Math.sin(time * particle.speed + particle.x);

    // Keep particles flat and subtle so they read as soft dust, not a 3D effect.
    ctx.globalAlpha = shimmer > 0.25 ? 0.22 : 0.07;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(galaxyX + driftX, galaxyY + driftY, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// Draw and move the rare massive flyby asteroids.
function updateHugeFlybys(time, deltaTime) {
    const now = performance.now();

    // Launch the next humungous flyby exactly 20 seconds after the previous one leaves.
    if (hugeFlybys.length === 0 && now - lastHugeFlybyExitTime >= hugeFlybyInterval) {
        spawnHugeFlyby();
    }

    hugeFlybys = hugeFlybys.filter((flyby) => {
        flyby.x += flyby.velocityX * deltaTime;
        flyby.y += flyby.velocityY * deltaTime;
        flyby.currentX = flyby.x;
        flyby.currentY = flyby.y;
        flyby.rotation += flyby.rotationSpeed * deltaTime;

        flyby.trail.unshift({ x: flyby.x, y: flyby.y });

        if (flyby.trail.length > 24) {
            flyby.trail.pop();
        }

        // Close passes behave destructively, flinging smaller asteroids out of orbit.
        asteroids.forEach((asteroid) => {
            if (asteroid.isDragging) {
                return;
            }

            const distanceX = asteroid.currentX - flyby.currentX;
            const distanceY = asteroid.currentY - flyby.currentY;
            const distance = Math.hypot(distanceX, distanceY) || 1;
            const destructiveRange = flyby.radius * 1.28 + asteroid.radius;

            if (distance > destructiveRange) {
                return;
            }

            const normalX = distanceX / distance;
            const normalY = distanceY / distance;
            const directHitRange = flyby.radius + asteroid.radius;

            // A direct hit transfers momentum outward, like a violent grazing impact.
            if (distance <= directHitRange) {
                const impactStrength = (1 - distance / directHitRange) * 9;
                asteroid.velocityX += normalX * impactStrength;
                asteroid.velocityY += normalY * impactStrength;
                asteroid.capturedByFlyby = null;
                asteroid.captureDepth = 0;
                asteroid.orbitDisruptUntil = now + 4200;
                asteroid.orbitDirection = Math.random() < 0.5 ? -1 : 1;
                return;
            }

            // A close non-impact pass shakes orbit, but does not prevent gravity capture.
            asteroid.orbitSource = null;
            asteroid.orbitDirection = Math.random() < 0.5 ? -1 : 1;
        });

        const margin = flyby.radius * 3;
        const isStillPassingThrough = (
            flyby.x > -margin
            && flyby.x < width + margin
            && flyby.y > -margin
            && flyby.y < height + margin
        );

        // In space the huge body does not bounce; once it clears the scene, it is gone.
        if (!isStillPassingThrough) {
            lastHugeFlybyExitTime = now;

            asteroids.forEach((asteroid) => {
                if (asteroid.capturedByFlyby !== flyby.id) {
                    return;
                }

                // Captured rocks are released instead of deleted, so asteroids never just disappear.
                asteroid.capturedByFlyby = null;
                asteroid.captureDepth = 0;
                asteroid.orbitSource = null;
                asteroid.orbitDisruptUntil = now + 2400;
                asteroid.velocityX *= 0.68;
                asteroid.velocityY *= 0.68;
            });
        }

        return isStillPassingThrough;
    });
}

// Render the humungous asteroid and its faint comet-like trail.
function drawHugeFlyby(flyby, time) {
    flyby.trail.forEach((point, index) => {
        const fade = 1 - index / flyby.trail.length;
        ctx.globalAlpha = fade * 0.12;
        ctx.fillStyle = "#605270";
        ctx.beginPath();
        ctx.arc(point.x, point.y, flyby.radius * (0.58 + fade * 0.18), 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    const points = [];

    flyby.shape.forEach(([xOffset, yOffset], index) => {
        const rotatedX = xOffset * Math.cos(flyby.rotation) - yOffset * Math.sin(flyby.rotation);
        const rotatedY = xOffset * Math.sin(flyby.rotation) + yOffset * Math.cos(flyby.rotation);
        const pointX = flyby.x + rotatedX * flyby.radius;
        const pointY = flyby.y + rotatedY * flyby.radius;

        points.push({ x: pointX, y: pointY });
    });

    // Flat fill and sharp polygon edges restore the non-3D asteroid style.
    drawSharpShape(points);
    ctx.fillStyle = flyby.color;
    ctx.strokeStyle = "#9d8cff";
    ctx.lineWidth = 2;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#d8c8ef";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(flyby.x - flyby.radius * 0.38, flyby.y - flyby.radius * 0.34);
    ctx.lineTo(flyby.x + flyby.radius * 0.18, flyby.y - flyby.radius * 0.52);
    ctx.stroke();
}

// Larger asteroids gently pull smaller asteroids, with a sideways pull that creates orbit.
function applyAsteroidGravity(deltaTime) {
    const now = performance.now();
    const gravitySources = [
        ...asteroids.filter((asteroid) => asteroid.radius >= 24),
        ...hugeFlybys,
    ];

    gravitySources.forEach((source) => {
        asteroids.forEach((small) => {
            if (
                small === source
                || small.isDragging
                || small.radius >= source.radius * 0.70
                || now < small.orbitDisruptUntil
            ) {
                return;
            }

            const distanceX = source.currentX - small.currentX;
            const distanceY = source.currentY - small.currentY;
            const distance = Math.hypot(distanceX, distanceY) || 1;
            const minimumDistance = source.radius + small.radius + 6;
            const influenceDistance = source.radius * 10 + 90;

            if (distance < minimumDistance || distance > influenceDistance) {
                return;
            }

            const normalX = distanceX / distance;
            const normalY = distanceY / distance;
            const influence = 1 - distance / influenceDistance;
            const softenedDistance = Math.max(distance, minimumDistance * 0.72);
            const gravityStrength = (
                source.mass
                * gravityScale
                * influence
                * (source.gravityMultiplier || 1)
            ) / (softenedDistance * 0.025);

            // Gravity changes velocity, not position directly, which better mimics space motion.
            small.velocityX += normalX * gravityStrength * deltaTime * 60;
            small.velocityY += normalY * gravityStrength * deltaTime * 60;

            const orbitRadius = source.radius * (source.gravityMultiplier ? 2.1 : 3.4) + small.radius * 2.2;
            const orbitBand = source.radius * (source.gravityMultiplier ? 2.4 : 3.2);
            const orbitAmount = Math.max(0, 1 - Math.abs(distance - orbitRadius) / orbitBand);

            if (orbitAmount <= 0) {
                return;
            }

            const tangentX = -normalY * small.orbitDirection;
            const tangentY = normalX * small.orbitDirection;
            const radialVelocity = small.velocityX * normalX + small.velocityY * normalY;

            // Mark the asteroid as orbiting once it is close to a stable orbital band.
            if (orbitAmount > 0.42) {
                small.orbitSource = source;
            }

            // Add tangential velocity and lightly reduce radial motion so orbit capture can happen.
            const orbitPull = small.orbitSource === source ? 0.12 : 0.075;
            small.velocityX += tangentX * orbitAmount * orbitPull * deltaTime * 60;
            small.velocityY += tangentY * orbitAmount * orbitPull * deltaTime * 60;
            small.velocityX -= normalX * radialVelocity * orbitAmount * 0.026;
            small.velocityY -= normalY * radialVelocity * orbitAmount * 0.026;
        });
    });
}

// Humungous flybys can temporarily capture small asteroids and drag them away.
function applyHugeFlybyCapture(deltaTime) {
    const now = performance.now();

    hugeFlybys.forEach((flyby) => {
        asteroids.forEach((asteroid) => {
            if (asteroid.isDragging || asteroid.radius >= flyby.radius * 0.58) {
                asteroid.captureDepth = Math.max(0, asteroid.captureDepth - deltaTime * 0.7);
                return;
            }

            // Fresh impacts knock asteroids out of capture for a moment.
            if (now < asteroid.orbitDisruptUntil) {
                asteroid.capturedByFlyby = null;
                asteroid.captureDepth = Math.max(0, asteroid.captureDepth - deltaTime * 1.8);
                return;
            }

            const distanceX = flyby.currentX - asteroid.currentX;
            const distanceY = flyby.currentY - asteroid.currentY;
            const distance = Math.hypot(distanceX, distanceY) || 1;
            const minimumDistance = flyby.radius + asteroid.radius + collisionPadding;
            const captureDistance = flyby.radius * 7.5 + 260;

            if (distance <= minimumDistance || distance > captureDistance) {
                if (asteroid.capturedByFlyby === flyby.id) {
                    asteroid.captureDepth = Math.max(0, asteroid.captureDepth - deltaTime * 0.55);

                    if (asteroid.captureDepth <= 0.02) {
                        asteroid.capturedByFlyby = null;
                    }
                }

                return;
            }

            const normalX = distanceX / distance;
            const normalY = distanceY / distance;
            const tangentX = -normalY * asteroid.orbitDirection;
            const tangentY = normalX * asteroid.orbitDirection;
            const distanceInfluence = 1 - distance / captureDistance;
            const sizeInfluence = Math.max(0.12, 1 - asteroid.radius / (flyby.radius * 0.62));
            const capturePull = distanceInfluence * sizeInfluence;
            const radialVelocity = asteroid.velocityX * normalX + asteroid.velocityY * normalY;

            // Smaller, closer asteroids accumulate capture more quickly.
            asteroid.captureDepth = Math.min(1, asteroid.captureDepth + capturePull * deltaTime * 0.75);

            if (asteroid.captureDepth > 0.16) {
                asteroid.capturedByFlyby = flyby.id;
                asteroid.orbitSource = flyby;
            }

            // Gravity pulls inward while tangent motion lets the rock wrap around the flyby.
            asteroid.velocityX += normalX * capturePull * 0.52 * deltaTime * 60;
            asteroid.velocityY += normalY * capturePull * 0.52 * deltaTime * 60;
            asteroid.velocityX += tangentX * capturePull * 0.28 * deltaTime * 60;
            asteroid.velocityY += tangentY * capturePull * 0.28 * deltaTime * 60;

            // Once captured deeply, blend some of the flyby's motion into the small asteroid.
            if (asteroid.capturedByFlyby === flyby.id) {
                const carriedAmount = asteroid.captureDepth * sizeInfluence;
                const carriedVelocityX = flyby.velocityX * carriedAmount + tangentX * flyby.radius * 0.015;
                const carriedVelocityY = flyby.velocityY * carriedAmount + tangentY * flyby.radius * 0.015;

                asteroid.velocityX = easeToward(asteroid.velocityX, carriedVelocityX, 0.62, deltaTime);
                asteroid.velocityY = easeToward(asteroid.velocityY, carriedVelocityY, 0.62, deltaTime);
                asteroid.velocityX -= normalX * radialVelocity * 0.018 * asteroid.captureDepth;
                asteroid.velocityY -= normalY * radialVelocity * 0.018 * asteroid.captureDepth;
            }
        });
    });
}

// Asteroid belts orbit a dominant central body; this keeps the belt moving like orbital debris.
function applyCentralBeltGravity(deltaTime) {
    const centerX = width / 2;
    const centerY = height / 2;

    asteroids.forEach((asteroid) => {
        if (asteroid.isDragging) {
            return;
        }

        const distanceX = centerX - asteroid.currentX;
        const distanceY = centerY - asteroid.currentY;
        const distance = Math.hypot(distanceX, distanceY) || 1;
        const normalX = distanceX / distance;
        const normalY = distanceY / distance;
        const acceleration = beltCentralMass / (distance * distance);

        // Central gravity bends velocity inward; tangential velocity carries the orbit.
        asteroid.velocityX += normalX * acceleration * deltaTime;
        asteroid.velocityY += normalY * acceleration * deltaTime;
    });
}

// Add a slow Andromeda-like rotational current over the asteroid belt.
function applyGalacticShear(deltaTime) {
    const centerX = width / 2;
    const centerY = height / 2;

    asteroids.forEach((asteroid) => {
        if (asteroid.isDragging) {
            return;
        }

        const offsetX = asteroid.currentX - centerX;
        const offsetY = (asteroid.currentY - centerY) / 0.58;
        const distance = Math.hypot(offsetX, offsetY) || 1;
        const tangentX = -offsetY / distance;
        const tangentY = offsetX / distance;
        const shearStrength = 0.11 * asteroid.galaxyShear;

        // Inner belt objects get a little more rotational pull than outer objects.
        asteroid.velocityX += tangentX * shearStrength * deltaTime;
        asteroid.velocityY += tangentY * shearStrength * 0.58 * deltaTime;
    });
}

// ENGAGE mode: turbulent galaxy-interaction motion with spiral arms, tidal torque, and a wandering core.
function applyChaoticGalaxyMotion(time, deltaTime) {
    if (!chaosMode) {
        return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const chaosAge = Math.max(0, (performance.now() - chaosStartedAt) / 1000);
    const ramp = Math.min(1, chaosAge / 4);
    const companionX = centerX + Math.cos(time * 0.16) * width * 0.28;
    const companionY = centerY + Math.sin(time * 0.11) * height * 0.18;

    asteroids.forEach((asteroid) => {
        if (asteroid.isDragging || asteroid.capturedByFlyby) {
            return;
        }

        const offsetX = asteroid.currentX - centerX;
        const offsetY = (asteroid.currentY - centerY) / 0.58;
        const distance = Math.hypot(offsetX, offsetY) || 1;
        const normalX = offsetX / distance;
        const normalY = offsetY / distance;
        const tangentX = -normalY;
        const tangentY = normalX;
        const armWave = Math.sin(distance * 0.018 - time * 0.95 + asteroid.chaosPhase + asteroid.chaosArm * 2.1);
        const tidalWave = Math.cos(distance * 0.011 + time * 0.73 + asteroid.chaosPhase);
        const companionXDistance = companionX - asteroid.currentX;
        const companionYDistance = companionY - asteroid.currentY;
        const companionDistance = Math.hypot(companionXDistance, companionYDistance) || 1;
        const companionPull = Math.min(0.44, 6200 / (companionDistance * companionDistance));

        // Spiral torque stretches the belt into chaotic arms like a disturbed galaxy.
        asteroid.velocityX += tangentX * (0.34 + armWave * 0.18) * ramp * deltaTime * 60;
        asteroid.velocityY += tangentY * (0.34 + armWave * 0.18) * 0.58 * ramp * deltaTime * 60;

        // Radial breathing throws rocks inward and outward, creating a turbulent merger feel.
        asteroid.velocityX += normalX * tidalWave * 0.20 * ramp * deltaTime * 60;
        asteroid.velocityY += normalY * tidalWave * 0.14 * ramp * deltaTime * 60;

        // A wandering companion mass tugs the field so the chaos feels gravitational, not random.
        asteroid.velocityX += (companionXDistance / companionDistance) * companionPull * ramp * deltaTime * 60;
        asteroid.velocityY += (companionYDistance / companionDistance) * companionPull * ramp * deltaTime * 60;

        // Slow spin variation keeps the sharp rocks tumbling differently inside the flow.
        asteroid.targetRotationSpeed = easeToward(
            asteroid.targetRotationSpeed,
            Math.sin(time * 0.42 + asteroid.chaosPhase) * 0.09,
            0.92,
            deltaTime
        );
    });
}

// Push colliding asteroids away from each other with soft opposing impulses.
function handleAsteroidCollisions() {
    const now = performance.now();
    const separationPasses = 10;

    // Several passes solve crowded clusters so asteroids are separated before they are drawn.
    for (let pass = 0; pass < separationPasses; pass += 1) {
        for (let firstIndex = 0; firstIndex < asteroids.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < asteroids.length; secondIndex += 1) {
                const first = asteroids[firstIndex];
                const second = asteroids[secondIndex];
                const distanceX = second.currentX - first.currentX;
                const distanceY = second.currentY - first.currentY;
                const rawDistance = Math.hypot(distanceX, distanceY);
                const collisionDistance = first.radius + second.radius + collisionPadding;

                if (rawDistance >= collisionDistance) {
                    continue;
                }

                // If two centers ever land exactly together, use a stable tiny direction to separate them.
                const fallbackAngle = (firstIndex * 12.9898 + secondIndex * 78.233) % (Math.PI * 2);
                const normalX = rawDistance > 0.001 ? distanceX / rawDistance : Math.cos(fallbackAngle);
                const normalY = rawDistance > 0.001 ? distanceY / rawDistance : Math.sin(fallbackAngle);
                const overlap = collisionDistance - Math.max(rawDistance, 0.001);
                const correction = overlap + 0.08;
                const firstWeight = first.isDragging ? 0.08 : 1;
                const secondWeight = second.isDragging ? 0.08 : 1;
                const totalWeight = firstWeight + secondWeight || 1;
                const firstShare = secondWeight / totalWeight;
                const secondShare = firstWeight / totalWeight;

                // Move positions apart completely; this is the hard guarantee against overlap.
                first.x -= normalX * correction * firstShare;
                first.y -= normalY * correction * firstShare;
                second.x += normalX * correction * secondShare;
                second.y += normalY * correction * secondShare;
                first.currentX -= normalX * correction * firstShare;
                first.currentY -= normalY * correction * firstShare;
                second.currentX += normalX * correction * secondShare;
                second.currentY += normalY * correction * secondShare;

                const pairKey = `${firstIndex}-${secondIndex}`;
                const nextAllowedCollision = collisionCooldowns.get(pairKey) || 0;

                // Cooldown controls velocity impulse, but separation always runs.
                if (now < nextAllowedCollision) {
                    continue;
                }

                const relativeVelocityX = second.velocityX - first.velocityX;
                const relativeVelocityY = second.velocityY - first.velocityY;
                const velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY;
                // Very low restitution keeps impacts heavy, slow, and organic.
                const restitution = 0.015;
                const inverseMassFirst = 1 / first.mass;
                const inverseMassSecond = 1 / second.mass;
                const elasticImpulse = velocityAlongNormal < 0
                    ? (-(1 + restitution) * velocityAlongNormal) / (inverseMassFirst + inverseMassSecond)
                    : 0;
                const separationImpulse = Math.min(0.48, 0.08 + overlap * 0.012);
                const impulse = Math.min(0.9, elasticImpulse * 0.14 + separationImpulse);

                first.velocityX -= normalX * impulse * inverseMassFirst * 4.2 * firstWeight;
                first.velocityY -= normalY * impulse * inverseMassFirst * 4.2 * firstWeight;
                second.velocityX += normalX * impulse * inverseMassSecond * 4.2 * secondWeight;
                second.velocityY += normalY * impulse * inverseMassSecond * 4.2 * secondWeight;

                // Remove a little closing energy so rocks do not chatter robotically after contact.
                first.velocityX *= 0.986;
                first.velocityY *= 0.986;
                second.velocityX *= 0.986;
                second.velocityY *= 0.986;

                // Impacts disrupt orbit, so a captured small rock can be thrown outward.
                first.orbitSource = null;
                second.orbitSource = null;
                first.capturedByFlyby = null;
                second.capturedByFlyby = null;
                first.captureDepth *= 0.18;
                second.captureDepth *= 0.18;
                first.orbitDisruptUntil = now + 2600;
                second.orbitDisruptUntil = now + 2600;
                first.orbitDirection = Math.random() < 0.5 ? -1 : 1;
                second.orbitDirection = Math.random() < 0.5 ? -1 : 1;
                collisionCooldowns.set(pairKey, now + 420);
            }
        }
    }
}

// Final hard solver: no impulses, no cooldowns, just remove any remaining overlap before drawing.
function enforceNoAsteroidOverlaps() {
    const maxPasses = 18;

    for (let pass = 0; pass < maxPasses; pass += 1) {
        let movedAnyAsteroid = false;

        for (let firstIndex = 0; firstIndex < asteroids.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < asteroids.length; secondIndex += 1) {
                const first = asteroids[firstIndex];
                const second = asteroids[secondIndex];
                const distanceX = second.currentX - first.currentX;
                const distanceY = second.currentY - first.currentY;
                const rawDistance = Math.hypot(distanceX, distanceY);
                const minimumDistance = first.radius + second.radius + collisionPadding;

                if (rawDistance >= minimumDistance) {
                    continue;
                }

                const fallbackAngle = (firstIndex * 37.719 + secondIndex * 11.137) % (Math.PI * 2);
                const normalX = rawDistance > 0.001 ? distanceX / rawDistance : Math.cos(fallbackAngle);
                const normalY = rawDistance > 0.001 ? distanceY / rawDistance : Math.sin(fallbackAngle);
                const overlap = minimumDistance - Math.max(rawDistance, 0.001);
                const correction = overlap + 0.18;
                const firstWeight = first.isDragging ? 0.35 : 1;
                const secondWeight = second.isDragging ? 0.35 : 1;
                const totalWeight = firstWeight + secondWeight || 1;
                const firstShare = secondWeight / totalWeight;
                const secondShare = firstWeight / totalWeight;

                // Apply the same correction to base and current positions so drawing cannot re-overlap.
                first.x -= normalX * correction * firstShare;
                first.y -= normalY * correction * firstShare;
                first.currentX -= normalX * correction * firstShare;
                first.currentY -= normalY * correction * firstShare;
                second.x += normalX * correction * secondShare;
                second.y += normalY * correction * secondShare;
                second.currentX += normalX * correction * secondShare;
                second.currentY += normalY * correction * secondShare;

                // Remove only the velocity that is pushing them together, preserving organic drift.
                const relativeVelocityX = second.velocityX - first.velocityX;
                const relativeVelocityY = second.velocityY - first.velocityY;
                const closingSpeed = relativeVelocityX * normalX + relativeVelocityY * normalY;

                if (closingSpeed < 0) {
                    const damping = closingSpeed * 0.5;
                    first.velocityX += normalX * damping * firstShare;
                    first.velocityY += normalY * damping * firstShare;
                    second.velocityX -= normalX * damping * secondShare;
                    second.velocityY -= normalY * damping * secondShare;
                }

                movedAnyAsteroid = true;
            }
        }

        // Stop early when the field is clean; this keeps the animation fluid.
        if (!movedAnyAsteroid) {
            break;
        }
    }
}

// Keep normal asteroids from ever visually overlapping the humungous flyby bodies.
function handleHugeFlybyCollisions() {
    hugeFlybys.forEach((flyby) => {
        asteroids.forEach((asteroid) => {
            const distanceX = asteroid.currentX - flyby.currentX;
            const distanceY = asteroid.currentY - flyby.currentY;
            const distance = Math.hypot(distanceX, distanceY) || 1;
            const collisionDistance = flyby.radius + asteroid.radius + collisionPadding;

            if (distance >= collisionDistance) {
                return;
            }

            const normalX = distanceX / distance;
            const normalY = distanceY / distance;
            const overlap = collisionDistance - distance;

            // The flyby is effectively massive, so only the smaller asteroid is displaced.
            asteroid.x += normalX * overlap;
            asteroid.y += normalY * overlap;
            asteroid.currentX += normalX * overlap;
            asteroid.currentY += normalY * overlap;

            // Transfer outward velocity so the separation reads like a real grazing impact.
            const inwardVelocity = asteroid.velocityX * normalX + asteroid.velocityY * normalY;

            if (inwardVelocity < 0) {
                asteroid.velocityX -= normalX * inwardVelocity * 0.7;
                asteroid.velocityY -= normalY * inwardVelocity * 0.7;
            }

            asteroid.velocityX += normalX * 0.38;
            asteroid.velocityY += normalY * 0.38;
            asteroid.orbitSource = null;
            asteroid.capturedByFlyby = null;
            asteroid.captureDepth = 0;
            asteroid.orbitDisruptUntil = performance.now() + 4200;
        });
    });
}

// Keep asteroid velocity space-like but gently bounded inside the visible field.
function updateAsteroidMomentum(asteroid, deltaTime) {
    if (asteroid.isDragging) {
        return;
    }

    // A tiny natural current breaks up perfect mechanical motion without overpowering gravity.
    const organicTime = performance.now() * 0.00005;
    const organicDriftX = Math.sin(organicTime + asteroid.phaseX * 0.017) * 0.018;
    const organicDriftY = Math.cos(organicTime * 1.17 + asteroid.phaseY * 0.019) * 0.014;

    asteroid.velocityX += organicDriftX * deltaTime;
    asteroid.velocityY += organicDriftY * deltaTime;

    const speed = Math.hypot(asteroid.velocityX, asteroid.velocityY);

    // Captured asteroids can move faster because they are being carried by a flyby.
    const speedLimit = asteroid.capturedByFlyby
        ? maxAsteroidSpeed * (3.8 + asteroid.captureDepth * 3.2)
        : maxAsteroidSpeed * (chaosMode ? 1.9 : 1);

    // Keep post-impact motion slow and atmospheric instead of letting rocks shoot away.
    if (speed > speedLimit) {
        const scale = speedLimit / speed;
        asteroid.velocityX *= scale;
        asteroid.velocityY *= scale;
    }

    asteroid.x += asteroid.velocityX * deltaTime;
    asteroid.y += asteroid.velocityY * deltaTime;

    // Space has no meaningful air resistance; this tiny drag only keeps the browser scene usable.
    asteroid.velocityX *= Math.pow(spaceDrag, deltaTime);
    asteroid.velocityY *= Math.pow(spaceDrag, deltaTime);

    // The viewport is not a real wall, but this soft boundary keeps rocks in view.
    const margin = asteroid.radius + 30;

    if (asteroid.x < -margin || asteroid.x > width + margin) {
        asteroid.velocityX *= -0.74;
        asteroid.x = Math.max(-margin, Math.min(width + margin, asteroid.x));
    }

    if (asteroid.y < -margin || asteroid.y > height + margin) {
        asteroid.velocityY *= -0.74;
        asteroid.y = Math.max(-margin, Math.min(height + margin, asteroid.y));
    }
}

// Update and optionally draw one asteroid using its current physics state.
function drawAsteroid(asteroid, time, deltaTime, shouldRender = true) {
    updateAsteroidMomentum(asteroid, deltaTime);

    // Ease into the new trajectory instead of snapping to it.
    asteroid.phaseX = easeToward(asteroid.phaseX, asteroid.targetPhaseX, 0.10, deltaTime);
    asteroid.phaseY = easeToward(asteroid.phaseY, asteroid.targetPhaseY, 0.10, deltaTime);
    asteroid.speed = easeToward(asteroid.speed, asteroid.targetSpeed, 0.12, deltaTime);
    asteroid.driftX = easeToward(asteroid.driftX, asteroid.targetDriftX, 0.12, deltaTime);
    asteroid.driftY = easeToward(asteroid.driftY, asteroid.targetDriftY, 0.12, deltaTime);
    asteroid.rotationSpeed = easeToward(asteroid.rotationSpeed, asteroid.targetRotationSpeed, 0.12, deltaTime);

    // The click nudge behaves like a soft shove that gradually loses energy.
    asteroid.nudgeX += asteroid.nudgeVelocityX * deltaTime;
    asteroid.nudgeY += asteroid.nudgeVelocityY * deltaTime;
    asteroid.nudgeVelocityX *= Math.pow(0.32, deltaTime);
    asteroid.nudgeVelocityY *= Math.pow(0.32, deltaTime);
    asteroid.nudgeX *= Math.pow(0.38, deltaTime);
    asteroid.nudgeY *= Math.pow(0.38, deltaTime);

    // Position is driven by inertia/gravity. The old wave drift is kept at zero for realism.
    const driftX = 0;
    const driftY = 0;
    const angle = time * asteroid.rotationSpeed;
    let centerX = asteroid.x + driftX + asteroid.nudgeX;
    let centerY = asteroid.y + driftY + asteroid.nudgeY;
    const isFlashing = performance.now() < asteroid.flashUntil;

    // During dragging, the asteroid follows the pointer target with a soft lag.
    if (asteroid.isDragging) {
        centerX = easeToward(asteroid.currentX, asteroid.dragTargetX, 0.002, deltaTime);
        centerY = easeToward(asteroid.currentY, asteroid.dragTargetY, 0.002, deltaTime);
    }

    // Store the current center so click detection uses the asteroid's real position.
    asteroid.currentX = centerX;
    asteroid.currentY = centerY;

    if (!shouldRender) {
        return;
    }

    const points = [];

    asteroid.shape.forEach(([xOffset, yOffset], index) => {
        const rotatedX = xOffset * Math.cos(angle) - yOffset * Math.sin(angle);
        const rotatedY = xOffset * Math.sin(angle) + yOffset * Math.cos(angle);
        const pointX = centerX + rotatedX * asteroid.radius;
        const pointY = centerY + rotatedY * asteroid.radius;

        points.push({ x: pointX, y: pointY });
    });

    // Flat fill and straight polygon joins bring back the sharp, non-3D asteroid look.
    drawSharpShape(points);
    ctx.fillStyle = asteroid.color;
    ctx.strokeStyle = isFlashing ? "#77f2dc" : "#a78bc4";
    ctx.lineWidth = 1;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = isFlashing ? "#77f2dc" : "#d8c8ef";
    ctx.beginPath();
    ctx.moveTo(centerX - asteroid.radius * 0.38, centerY - asteroid.radius * 0.3);
    ctx.lineTo(centerX + asteroid.radius * 0.12, centerY - asteroid.radius * 0.46);
    ctx.stroke();
}

// Main animation loop.
function animate(now) {
    const time = (now - startTime) / 1000;
    const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    drawBackground();
    stars.forEach((star) => drawStar(star, time));
    updateSupernovas(time, now);
    drawBlackHoles(time);
    particles.forEach((particle) => drawParticle(particle, time));
    updateHugeFlybys(time, deltaTime);
    applyCentralBeltGravity(deltaTime);
    applyGalacticShear(deltaTime);
    applyChaoticGalaxyMotion(time, deltaTime);
    applyAsteroidGravity(deltaTime);
    applyHugeFlybyCapture(deltaTime);

    // Update all asteroid positions before rendering, so collision correction affects this frame.
    asteroids.forEach((asteroid) => drawAsteroid(asteroid, time, deltaTime, false));
    handleAsteroidCollisions();
    handleHugeFlybyCollisions();
    // One final hard pass catches every remaining overlap before anything is rendered.
    enforceNoAsteroidOverlaps();

    hugeFlybys.forEach((flyby) => drawHugeFlyby(flyby, time));
    asteroids.forEach((asteroid) => drawAsteroid(asteroid, time, 0, true));

    requestAnimationFrame(animate);
}

window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);

// Small theme option: switch between the original purple palette and a pink complementary palette.
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const isPinkTheme = document.body.classList.toggle("pink-theme");

        themeToggle.setAttribute("aria-pressed", String(isPinkTheme));
        themeToggle.textContent = isPinkTheme ? "PURPLE" : "PINK";
    });
}

// ENGAGE turns the calm belt into a chaotic galaxy-interaction flow.
if (engageButton) {
    engageButton.addEventListener("click", () => {
        chaosMode = !chaosMode;
        chaosStartedAt = performance.now();
        engageButton.textContent = chaosMode ? "STABILIZE" : "ENGAGE";

        if (statusText) {
            statusText.textContent = chaosMode ? "GALAXY MERGER: ACTIVE" : "NEBULA LINK: STABLE";
        }

        if (messageText) {
            messageText.textContent = chaosMode
                ? "Asteroids pulled into a turbulent cosmic dance."
                : "Floating above the purple edge of deep space.";
        }

        asteroids.forEach((asteroid) => {
            asteroid.chaosPhase = randomBetween(0, Math.PI * 2);
            asteroid.chaosArm = Math.floor(randomBetween(0, 3));

            if (chaosMode && !asteroid.isDragging) {
                const centerX = width / 2;
                const centerY = height / 2;
                const offsetX = asteroid.currentX - centerX;
                const offsetY = asteroid.currentY - centerY;
                const distance = Math.hypot(offsetX, offsetY) || 1;

                // Initial tidal shove makes the mode change visible without teleporting anything.
                asteroid.velocityX += (-offsetY / distance) * randomBetween(1.2, 2.8);
                asteroid.velocityY += (offsetX / distance) * randomBetween(1.2, 2.8);
            }
        });
    });
}

resizeCanvas();
requestAnimationFrame(animate);
