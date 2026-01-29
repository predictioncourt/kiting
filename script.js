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

// Tuş Ayarları
let attackKey = 'KeyA'; // Varsayılan A tuşu
let attackKeyDisplay = 'A';
let isBindingKey = false;
let isAttackMode = false; // A'ya basıldı mı?

// Oyuncu Ayarları
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    color: '#3498db',
    speed: 5,
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
    // spawnInterval değişkeni kaldırıldı
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
    constructor() {
        this.radius = 20;
        this.color = '#e74c3c';
        
        // 20 Vuruşluk Can
        this.maxHealth = 20;
        this.health = this.maxHealth;

        if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
        }

        this.speed = randomRange(2, 3.5); // Düşman hızı düşürüldü (3-5 -> 2-3.5)
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

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
    // Sadece hiç düşman yoksa yeni bir tane oluştur
    if (enemies.length === 0) {
        enemies.push(new Enemy());
    }
}

function updatePlayer() {
    const dist = getDistance(player.x, player.y, player.targetX, player.targetY);
    
    // Titremeyi önlemek için: Eğer mesafe hızdan küçükse direkt hedefe ışınlan
    if (dist > 0) {
        if (dist < player.speed) {
            player.x = player.targetX;
            player.y = player.targetY;
        } else {
            const angle = Math.atan2(player.targetY - player.y, player.targetX - player.x);
            player.x += Math.cos(angle) * player.speed;
            player.y += Math.sin(angle) * player.speed;
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

    spawnEnemy(timestamp);
    
    updatePlayer();
    enemies.forEach(enemy => enemy.update());
    
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
        // LoL mantığı: Tıkladığın yere en yakın düşman mı? Yoksa sana en yakın mı?
        // Genelde "Attack Move Click" imlece en yakın düşmana saldırır, eğer imleç boşluğa ise
        // menzil içindeki en yakın düşmana saldırır.
        // Kullanıcı "menzil içindeyse direk vursun" dediği için:
        // İmleç yerine bakmaksızın, menzil içindeki düşmana vuralım.
        // Zaten şu an tek düşman var ama genel mantığı kuralım.

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const distToPlayer = getDistance(player.x, player.y, enemy.x, enemy.y);

            // Eğer düşman menzil içindeyse (Menzil + Düşman Yarıçapı)
            if (distToPlayer <= player.range + enemy.radius) {
                // Şimdilik ilk bulduğunu veya en yakınını seçebiliriz.
                // Tek düşman olduğu için direkt bunu hedef alabiliriz.
                targetEnemyIndex = i;
                break; 
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
