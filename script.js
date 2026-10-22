
"use strict";

// ===================================
// 1. RÉCUPÉRATION DES ÉLÉMENTS HTML
// ===================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const levelElement = document.getElementById("level");

const startButton = document.getElementById("start-btn");
const pauseButton = document.getElementById("pause-btn");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayButton = document.getElementById("overlay-button");
const overlayIcon = document.querySelector(".overlay-icon");

// ===================================
// 2. CONFIGURATION DU JEU
// ===================================

const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;

const INITIAL_SPEED = 150;
const MIN_SPEED = 65;

const COLORS = {
  background: "#101c2a",
  grid: "#1b2a3a",
  snake: "#4ade80",
  snakeHead: "#a7f3d0",
  food: "#fb7185",
  eyes: "#102a1c"
};

let snake;
let food;
let direction;
let nextDirection;

let score = 0;
let level = 1;
let speed = INITIAL_SPEED;

let gameInterval = null;
let gameState = "ready";
let directionChanged = false;

// Lecture sécurisée du record local
let bestScore = 0;

try {
  bestScore = Number(localStorage.getItem("snakeBestScore")) || 0;
} catch (error) {
  bestScore = 0;
}

// ===================================
// 3. INITIALISATION
// ===================================

function initializeGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };

  score = 0;
  level = 1;
  speed = INITIAL_SPEED;
  directionChanged = false;

  generateFood();
  updateScoreboard();
  drawGame();
}

function updateScoreboard() {
  scoreElement.textContent = score;
  bestScoreElement.textContent = bestScore;
  levelElement.textContent = level;
}

// ===================================
// 4. GÉNÉRATION DES POMMES
// ===================================

function generateFood() {
  const emptyCells = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {

      const occupied = snake.some(
        segment => segment.x === x && segment.y === y
      );

      if (!occupied) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length === 0) {
    food = null;
    return;
  }

  const randomIndex = Math.floor(
    Math.random() * emptyCells.length
  );

  food = emptyCells[randomIndex];
}

// ===================================
// 5. DESSIN DU PLATEAU
// ===================================

function drawBoard() {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;

  for (let i = 0; i <= GRID_SIZE; i++) {
    const position = i * CELL_SIZE;

    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

// ===================================
// 6. DESSIN DU SERPENT
// ===================================

function drawSnake() {
  snake.forEach((segment, index) => {

    const isHead = index === 0;

    const padding = 2;
    const x = segment.x * CELL_SIZE + padding;
    const y = segment.y * CELL_SIZE + padding;
    const size = CELL_SIZE - padding * 2;

    ctx.fillStyle = isHead
      ? COLORS.snakeHead
      : COLORS.snake;

    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 5);
    ctx.fill();

    if (isHead) {
      drawEyes(segment);
    }
  });
}

function drawEyes(head) {
  const x = head.x * CELL_SIZE;
  const y = head.y * CELL_SIZE;

  ctx.fillStyle = COLORS.eyes;

  let eyes;

  if (direction.x !== 0) {
    const eyeX = direction.x === 1 ? 14 : 6;
    eyes = [
      { x: eyeX, y: 6 },
      { x: eyeX, y: 14 }
    ];
  } else {
    const eyeY = direction.y === 1 ? 14 : 6;
    eyes = [
      { x: 6, y: eyeY },
      { x: 14, y: eyeY }
    ];
  }

  eyes.forEach(eye => {
    ctx.beginPath();
    ctx.arc(x + eye.x, y + eye.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ===================================
// 7. DESSIN DES POMMES
// ===================================

function drawFood() {
  if (!food) return;

  const centerX = food.x * CELL_SIZE + CELL_SIZE / 2;
  const centerY = food.y * CELL_SIZE + CELL_SIZE / 2;

  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Petite feuille verte
  ctx.fillStyle = COLORS.snake;
  ctx.beginPath();
  ctx.ellipse(
    centerX + 3,
    centerY - 8,
    4,
    2,
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawGame() {
  drawBoard();
  drawFood();
  drawSnake();
}

// ===================================
// 8. MOUVEMENT DU SERPENT
// ===================================

function moveSnake() {
  if (gameState !== "playing") return;

  direction = { ...nextDirection };
  directionChanged = false;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  // Collision avec les murs
  if (
    head.x < 0 ||
    head.x >= GRID_SIZE ||
    head.y < 0 ||
    head.y >= GRID_SIZE
  ) {
    endGame();
    return;
  }

  const eatingFood = food &&
    head.x === food.x &&
    head.y === food.y;

  // La queue bouge si le serpent ne mange pas.
  // On peut donc entrer dans son ancienne case.
  const bodyToCheck = eatingFood
    ? snake
    : snake.slice(0, -1);

  const hitBody = bodyToCheck.some(
    segment => segment.x === head.x &&
               segment.y === head.y
  );

  if (hitBody) {
    endGame();
    return;
  }

  // Ajoute la nouvelle tête
  snake.unshift(head);

  if (eatingFood) {
    score += 10;

    // Nouveau record
    if (score > bestScore) {
      bestScore = score;

      try {
        localStorage.setItem(
          "snakeBestScore",
          String(bestScore)
        );
      } catch (error) {
        // Le jeu fonctionne même si le stockage est bloqué.
      }
    }

    // Un niveau tous les 50 points
    level = Math.floor(score / 50) + 1;

    const newSpeed = Math.max(
      MIN_SPEED,
      INITIAL_SPEED - (level - 1) * 12
    );

    if (newSpeed !== speed) {
      speed = newSpeed;
      startLoop();
    }

    generateFood();
    updateScoreboard();

    if (food === null) {
      drawGame();
      winGame();
      return;
    }

  } else {
    snake.pop();
  }

  drawGame();
}

// ===================================
// 9. BOUCLE DU JEU
// ===================================

function stopLoop() {
  if (gameInterval !== null) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function startLoop() {
  stopLoop();

  gameInterval = setInterval(() => {
    moveSnake();
  }, speed);
}

// ===================================
// 10. DÉMARRAGE DU JEU
// ===================================

function startGame() {
  stopLoop();
  initializeGame();

  gameState = "playing";

  overlay.classList.add("hidden");

  pauseButton.disabled = false;
  pauseButton.textContent = "⏸ Pause";

  startLoop();
}

// ===================================
// 11. PAUSE ET REPRISE
// ===================================

function togglePause() {
  if (gameState === "playing") {
    gameState = "paused";
    stopLoop();

    pauseButton.textContent = "▶ Reprendre";

    showOverlay(
      "⏸",
      "Jeu en pause",
      "Prêt à continuer ta partie ?",
      "▶ Reprendre"
    );

  } else if (gameState === "paused") {
    resumeGame();
  }
}

function resumeGame() {
  if (gameState !== "paused") return;

  gameState = "playing";

  overlay.classList.add("hidden");
  pauseButton.textContent = "⏸ Pause";

  startLoop();
}

// ===================================
// 12. FIN DE PARTIE
// ===================================

function endGame() {
  stopLoop();
  gameState = "gameover";

  pauseButton.disabled = true;

  showOverlay(
    "💀",
    "Game Over",
    `Ton score final : ${score} points`,
    "↻ Rejouer"
  );
}

function winGame() {
  stopLoop();
  gameState = "won";
  pauseButton.disabled = true;

  showOverlay(
    "🏆",
    "Victoire !",
    `Plateau rempli ! Score : ${score}`,
    "↻ Rejouer"
  );
}

function showOverlay(icon, title, message, buttonText) {
  overlayIcon.textContent = icon;
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayButton.textContent = buttonText;

  overlay.classList.remove("hidden");
}

// ===================================
// 13. GESTION DES DIRECTIONS
// ===================================

function changeDirection(newDirection) {
  if (gameState !== "playing") return;

  // Une seule modification par déplacement :
  // évite les demi-tours instantanés.
  if (directionChanged) return;

  if (
    newDirection.x === -direction.x &&
    newDirection.y === -direction.y
  ) {
    return;
  }

  nextDirection = newDirection;
  directionChanged = true;
}

// ===================================
// 14. COMMANDES CLAVIER
// ===================================

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  const directions = {
    arrowup: { x: 0, y: -1 },
    z: { x: 0, y: -1 },
    w: { x: 0, y: -1 },

    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },

    arrowleft: { x: -1, y: 0 },
    q: { x: -1, y: 0 },
    a: { x: -1, y: 0 },

    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 }
  };

  if (directions[key]) {
    event.preventDefault();
    changeDirection(directions[key]);
  }

  if (event.code === "Space") {
    event.preventDefault();

    if (event.repeat) return;

    if (gameState === "ready" ||
        gameState === "gameover" ||
        gameState === "won") {
      startGame();
    } else {
      togglePause();
    }
  }
});

// ===================================
// 15. COMMANDES TACTILES
// ===================================

document.querySelectorAll("[data-direction]")
  .forEach(button => {

    button.addEventListener("click", () => {
      const directionName = button.dataset.direction;

      const directions = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
      };

      changeDirection(directions[directionName]);
    });

  });

// ===================================
// 16. ÉVÉNEMENTS DES BOUTONS
// ===================================

startButton.addEventListener("click", startGame);

pauseButton.addEventListener("click", togglePause);

overlayButton.addEventListener("click", () => {
  if (gameState === "paused") {
    resumeGame();
  } else {
    startGame();
  }
});

// ===================================
// 17. INITIALISATION AU CHARGEMENT
// ===================================

initializeGame();

showOverlay(
  "",
  "Prêt à jouer ?",
  "Mange les pommes, grandis et évite les collisions.",
  "▶ Commencer"
);
