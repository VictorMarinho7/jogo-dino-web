/* ========================================================================= */
/* =================== CORRIDA DO ENCANADOR - SCRIPT DO JOGO ================= */
/* ========================================================================= */

/**
 * Este script controla toda a lógica do jogo "Corrida do Encanador",
 * incluindo o movimento do personagem, geração de obstáculos, pontuação,
 * estados de jogo (início, game over) e responsividade aos comandos do jogador.
 */


/* ======================= INICIALIZAÇÃO E CONFIGURAÇÃO ======================= */

// Aguarda o HTML ser completamente carregado para executar o script de inicialização.
document.addEventListener('DOMContentLoaded', () => {
    // Detecta se o dispositivo é mobile com base na existência de eventos de toque.
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const instrucaoPulo = document.getElementById('instrucao-pulo');
    const instrucaoReinicio = document.getElementById('instrucao-reinicio');

    // Altera o texto das instruções se o dispositivo for móvel.
    if (isMobile) {
        instrucaoPulo.textContent = 'Toque na tela para pular.';
        instrucaoReinicio.textContent = 'Use o botão "Reiniciar" após o fim do jogo.';
    }
});


/* =========================== ELEMENTOS DO DOM =========================== */

// Seleciona e armazena os elementos HTML que serão manipulados pelo jogo.
const dino = document.getElementById('dino');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameover');
const startBtn = document.getElementById('start-btn');
const intro = document.getElementById('intro');
const gameContainer = document.getElementById('game-container');
const restartBtnMobile = document.getElementById('restart-btn-mobile');


/* ======================= VARIÁVEIS DE ESTADO DO JOGO ======================= */

let isJumping = false;       // Controla se o personagem está no meio de um pulo.
let isGameOver = false;      // Controla se o jogo terminou.
let score = 0;               // Armazena a pontuação atual.
let gameStarted = false;     // Controla se o loop do jogo está ativo.
let spacePressed = false;    // Previne pulos múltiplos ao segurar a tecla de espaço.
let gameSpeed;               // Armazena a velocidade atual do jogo (duração da animação dos obstáculos).
let cactusSchedulerTimeoutId = null; // Armazena o ID do temporizador que cria os cactos.


/* ======================= PARÂMETROS DE DIFICULDADE ======================= */

// Duração inicial da animação do cacto em segundos (quanto menor, mais rápido).
const INITIAL_ANIMATION_DURATION = 3.0;
// Duração mínima da animação (limite de velocidade).
const MIN_ANIMATION_DURATION = 1.0;
// Pontos necessários para aumentar a velocidade.
const SCORE_FOR_SPEED_INCREASE = 70;
// Fator de redução da duração da animação a cada aumento de velocidade.
const ANIMATION_DURATION_DECREASE_STEP = 0.05;
// Fator para calcular o tempo mínimo de spawn de um cacto (45% da duração da animação).
const MIN_CACTUS_SPAWN_TIME_FACTOR = 0.45;
// Fator para calcular o tempo máximo de spawn de um cacto (90% da duração da animação).
const MAX_CACTUS_SPAWN_TIME_FACTOR = 0.9;
// Intervalo mínimo absoluto (em ms) para criar um novo cacto, evitando que fiquem muito juntos.
const ABSOLUTE_MIN_SPAWN_INTERVAL_MS = 500;


/* =================== MANIPULADORES DE EVENTOS (EVENT LISTENERS) =================== */

// Listener para o botão de reiniciar (versão mobile, por toque).
restartBtnMobile.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Previne ações padrão do navegador, como zoom.
    event.stopPropagation(); // Impede que o toque se propague para outros elementos (como o game-container).
    resetGame();
});

// Listener para o botão de reiniciar (versão desktop, por clique).
restartBtnMobile.addEventListener('click', (event) => {
    event.preventDefault();
    resetGame();
});

// Listeners para o teclado.
document.addEventListener('keydown', (e) => {
    // Pulo com a tecla de espaço.
    if (e.code === 'Space' && !spacePressed && !isJumping && !isGameOver && gameStarted) {
        jump();
        spacePressed = true;
    }
    // Reinício com a tecla 'R'.
    if (e.code === 'KeyR' && isGameOver) {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    // Libera a trava do pulo ao soltar a tecla de espaço.
    if (e.code === 'Space') {
        spacePressed = false;
    }
});

// Listener para o toque na tela (pulo em dispositivos móveis).
gameContainer.addEventListener('touchstart', (event) => {
    event.preventDefault();
    // Permite o pulo sob as mesmas condições do teclado.
    if (!isJumping && !isGameOver && gameStarted) {
        jump();
    }
});


/* ======================== LÓGICA PRINCIPAL DO JOGO (CORE GAME LOGIC) ======================== */

/**
 * Controla a ação de pulo do personagem.
 */
function jump() {
    if (isJumping || isGameOver) return;
    isJumping = true;
    dino.classList.remove('correndo');
    dino.classList.add('dino-jumping');

    // Remove a classe de pulo após a animação (0.5s).
    setTimeout(() => {
        dino.classList.remove('dino-jumping');
    }, 500);

    // Permite que o personagem pule novamente após 1s.
    setTimeout(() => {
        isJumping = false;
        if (!isGameOver) {
            dino.classList.add('correndo');
        }
    }, 1000);
}

/**
 * Cria um novo obstáculo (cano) de tipo aleatório e o insere no jogo.
 */
function createCactus() {
    if (isGameOver) return;

    const tipo = Math.floor(Math.random() * 3); // Gera um tipo de cacto aleatório (0, 1, ou 2).
    let obstacleElement;

    // Cria um grupo de cactos ou um cacto único.
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

    // Remove o obstáculo do DOM após a animação terminar.
    obstacleElement.addEventListener('animationend', () => {
        obstacleElement.remove();
    });

    // Inicia a verificação de colisão para este obstáculo.
    const checkCollisionInterval = setInterval(() => {
        if (isGameOver || !obstacleElement.parentNode) {
            clearInterval(checkCollisionInterval);
            return;
        }

        const obstaclePosition = obstacleElement.getBoundingClientRect();
        const dinoPosition = dino.getBoundingClientRect();
        const hitboxPadding = 9; // Ajuste para uma colisão mais justa.

        // Lógica de verificação de colisão baseada na sobreposição das hitboxes.
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

/**
 * Agenda a criação do próximo cacto com um intervalo de tempo aleatório.
 */
function scheduleNextCactus() {
    if (isGameOver || !gameStarted) return;

    let baseDelayMs = gameSpeed * 1000 * MIN_CACTUS_SPAWN_TIME_FACTOR;
    let randomAdditionalDelayMs = gameSpeed * 1000 * (MAX_CACTUS_SPAWN_TIME_FACTOR - MIN_CACTUS_SPAWN_TIME_FACTOR);
    let spawnDelayMs = baseDelayMs + Math.random() * randomAdditionalDelayMs;
    spawnDelayMs = Math.max(ABSOLUTE_MIN_SPAWN_INTERVAL_MS, spawnDelayMs);

    cactusSchedulerTimeoutId = setTimeout(() => {
        createCactus();
        scheduleNextCactus(); // Chama a si mesma para criar um loop infinito.
    }, spawnDelayMs);
}

/**
 * Finaliza o jogo, exibindo a tela de 'Game Over' e parando as animações.
 */
function GameOver() {
    if (isGameOver) return;
    isGameOver = true;
    gameStarted = false;

    gameOverElement.style.display = 'block';
    restartBtnMobile.style.display = 'block';

    // Para o agendamento de novos cactos.
    if (cactusSchedulerTimeoutId) {
        clearTimeout(cactusSchedulerTimeoutId);
        cactusSchedulerTimeoutId = null;
    }

    // Pausa a animação de todos os cactos na tela.
    document.querySelectorAll('.cactus').forEach(cactus => {
        cactus.style.animationPlayState = 'paused';
    });

    dino.classList.remove('correndo', 'dino-jumping');
    dino.classList.add('gameover');
}

/**
 * Reseta todas as variáveis e elementos para o estado inicial para um novo jogo.
 */
function resetGame() {
    isGameOver = false;
    scoreElement.textContent = '0000';
    gameOverElement.style.display = 'none';
    restartBtnMobile.style.display = 'none';

    if (cactusSchedulerTimeoutId) {
        clearTimeout(cactusSchedulerTimeoutId);
        cactusSchedulerTimeoutId = null;
    }

    document.querySelectorAll('.cactus').forEach(cactus => cactus.remove());
    dino.className = 'dino'; // Reseta todas as classes do dino.
    startBtn.style.display = 'none'; // Mantém o botão de iniciar escondido.
    intro.style.display = 'block';

    startGameFlow();
}

/**
 * Atualiza a pontuação na tela e aumenta a dificuldade do jogo.
 */
function updateScore() {
    if (isGameOver || !gameStarted) return;
    score++;
    scoreElement.textContent = String(score).padStart(4, '0');

    // Aumenta a velocidade do jogo a cada X pontos.
    if (score > 0 && score % SCORE_FOR_SPEED_INCREASE === 0) {
        if (gameSpeed > MIN_ANIMATION_DURATION) {
            gameSpeed -= ANIMATION_DURATION_DECREASE_STEP;
            gameSpeed = Math.max(MIN_ANIMATION_DURATION, gameSpeed); // Garante que não ultrapasse o limite mínimo.
        }
    }
    setTimeout(updateScore, 95); // Loop de atualização de score.
}

/**
 * Inicia o fluxo principal do jogo.
 */
function startGameFlow() {
    gameStarted = true;
    isGameOver = false;
    gameSpeed = INITIAL_ANIMATION_DURATION;
    score = 0;
    scoreElement.textContent = '0000';

    dino.classList.remove('gameover', 'dino-jumping');
    dino.classList.add('correndo');

    updateScore();

    if (cactusSchedulerTimeoutId) {
        clearTimeout(cactusSchedulerTimeoutId);
    }
    scheduleNextCactus();
}


/* ============================ INÍCIO DO JOGO ============================ */

// Listener para o botão 'Iniciar Jogo' que dá o pontapé inicial.
startBtn.addEventListener('click', () => {
    if (!gameStarted) {
        startBtn.style.display = 'none'; 
        startGameFlow();
    }
});