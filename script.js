const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const failReasonEl = document.getElementById('fail-reason');

// Ayarlar Elementleri
const settingsModal = document.getElementById('settings-modal');
const keyBindBtn = document.getElementById('key-bind-btn');
const keyBindMsg = document.getElementById('key-bind-msg');
const currentKeyDisplay = document.getElementById('current-key-display');

// Canvas Boyutlandırma
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Oyun Değişkenleri
let gameRunning = true;
let score = 0;
// lastSpawnTime ve spawnInterval artık tek düşman mantığında gereksiz ama
// respawn gecikmesi için kullanabiliriz.
let lastSpawnTime = 0; 
let gameMode = 'normal'; // 'normal' veya 'multi'

function changeGameMode(mode) {
    gameMode = mode;
    restartGame();
}

// Tuş Ayarları
let attackKey = 'KeyA'; // Varsayılan A tuşu
let attackKeyDisplay = 'A';
let isBindingKey = false;
let isAttackMode = false; // A'ya basıldı mı?

const SPEEDS = {
    playerNormal: 260,
    playerMulti: 220,
    enemyNormalMin: 120,
    enemyNormalMax: 190,
    enemyMultiMin: 190,
    enemyMultiMax: 190,
    enemyMultiStart: 190
};

let lastFrameTime = performance.now();

// Oyuncu Ayarları
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    color: '#3498db',
    speed: SPEEDS.playerNormal,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    range: 200 // Saldırı Menzili
};

// Düşmanlar Dizisi
let enemies = [];

// Yardımcı Fonksiyonlar
function getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Oyun Başlatma/Sıfırlama
function restartGame() {
    gameRunning = true;
    score = 0;
    scoreEl.innerText = score;
    enemies = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.targetX = player.x;
    player.targetY = player.y;
    player.speed = gameMode === 'multi' ? SPEEDS.playerMulti : SPEEDS.playerNormal;
    // spawnInterval değişkeni kaldırıldı
    lastSpawnTime = performance.now(); // Reset spawn timer
    lastFrameTime = performance.now();
    
    // Çoklu modda başlangıçta 3 düşman
    if (gameMode === 'multi') {
        for(let i = 0; i < 3; i++) {
            enemies.push(new Enemy(3, SPEEDS.enemyMultiStart)); 
        }
    }

    isAttackMode = false;
    document.body.classList.remove('attack-mode');
    gameOverScreen.classList.add('hidden');
    requestAnimationFrame(gameLoop);
}

function gameOver(reason) {
    gameRunning = false;
    failReasonEl.innerText = reason;
    gameOverScreen.classList.remove('hidden');
}

// Ayarlar Menüsü Fonksiyonları
function toggleSettings() {
    settingsModal.classList.toggle('hidden');
    // Oyun durdurulabilir istenirse, şimdilik devam etsin
}

function startKeyBind() {
    isBindingKey = true;
    keyBindBtn.classList.add('binding');
    keyBindBtn.innerText = '...';
    keyBindMsg.classList.remove('hidden');
}

function updateKeyBinding(code, key) {
    attackKey = code;
    attackKeyDisplay = key.toUpperCase();
    
    // UI Güncelle
    keyBindBtn.innerText = attackKeyDisplay;
    currentKeyDisplay.innerText = attackKeyDisplay;
    
    // Reset
    isBindingKey = false;
    keyBindBtn.classList.remove('binding');
    keyBindMsg.classList.add('hidden');
}

// Düşman Sınıfı
class Enemy {
    constructor(health, speed) {
        this.radius = 20;
        this.color = '#e74c3c';
        
        // Sağlık ve Hız parametrelerini al, yoksa varsayılanları kullan
        this.maxHealth = health || 20;
        this.health = this.maxHealth;

        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
        }

        this.speed = speed || randomRange(SPEEDS.enemyNormalMin, SPEEDS.enemyNormalMax);
    }

    update(deltaSeconds) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const step = this.speed * deltaSeconds;
        this.x += Math.cos(angle) * step;
        this.y += Math.sin(angle) * step;

        const dist = getDistance(this.x, this.y, player.x, player.y);
        if (dist - this.radius - player.radius < 0) {
            gameOver("Düşman sana dokundu! Mesafeyi koru.");
        }
    }

    draw() {
        // Düşman Gövdesi
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Can Barı Arkaplanı
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 20, this.y - 35, 40, 6);

        // Can Barı Doluluğu
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#2ecc71'; // Yeşil
        ctx.fillRect(this.x - 20, this.y - 35, 40 * healthPercent, 6);
        
        // Can Sayısı (Opsiyonel, netlik için)
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.health, this.x, this.y - 40);
    }
}

function spawnEnemy(timestamp) {
    if (gameMode === 'normal') {
        // Sadece hiç düşman yoksa yeni bir tane oluştur
        if (enemies.length === 0) {
            enemies.push(new Enemy());
        }
    } else if (gameMode === 'multi') {
        if (timestamp - lastSpawnTime > 1200) {
            if (enemies.length < 5) {
                enemies.push(new Enemy(3, randomRange(SPEEDS.enemyMultiMin, SPEEDS.enemyMultiMax)));
            }
            lastSpawnTime = timestamp;
        }
    }
}

function updatePlayer(deltaSeconds) {
    const dist = getDistance(player.x, player.y, player.targetX, player.targetY);
    const step = player.speed * deltaSeconds;
    
    // Titremeyi önlemek için: Eğer mesafe hızdan küçükse direkt hedefe ışınlan
    if (dist > 0) {
        if (dist < step) {
            player.x = player.targetX;
            player.y = player.targetY;
        } else {
            const angle = Math.atan2(player.targetY - player.y, player.targetX - player.x);
            player.x += Math.cos(angle) * step;
            player.y += Math.sin(angle) * step;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Saldırı Menzili (Sadece Attack Mode aktifse göster)
    if (isAttackMode) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        ctx.closePath();
    }

    // Oyuncu
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    
    // Hareket Hedefi
    if (getDistance(player.x, player.y, player.targetX, player.targetY) > 5) {
        ctx.beginPath();
        ctx.arc(player.targetX, player.targetY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fill();
    }

    enemies.forEach(enemy => enemy.draw());
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;

    spawnEnemy(timestamp);
    
    updatePlayer(deltaSeconds);
    enemies.forEach(enemy => enemy.update(deltaSeconds));
    
    draw();

    requestAnimationFrame(gameLoop);
}

// --- KONTROLLER ---

// Klavye Kontrolleri (Saldırı Modu ve Tuş Atama)
window.addEventListener('keydown', (e) => {
    // Eğer tuş atama modundaysak
    if (isBindingKey) {
        updateKeyBinding(e.code, e.key);
        return;
    }

    // Saldırı Tuşuna Basıldı mı? (Örn: A)
    if (e.code === attackKey && gameRunning) {
        isAttackMode = true;
        document.body.classList.add('attack-mode'); // CSS ile cursor değişecek
    }
});

// Sağ Tık: Hareket (mousedown ile daha seri tepki)
window.addEventListener('mousedown', (e) => {
    if (!gameRunning) return;

    // Sağ Tık (Button 2)
    if (e.button === 2) {
        // Sağ tık her zaman saldırı modunu iptal eder ve hareket eder
        isAttackMode = false;
        document.body.classList.remove('attack-mode');

        player.targetX = e.clientX;
        player.targetY = e.clientY;
    }
});

// Context Menu'yu engelle (Sadece görsel engelleme)
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Sol Tık: Saldırı
window.addEventListener('click', (e) => {
    if (!gameRunning) return;
    
    // UI elementlerine tıklamayı engelle (Basit kontrol)
    if (e.target.closest('#settings-modal') || e.target.closest('#settings-btn')) return;

    // SADECE Attack Mode açıksa saldırı yapılabilir
    if (isAttackMode) {
        const clickX = e.clientX;
        const clickY = e.clientY;
        
        // --- YENİ MANTIK: MENZİL İÇİNDEKİ EN YAKIN DÜŞMANI BUL ---
        // Kullanıcı yere tıklasa bile, menzil içinde bir düşman varsa ona vurur (Attack Move)
        
        let targetEnemyIndex = -1;
        let minDistanceToEnemy = Infinity;

        // Önce tıklanan noktaya en yakın düşmanı değil,
        // OYUNCUNUN MENZİLİ içindeki en yakın düşmanı bulmamız lazım.
        
        let closestDist = Infinity;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const distToPlayer = getDistance(player.x, player.y, enemy.x, enemy.y);

            // Eğer düşman menzil içindeyse (Menzil + Düşman Yarıçapı)
            if (distToPlayer <= player.range + enemy.radius) {
                // En yakındakini seç
                if (distToPlayer < closestDist) {
                    closestDist = distToPlayer;
                    targetEnemyIndex = i;
                }
            }
        }

        if (targetEnemyIndex !== -1) {
            const enemy = enemies[targetEnemyIndex];
            
            // HEDEF VURULDU (Otomatik)
            enemy.health--; 
            score += 10;
            scoreEl.innerText = score;
            
            if (enemy.health <= 0) {
                enemies.splice(targetEnemyIndex, 1);
            }
            
            // Başarılı vuruş -> Modu kapat
            isAttackMode = false;
            document.body.classList.remove('attack-mode');
            
            // ÖNEMLİ: Saldırı yapıldığı için hareket ETMEMELİ.
            // (Mevcut hedef noktasını olduğu yerde bırakabiliriz veya durdurabiliriz)
            player.targetX = player.x;
            player.targetY = player.y;

        } else {
            // Menzilde kimse yoksa -> Tıklanan yere yürü (Attack Move)
            player.targetX = clickX;
            player.targetY = clickY;
            isAttackMode = false;
            document.body.classList.remove('attack-mode');
        }
    }
});

requestAnimationFrame(gameLoop);
