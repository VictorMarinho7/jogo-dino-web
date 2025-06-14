// Elementos do jogo
const dino = document.getElementById('dino');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameover');
const startBtn = document.getElementById('start-btn');
const intro = document.getElementById('intro'); // Elemento de introdução
const gameContainer = document.getElementById('game-container');
const restartBtnMobile = document.getElementById('restart-btn-mobile');

// --- Variáveis de Jogo e Dificuldade ---
let isJumping = false;
let isGameOver = false;
let score = 0;
let gameStarted = false;
let spacePressed = false;

let gameSpeed;
const INITIAL_ANIMATION_DURATION = 3.0; // Duração inicial da animação em segundos
const MIN_ANIMATION_DURATION = 1.0; // Duração mínima da animação em segundos
const SCORE_FOR_SPEED_INCREASE = 70; // Pontuação necessária para aumentar a velocidade do jogo
const ANIMATION_DURATION_DECREASE_STEP = 0.05; // Passo de diminuição da duração da animação em segundos

let cactusSchedulerTimeoutId = null; // ID do timeout para agendar a criação de cactos
const MIN_CACTUS_SPAWN_TIME_FACTOR = 0.45; // Fator mínimo de spawn de cactos (45% do tempo de animação)
const MAX_CACTUS_SPAWN_TIME_FACTOR = 0.9; // Fator máximo de spawn de cactos (90% do tempo de animação)
const ABSOLUTE_MIN_SPAWN_INTERVAL_MS = 500; // Intervalo mínimo absoluto de spawn de cactos em milissegundos

// --- Funções do Jogo ---
restartBtnMobile.addEventListener('click', resetGame);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !spacePressed && !isJumping && !isGameOver && gameStarted) {
    jump();
    spacePressed = true; // Marca que a tecla de espaço foi pressionada
  }
  if (e.code === 'KeyR' && isGameOver) {
    resetGame();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spacePressed = false;
  }
});

// Adicione este listener de evento de toque ao seu código
gameContainer.addEventListener('touchstart', (event) => {
  // event.preventDefault() previne comportamentos padrão do navegador, como zoom ou scroll.
  event.preventDefault();

  // Chama a função de pulo sob as mesmas condições da tecla de espaço
  if (!isJumping && !isGameOver && gameStarted) {
    jump();
  }
});

function jump() {
  if (isJumping || isGameOver) return;
  isJumping = true;
  dino.classList.remove('correndo');
  dino.classList.add('dino-jumping');
  setTimeout(() => {
    dino.classList.remove('dino-jumping');
  }, 500);
  setTimeout(() => {
    isJumping = false;
    if (!isGameOver) {
      dino.classList.add('correndo');
    }
  }, 1000);
}

function createCactus() {
  if (isGameOver) return;
  const tipo = Math.floor(Math.random() * 3); // 0, 1 ou 2
  const gameContainer = document.getElementById('game-container');
  let obstacleElement;

  if (tipo === 2) {
    const group = document.createElement('div');
    group.classList.add('cactus', 'cactus-group');
    obstacleElement = group;
  } else {
    const cactus = document.createElement('div');
    cactus.classList.add('cactus');
    if (tipo === 1) cactus.classList.add('cactus-small');
    obstacleElement = cactus;
  }
  obstacleElement.style.animation = `moveCactus ${gameSpeed}s linear forwards`;
  gameContainer.appendChild(obstacleElement);

  obstacleElement.addEventListener('animationend', () => {
    obstacleElement.remove();
  });

  const checkCollisionInterval = setInterval(() => {
    if (isGameOver || !obstacleElement.parentNode) {
      clearInterval(checkCollisionInterval);
      return;
    }
    const obstaclePosition = obstacleElement.getBoundingClientRect();
    const dinoPosition = dino.getBoundingClientRect();
    const hitboxPadding = 9; // Padding da hitbox do dinossauro

    if (
      obstaclePosition.left + hitboxPadding < dinoPosition.right - hitboxPadding && 
      obstaclePosition.right - hitboxPadding > dinoPosition.left + hitboxPadding &&
      obstaclePosition.bottom - hitboxPadding > dinoPosition.top + hitboxPadding &&
      obstaclePosition.top + hitboxPadding < dinoPosition.bottom - hitboxPadding
    ) {
      GameOver();
      clearInterval(checkCollisionInterval);
    }
  }, 10);
}

function scheduleNextCactus() {
  if (isGameOver || !gameStarted) {
    return;
  }
  let baseDelayMs = gameSpeed * 1000 * MIN_CACTUS_SPAWN_TIME_FACTOR;
  let randomAdditionalDelayMs = gameSpeed * 1000 * (MAX_CACTUS_SPAWN_TIME_FACTOR - MIN_CACTUS_SPAWN_TIME_FACTOR);
  let spawnDelayMs = baseDelayMs + Math.random() * randomAdditionalDelayMs;
  spawnDelayMs = Math.max(ABSOLUTE_MIN_SPAWN_INTERVAL_MS, spawnDelayMs);

  cactusSchedulerTimeoutId = setTimeout(() => {
    createCactus();
    scheduleNextCactus();
  }, spawnDelayMs);
}

function GameOver() {
    if (isGameOver) return;
    isGameOver = true;
    gameStarted = false;
    gameOverElement.style.display = 'block';
    restartBtnMobile.style.display = 'block'; // MOSTRA o botão de reiniciar

  if (cactusSchedulerTimeoutId) {
    clearTimeout(cactusSchedulerTimeoutId);
    cactusSchedulerTimeoutId = null;
  }

  document.querySelectorAll('.cactus').forEach(cactus => {
    cactus.style.animationPlayState = 'paused';
  });
  dino.classList.remove('correndo', 'dino-jumping');
  dino.classList.add('gameover');
}

function resetGame() {
  isGameOver = false;
  scoreElement.textContent = '0000';
  gameOverElement.style.display = 'none';
  restartBtnMobile.style.display = 'none'; // ESCONDE o botão de reiniciar

  if (cactusSchedulerTimeoutId) {
    clearTimeout(cactusSchedulerTimeoutId);
    cactusSchedulerTimeoutId = null;
  }

  document.querySelectorAll('.cactus').forEach(cactus => cactus.remove());
  dino.className = 'dino';
  startBtn.style.display = 'none';
  intro.style.display = 'block';

  startGameFlow();
}

function updateScore() {
  if (isGameOver || !gameStarted) return;
  score++;
  scoreElement.textContent = String(score).padStart(4, '0');

  if (score > 0 && score % SCORE_FOR_SPEED_INCREASE === 0) {
    if (gameSpeed > MIN_ANIMATION_DURATION) {
      gameSpeed -= ANIMATION_DURATION_DECREASE_STEP;
      gameSpeed = Math.max(MIN_ANIMATION_DURATION, gameSpeed);
    }
  }
  setTimeout(updateScore, 95);
}

function startGameFlow() {
  gameStarted = true; // Define que o jogo começou/está rodando
  isGameOver = false; 
  gameSpeed = INITIAL_ANIMATION_DURATION;
  score = 0;
  scoreElement.textContent = '0000';

  dino.classList.remove('gameover', 'dino-jumping');
  dino.classList.add('correndo');
  
  updateScore();

  // A verificação redundante "if(!gameStarted) gameStarted = true;" foi removida daqui.
  
  if (cactusSchedulerTimeoutId) {
    clearTimeout(cactusSchedulerTimeoutId);
  }
  scheduleNextCactus();
}

startBtn.addEventListener('click', () => {
  if (!gameStarted) {
    startBtn.style.display = 'none';
    intro.style.display = 'block';
    startGameFlow();
  }
});