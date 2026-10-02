/* ============================================================
   BUBBLE SHOOTER BY PRAVEEN SHARMA
   Core Game Engine — Version 1
   ============================================================ */

"use strict";

/* ============================================================
   CANVAS SETUP
   ============================================================ */

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const gameArea = document.getElementById("game-area");

let width = 0;
let height = 0;
let dpr = 1;

function resizeCanvas() {
    const rect = gameArea.getBoundingClientRect();

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = rect.width;
    height = rect.height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createLevelIfNeeded();
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);


/* ============================================================
   GAME CONSTANTS
   ============================================================ */

const COLORS = [
    "#ff5964",
    "#ffd45a",
    "#52d273",
    "#4d9cff",
    "#a978ff"
];

const COLOR_NAMES = [
    "red",
    "yellow",
    "green",
    "blue",
    "purple"
];

const ROWS = 11;
const COLS = 9;

const BUBBLE_RADIUS = 17;
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;

const SHOOT_SPEED = 760;

const MATCH_MINIMUM = 3;

const MAX_MISSES = 4;

const STARTING_ROWS = 5;

const CEILING_STEP = 0.72;


/* ============================================================
   GAME STATE
   ============================================================ */

let currentLevel = 1;
let highestUnlockedLevel =
    Number(localStorage.getItem("bubbleShooterUnlocked")) || 1;

let score = 0;

let bubbles = [];

let currentBubble = null;
let nextBubble = null;

let projectile = null;

let aimAngle = -Math.PI / 2;

let isAiming = false;
let isPaused = false;
let gameOver = false;

let failedShots = 0;

let lastTime = performance.now();

let levelCreated = false;


/* ============================================================
   DOM REFERENCES
   ============================================================ */

const levelNumberEl = document.getElementById("level-number");
const scoreEl = document.getElementById("score");

const currentBubbleEl =
    document.getElementById("current-bubble");

const nextBubbleEl =
    document.getElementById("next-bubble");

const cannonEl =
    document.getElementById("cannon");

const dangerLineEl =
    document.getElementById("danger-line");

const missDots =
    document.querySelectorAll(".miss-dots span");

const levelComplete =
    document.getElementById("level-complete");

const levelFailed =
    document.getElementById("level-failed");

const pauseMenu =
    document.getElementById("pause-menu");

const finalScoreEl =
    document.getElementById("final-score");

const failedScoreEl =
    document.getElementById("failed-score");

const nextLevelButton =
    document.getElementById("next-level-button");

const retryButton =
    document.getElementById("retry-button");

const pauseButton =
    document.getElementById("pause-button");

const resumeButton =
    document.getElementById("resume-button");

const soundButton =
    document.getElementById("sound-button");


/* ============================================================
   UTILITY
   ============================================================ */

function randomColor() {
    return Math.floor(Math.random() * COLORS.length);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatScore(value) {
    return String(value).padStart(5, "0");
}

function addScore(amount) {
    score += amount;
    scoreEl.textContent = formatScore(score);
}


/* ============================================================
   BUBBLE OBJECT
   ============================================================ */

function createBubble(row, col, color) {
    const spacingX = BUBBLE_DIAMETER * 0.96;

    const rowOffset =
        row % 2 === 0
            ? 0
            : BUBBLE_RADIUS;

    return {
        row,
        col,
        x:
            BUBBLE_RADIUS +
            col * spacingX +
            rowOffset,

        y:
            BUBBLE_RADIUS +
            row * (BUBBLE_RADIUS * 1.72),

        color,

        radius: BUBBLE_RADIUS,

        falling: false,

        fallVelocity: 0,

        scale: 1,

        rotation: Math.random() * Math.PI * 2
    };
}


/* ============================================================
   LEVEL GENERATION
   ============================================================ */

function getLevelColorCount(level) {
    if (level <= 5) return 3;
    if (level <= 15) return 4;
    return 5;
}

function getLevelRows(level) {
    if (level <= 5) return 4;
    if (level <= 15) return 5;
    if (level <= 30) return 6;

    return 7;
}

function createLevel() {

    bubbles = [];

    const rows = getLevelRows(currentLevel);

    const colorCount =
        getLevelColorCount(currentLevel);

    for (let row = 0; row < rows; row++) {

        for (let col = 0; col < COLS; col++) {

            /*
             * Slightly irregular formations make the
             * field feel less mechanical.
             */

            if (
                currentLevel > 10 &&
                Math.random() < 0.08
            ) {
                continue;
            }

            const color =
                Math.floor(
                    Math.random() * colorCount
                );

            bubbles.push(
                createBubble(row, col, color)
            );
        }
    }

    failedShots = 0;

    updateMissIndicator();

    gameOver = false;

    projectile = null;

    levelCreated = true;
}


/* ============================================================
   LEVEL INITIALIZATION
   ============================================================ */

function createLevelIfNeeded() {

    if (!levelCreated && width > 0) {

        updateHUD();

        createLevel();

        currentBubble = {
            color: randomColor()
        };

        nextBubble = {
            color: randomColor()
        };

        updateBubblePreview();

        levelCreated = true;
    }
}


/* ============================================================
   HUD
   ============================================================ */

function updateHUD() {

    levelNumberEl.textContent =
        String(currentLevel).padStart(2, "0");

    scoreEl.textContent =
        formatScore(score);
}

function updateBubblePreview() {

    if (!currentBubble || !nextBubble) return;

    currentBubbleEl.style.background =
        createBubbleGradient(
            COLORS[currentBubble.color]
        );

    nextBubbleEl.style.background =
        createBubbleGradient(
            COLORS[nextBubble.color]
        );
}

function createBubbleGradient(color) {

    return `
        radial-gradient(
            circle at 32% 25%,
            rgba(255,255,255,0.8) 0%,
            rgba(255,255,255,0.18) 14%,
            transparent 24%
        ),
        linear-gradient(
            145deg,
            ${color},
            ${darkenColor(color)}
        )
    `;
}

function darkenColor(hex) {

    const num =
        parseInt(hex.replace("#", ""), 16);

    const r =
        Math.max(
            0,
            ((num >> 16) & 255) - 45
        );

    const g =
        Math.max(
            0,
            ((num >> 8) & 255) - 45
        );

    const b =
        Math.max(
            0,
            (num & 255) - 45
        );

    return `rgb(${r}, ${g}, ${b})`;
}


/* ============================================================
   MISS SYSTEM
   ============================================================ */

function updateMissIndicator() {

    missDots.forEach((dot, index) => {

        dot.classList.toggle(
            "active",
            index < failedShots
        );
    });

    dangerLineEl.classList.toggle(
        "active",
        failedShots >= 2
    );
}


/* ============================================================
   SHOOTER POSITION
   ============================================================ */

function getShooterPosition() {

    return {
        x: width / 2,
        y: height - 20
    };
}


/* ============================================================
   AIMING
   ============================================================ */

function getPointerPosition(event) {

    const rect =
        canvas.getBoundingClientRect();

    const touch =
        event.touches
            ? event.touches[0]
            : event;

    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

function updateAim(pointer) {

    const shooter =
        getShooterPosition();

    let angle =
        Math.atan2(
            pointer.y - shooter.y,
            pointer.x - shooter.x
        );

    /*
     * Prevent shooting downward.
     */

    angle =
        clamp(
            angle,
            -Math.PI + 0.18,
            -0.18
        );

    /*
     * Prefer upward angles for the
     * normal bubble-shooter feel.
     */

    if (angle > -0.18) {
        angle = -0.18;
    }

    aimAngle = angle;

    updateCannonRotation();
}

function updateCannonRotation() {

    /*
     * CSS rotation is visually limited so
     * the cannon remains inside the launcher.
     */

    const degrees =
        aimAngle * 180 / Math.PI + 90;

    cannonEl.style.transform =
        `translateX(-50%) rotate(${degrees}deg)`;
}


/* ============================================================
   TOUCH / POINTER CONTROL
   ============================================================ */

canvas.addEventListener(
    "pointerdown",
    event => {

        if (
            gameOver ||
            isPaused ||
            projectile
        ) {
            return;
        }

        isAiming = true;

        canvas.setPointerCapture(
            event.pointerId
        );

        updateAim(
            getPointerPosition(event)
        );
    }
);

canvas.addEventListener(
    "pointermove",
    event => {

        if (!isAiming) return;

        updateAim(
            getPointerPosition(event)
        );
    }
);

canvas.addEventListener(
    "pointerup",
    event => {

        if (!isAiming) return;

        isAiming = false;

        try {
            canvas.releasePointerCapture(
                event.pointerId
            );
        } catch (_) {}

        shootBubble();
    }
);

canvas.addEventListener(
    "pointercancel",
    () => {
        isAiming = false;
    }
);


/* ============================================================
   SHOOT BUBBLE
   ============================================================ */

function shootBubble() {

    if (
        projectile ||
        gameOver ||
        isPaused ||
        !currentBubble
    ) {
        return;
    }

    const shooter =
        getShooterPosition();

    projectile = {

        x: shooter.x,

        y: shooter.y - 20,

        vx:
            Math.cos(aimAngle) *
            SHOOT_SPEED,

        vy:
            Math.sin(aimAngle) *
            SHOOT_SPEED,

        radius: BUBBLE_RADIUS,

        color:
            currentBubble.color
    };

    currentBubble = {
        color: nextBubble.color
    };

    nextBubble = {
        color: randomColor()
    };

    updateBubblePreview();
}


/* ============================================================
   PROJECTILE PHYSICS
   ============================================================ */

function updateProjectile(delta) {

    if (!projectile) return;

    projectile.x +=
        projectile.vx * delta;

    projectile.y +=
        projectile.vy * delta;

    /*
     * Wall bounce.
     */

    if (
        projectile.x -
            projectile.radius <= 0
    ) {

        projectile.x =
            projectile.radius;

        projectile.vx =
            Math.abs(projectile.vx);
    }

    if (
        projectile.x +
            projectile.radius >= width
    ) {

        projectile.x =
            width -
            projectile.radius;

        projectile.vx =
            -Math.abs(projectile.vx);
    }

    /*
     * Top collision.
     */

    if (
        projectile.y -
            projectile.radius <= 0
    ) {

        attachProjectile();

        return;
    }

    /*
     * Bubble collision.
     */

    for (const bubble of bubbles) {

        if (bubble.falling) continue;

        const distanceBetween =
            Math.hypot(
                projectile.x - bubble.x,
                projectile.y - bubble.y
            );

        if (
            distanceBetween <=
            projectile.radius +
            bubble.radius
        ) {

            attachProjectile();

            return;
        }
    }
}


/* ============================================================
   ATTACH PROJECTILE
   ============================================================ */

function attachProjectile() {

    if (!projectile) return;

    const closest =
        findClosestAttachmentPoint(
            projectile
        );

    const bubble = {

        x: closest.x,

        y: closest.y,

        color: projectile.color,

        radius: BUBBLE_RADIUS,

        falling: false,

        fallVelocity: 0,

        scale: 1,

        rotation:
            Math.random() *
            Math.PI * 2
    };

    bubbles.push(bubble);

    projectile = null;

    resolveMatches(bubble);
}


/* ============================================================
   FIND ATTACHMENT POSITION
   ============================================================ */

function findClosestAttachmentPoint(projectile) {

    let closest = null;

    let closestDistance =
        Infinity;

    /*
     * First find nearest bubble.
     */

    for (const bubble of bubbles) {

        if (bubble.falling) continue;

        const dx =
            projectile.x -
            bubble.x;

        const dy =
            projectile.y -
            bubble.y;

        const d =
            Math.hypot(dx, dy);

        if (d < closestDistance) {

            closestDistance = d;

            const angle =
                Math.atan2(dy, dx);

            closest = {

                x:
                    bubble.x +
                    Math.cos(angle) *
                    (BUBBLE_RADIUS * 1.72),

                y:
                    bubble.y +
                    Math.sin(angle) *
                    (BUBBLE_RADIUS * 1.72)
            };
        }
    }

    /*
     * If there are no bubbles, attach
     * to the top.
     */

    if (!closest) {

        return {
            x: clamp(
                projectile.x,
                BUBBLE_RADIUS,
                width - BUBBLE_RADIUS
            ),

            y: BUBBLE_RADIUS
        };
    }

    return {
        x: clamp(
            closest.x,
            BUBBLE_RADIUS,
            width - BUBBLE_RADIUS
        ),

        y: Math.max(
            BUBBLE_RADIUS,
            closest.y
        )
    };
}


/* ============================================================
   MATCH RESOLUTION
   ============================================================ */

function resolveMatches(newBubble) {

    const connected =
        findConnectedSameColor(
            newBubble
        );

    if (
        connected.length >=
        MATCH_MINIMUM
    ) {

        /*
         * Successful shot.
         */

        failedShots = 0;

        updateMissIndicator();

        popBubbles(connected);

        /*
         * Find bubbles still connected
         * to the ceiling after the pop.
         */

        setTimeout(
            dropDisconnectedBubbles,
            80
        );

        return;
    }

    /*
     * No match = failed shot.
     */

    failedShots++;

    updateMissIndicator();

    if (failedShots >= MAX_MISSES) {

        setTimeout(
            moveCeilingDown,
            180
        );
    }
}


/* ============================================================
   FIND SAME-COLOR GROUP
   ============================================================ */

function findConnectedSameColor(start) {

    const result = [];

    const visited =
        new Set();

    const queue = [start];

    while (queue.length) {

        const current =
            queue.shift();

        if (
            visited.has(current)
        ) {
            continue;
        }

        visited.add(current);

        if (
            current.color !==
            start.color
        ) {
            continue;
        }

        result.push(current);

        for (const neighbor of getNeighbors(current)) {

            if (
                !visited.has(neighbor)
            ) {

                queue.push(neighbor);
            }
        }
    }

    return result;
}


/* ============================================================
   NEIGHBORS
   ============================================================ */

function getNeighbors(target) {

    const neighbors = [];

    const maxDistance =
        BUBBLE_DIAMETER * 1.85;

    for (const bubble of bubbles) {

        if (
            bubble === target ||
            bubble.falling
        ) {
            continue;
        }

        const d =
            distance(
                target,
                bubble
            );

        if (d <= maxDistance) {

            neighbors.push(bubble);
        }
    }

    return neighbors;
}


/* ============================================================
   POP BUBBLES
   ============================================================ */

function popBubbles(group) {

    if (!group.length) return;

    group.forEach(bubble => {

        bubble.falling = true;

        bubble.fallVelocity =
            -150 -
            Math.random() * 90;
    });

    addScore(
        group.length *
        group.length *
        10
    );
}


/* ============================================================
   DROP DISCONNECTED BUBBLES
   ============================================================ */

function dropDisconnectedBubbles() {

    const active =
        bubbles.filter(
            bubble => !bubble.falling
        );

    const connectedToTop =
        new Set();

    const queue =
        active.filter(
            bubble =>
                bubble.y <
                BUBBLE_RADIUS * 2.2
        );

    queue.forEach(
        bubble =>
            connectedToTop.add(bubble)
    );

    while (queue.length) {

        const current =
            queue.shift();

        for (
            const neighbor
            of getNeighbors(current)
        ) {

            if (
                !connectedToTop.has(
                    neighbor
                )
            ) {

                connectedToTop.add(
                    neighbor
                );

                queue.push(neighbor);
            }
        }
    }

    let dropped = 0;

    for (const bubble of active) {

        if (
            !connectedToTop.has(
                bubble
            )
        ) {

            bubble.falling = true;

            bubble.fallVelocity =
                80 +
                Math.random() * 80;

            dropped++;
        }
    }

    if (dropped > 0) {

        addScore(
            dropped * 15
        );
    }

    setTimeout(
        cleanupFallenBubbles,
        600
    );
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanupFallenBubbles() {

    bubbles =
        bubbles.filter(
            bubble =>
                !bubble.falling ||
                bubble.y <
                    height + 100
        );

    checkLevelCompletion();
}


/* ============================================================
   CEILING MOVEMENT
   ============================================================ */

function moveCeilingDown() {

    failedShots = 0;

    updateMissIndicator();

    bubbles.forEach(
        bubble => {

            if (!bubble.falling) {

                bubble.y +=
                    BUBBLE_RADIUS *
                    1.65;
            }
        }
    );

    checkDangerZone();
}


/* ============================================================
   DANGER ZONE
   ============================================================ */

function checkDangerZone() {

    const dangerY =
        height -
        70;

    for (const bubble of bubbles) {

        if (
            !bubble.falling &&
            bubble.y +
                bubble.radius >=
                dangerY
        ) {

            failLevel();

            return;
        }
    }
}


/* ============================================================
   LEVEL COMPLETION
   ============================================================ */

function checkLevelCompletion() {

    const remaining =
        bubbles.filter(
            bubble =>
                !bubble.falling
        );

    if (
        remaining.length === 0 &&
        !gameOver
    ) {

        completeLevel();
    }
}


/* ============================================================
   COMPLETE LEVEL
   ============================================================ */

function completeLevel() {

    gameOver = true;

    if (
        currentLevel >=
        highestUnlockedLevel
    ) {

        highestUnlockedLevel =
            Math.min(
                50,
                currentLevel + 1
            );

        localStorage.setItem(
            "bubbleShooterUnlocked",
            highestUnlockedLevel
        );
    }

    finalScoreEl.textContent =
        formatScore(score);

    levelComplete.hidden = false;
}


/* ============================================================
   FAIL LEVEL
   ============================================================ */

function failLevel() {

    if (gameOver) return;

    gameOver = true;

    failedScoreEl.textContent =
        formatScore(score);

    levelFailed.hidden = false;
}


/* ============================================================
   RESET CURRENT LEVEL
   ============================================================ */

function resetCurrentLevel() {

    levelComplete.hidden = true;

    levelFailed.hidden = true;

    pauseMenu.hidden = true;

    score = 0;

    updateHUD();

    projectile = null;

    currentBubble = {
        color: randomColor()
    };

    nextBubble = {
        color: randomColor()
    };

    levelCreated = false;

    createLevel();

    updateBubblePreview();

    gameOver = false;

    isPaused = false;
}


/* ============================================================
   NEXT LEVEL
   ============================================================ */

nextLevelButton.addEventListener(
    "click",
    () => {

        if (
            currentLevel >= 50
        ) {

            currentLevel = 1;

        } else {

            currentLevel++;
        }

        resetCurrentLevel();

        updateHUD();
    }
);


/* ============================================================
   RETRY
   ============================================================ */

retryButton.addEventListener(
    "click",
    () => {

        resetCurrentLevel();
    }
);


/* ============================================================
   PAUSE
   ============================================================ */

pauseButton.addEventListener(
    "click",
    () => {

        if (gameOver) return;

        isPaused = true;

        pauseMenu.hidden = false;
    }
);

resumeButton.addEventListener(
    "click",
    () => {

        isPaused = false;

        pauseMenu.hidden = true;

        lastTime =
            performance.now();
    }
);


/* ============================================================
   SOUND TOGGLE
   ============================================================ */

let soundEnabled =
    localStorage.getItem(
        "bubbleShooterSound"
    ) !== "off";

soundButton.addEventListener(
    "click",
    () => {

        soundEnabled =
            !soundEnabled;

        localStorage.setItem(
            "bubbleShooterSound",
            soundEnabled
                ? "on"
                : "off"
        );

        soundButton.textContent =
            soundEnabled
                ? "🔊"
                : "🔇";
    }
);

soundButton.textContent =
    soundEnabled
        ? "🔊"
        : "🔇";


/* ============================================================
   DRAWING
   ============================================================ */

function drawBackground() {

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    /*
     * Soft atmospheric glow.
     */

    const gradient =
        ctx.createRadialGradient(
            width / 2,
            height * 0.15,
            20,
            width / 2,
            height * 0.15,
            width * 0.75
        );

    gradient.addColorStop(
        0,
        "rgba(71, 110, 170, 0.08)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    /*
     * Very subtle decorative dots.
     */

    ctx.save();

    ctx.globalAlpha = 0.035;

    ctx.fillStyle =
        "#e7bd68";

    for (
        let x = 16;
        x < width;
        x += 32
    ) {

        for (
            let y = 20;
            y < height;
            y += 32
        ) {

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                1,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }

    ctx.restore();
}


/* ============================================================
   DRAW LASER
   ============================================================ */

function drawAimLaser() {

    if (
        projectile ||
        gameOver ||
        isPaused
    ) {
        return;
    }

    const shooter =
        getShooterPosition();

    let x = shooter.x;

    let y =
        shooter.y - 20;

    let dx =
        Math.cos(aimAngle);

    let dy =
        Math.sin(aimAngle);

    const maxDistance =
        Math.max(
            width,
            height
        ) * 2;

    let remaining =
        maxDistance;

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
        x,
        y
    );

    while (remaining > 0) {

        const distanceToLeft =
            dx < 0
                ? -x / dx
                : Infinity;

        const distanceToRight =
            dx > 0
                ? (width - x) / dx
                : Infinity;

        const distanceToTop =
            dy < 0
                ? -y / dy
                : Infinity;

        const distanceToBottom =
            dy > 0
                ? (height - y) / dy
                : Infinity;

        const wallDistance =
            Math.min(
                distanceToLeft,
                distanceToRight,
                distanceToTop,
                distanceToBottom
            );

        const step =
            Math.min(
                wallDistance,
                remaining
            );

        x += dx * step;

        y += dy * step;

        ctx.lineTo(
            x,
            y
        );

        remaining -= step;

        /*
         * Only show one wall bounce.
         */

        if (
            wallDistance ===
                distanceToLeft ||
            wallDistance ===
                distanceToRight
        ) {

            dx *= -1;

            remaining -= 1;

            if (
                remaining <= 0
            ) {
                break;
            }

            ctx.moveTo(
                x,
                y
            );
        } else {

            break;
        }
    }

    ctx.strokeStyle =
        "rgba(243, 217, 155, 0.52)";

    ctx.lineWidth = 1;

    ctx.setLineDash([
        5,
        7
    ]);

    ctx.stroke();

    ctx.restore();
}


/* ============================================================
   DRAW BUBBLE
   ============================================================ */

function drawBubble(bubble) {

    if (bubble.falling) {

        bubble.y +=
            bubble.fallVelocity *
            0.016;

        bubble.fallVelocity +=
            420 *
            0.016;

        bubble.scale -=
            0.004;

        bubble.rotation +=
            0.05;
    }

    const radius =
        bubble.radius *
        Math.max(
            0,
            bubble.scale
        );

    if (radius <= 0) return;

    ctx.save();

    ctx.translate(
        bubble.x,
        bubble.y
    );

    ctx.rotate(
        bubble.rotation
    );

    /*
     * Shadow.
     */

    ctx.beginPath();

    ctx.arc(
        2,
        4,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0,0,0,0.18)";

    ctx.fill();

    /*
     * Bubble gradient.
     */

    const color =
        COLORS[bubble.color];

    const gradient =
        ctx.createRadialGradient(
            -radius * 0.35,
            -radius * 0.38,
            radius * 0.05,
            0,
            0,
            radius
        );

    gradient.addColorStop(
        0,
        "#ffffff"
    );

    gradient.addColorStop(
        0.08,
        lightenColor(color, 45)
    );

    gradient.addColorStop(
        0.42,
        color
    );

    gradient.addColorStop(
        1,
        darkenColor(color)
    );

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        gradient;

    ctx.fill();

    /*
     * Gloss.
     */

    ctx.beginPath();

    ctx.ellipse(
        -radius * 0.3,
        -radius * 0.38,
        radius * 0.28,
        radius * 0.15,
        -0.35,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(255,255,255,0.58)";

    ctx.fill();

    /*
     * Rim.
     */

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        radius - 0.5,
        0,
        Math.PI * 2
    );

    ctx.strokeStyle =
        "rgba(255,255,255,0.28)";

    ctx.lineWidth = 1;

    ctx.stroke();

    ctx.restore();
}

function lightenColor(hex, amount) {

    const num =
        parseInt(
            hex.replace("#", ""),
            16
        );

    const r =
        clamp(
            ((num >> 16) & 255) + amount,
            0,
            255
        );

    const g =
        clamp(
            ((num >> 8) & 255) + amount,
            0,
            255
        );

    const b =
        clamp(
            (num & 255) + amount,
            0,
            255
        );

    return `rgb(${r}, ${g}, ${b})`;
}


/* ============================================================
   DRAW PROJECTILE
   ============================================================ */

function drawProjectile() {

    if (!projectile) return;

    const bubble = {
        x:
            projectile.x,

        y:
            projectile.y,

        radius:
            projectile.radius,

        color:
            projectile.color,

        scale: 1,

        rotation: 0,

        falling: false
    };

    drawBubble(bubble);
}


/* ============================================================
   MAIN RENDER
   ============================================================ */

function render() {

    drawBackground();

    drawAimLaser();

    bubbles.forEach(
        drawBubble
    );

    drawProjectile();

    /*
     * Danger check continuously.
     */

    if (!gameOver) {
        checkDangerZone();
    }
}


/* ============================================================
   GAME LOOP
   ============================================================ */

function gameLoop(now) {

    const delta =
        Math.min(
            (now - lastTime) / 1000,
            0.033
        );

    lastTime = now;

    if (
        !isPaused &&
        !gameOver
    ) {

        updateProjectile(
            delta
        );
    }

    render();

    requestAnimationFrame(
        gameLoop
    );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

resizeCanvas();

updateHUD();

requestAnimationFrame(
    gameLoop
);
