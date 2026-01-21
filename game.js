// VK Bridge initialization
let vkBridge;

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const scoreElement = document.getElementById('score');

// Load background image
const bgImage = new Image();
bgImage.src = 'images/Postapocalypse.jpg';

// Character system
let character = {
    name: 'Герой',
    level: 1,
    exp: 0,
    expToNextLevel: 100,
    hp: 100,
    maxHp: 100,
    statPoints: 5,
    stats: {
        strength: 10,
        agility: 10,
        vitality: 10,
        intelligence: 10,
        luck: 10
    },
    x: 0,
    y: 0,
    width: 60,
    height: 60
};

// Primary boss
let boss = {
    name: 'Мутант-разведчик',
    level: 1,
    hp: 50,
    maxHp: 50,
    damage: 5,
    defense: 2,
    expReward: 50,
    x: 0,
    y: 0,
    width: 80,
    height: 80,
    alive: true
};

// Track how many times player defeated boss1
let boss1KillCount = 0;

// Stronger second boss, initially locked
let boss2 = {
    name: 'Мутант-воин',
    level: 3,
    hp: 120,
    maxHp: 120,
    damage: 18,
    defense: 6,
    expReward: 200,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    alive: false,
    locked: true
};

let combatLog = [];
let maxCombatLogs = 5;

// Combat animation
let inCombat = false;
let combatTimer = 0;
let damageAnimations = [];

// Track if a health potion was used in the current combat
let potionUsedInCurrentCombat = false;

// Shop system
let shopIconBounds = { x: 100, y: 20, width: 50, height: 50 };
let showShopPanel = false;
let shopPanelOpacity = 0;
let shopAnimating = false;

// Character icon bounds and panel visibility
let characterIconBounds = { x: 20, y: 20, width: 60, height: 60 };
let showCharacterPanel = false;

let playerGold = 100; // Starting gold

// Remember default score top to restore when not in combat
let defaultScoreTop = null;

let shopItems = [
    {
        id: 1,
        name: 'Кинжал стража',
        description: 'Острый клинок для быстрых атак',
        damage: 15,
        price: 50,
        type: 'weapon',
        icon: '🗡️',
        owned: false
    },
    {
        id: 2,
        name: 'Ружье охотника',
        description: 'Дальнобойное оружие с высоким уроном',
        damage: 25,
        price: 120,
        type: 'weapon',
        icon: '🔫',
        owned: false
    },
    {
        id: 3,
        name: 'Зелье здоровья',
        description: 'Восстанавливает 50 HP',
        healing: 50,
        price: 30,
        type: 'consumable',
        icon: '🧪',
        owned: false,
        count: 0
    }
];

let equippedWeapon = null;

// Initialize VK Bridge
async function initVK() {
    try {
        vkBridge = window.vkBridge;
        await vkBridge.send('VKWebAppInit');
        console.log('VK Bridge initialized');
        
        // Get user info
        const user = await vkBridge.send('VKWebAppGetUserInfo');
        console.log('User:', user.first_name);
    } catch (error) {
        console.error('VK Bridge error:', error);
    }
}

// Setup canvas size
function setupCanvas() {
    if (!canvas || !ctx) {
        console.error('Canvas not found!');
        return;
    }
    
    const maxWidth = Math.min(window.innerWidth - 40, 800);
    const maxHeight = Math.min(window.innerHeight - 100, 600);
    
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    
    console.log('Canvas size:', canvas.width, canvas.height);
    
    // Initialize positions after canvas size is set
    character.x = canvas.width / 4;
    character.y = canvas.height / 2 - 30;

    // Place bosses on the right side; boss2 further to the right
    boss.x = canvas.width * 0.65 - boss.width / 2;
    boss.y = canvas.height / 2 - boss.height / 2;

    boss2.x = canvas.width * 0.85 - boss2.width / 2;
    boss2.y = canvas.height / 2 - boss2.height / 2;
}

// Draw character icon
function drawCharacterIcon() {
    // Icon shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(characterIconBounds.x + 2, characterIconBounds.y + 2, 
                 characterIconBounds.width, characterIconBounds.height);
    
    // Icon background with gradient
    const gradient = ctx.createLinearGradient(
        characterIconBounds.x, characterIconBounds.y,
        characterIconBounds.x, characterIconBounds.y + characterIconBounds.height
    );
    gradient.addColorStop(0, 'rgba(102, 126, 234, 1)');
    gradient.addColorStop(1, 'rgba(118, 75, 162, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(characterIconBounds.x, characterIconBounds.y, 
                 characterIconBounds.width, characterIconBounds.height);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(characterIconBounds.x, characterIconBounds.y, 
                   characterIconBounds.width, characterIconBounds.height);
    
    // Inner glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(characterIconBounds.x + 1, characterIconBounds.y + 1, 
                   characterIconBounds.width - 2, characterIconBounds.height - 2);
    
    // Draw simple character icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', characterIconBounds.x + characterIconBounds.width / 2, 
                 characterIconBounds.y + characterIconBounds.height / 2);
    
    // Level badge
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 14px Arial';
    ctx.strokeText(`${character.level}`, characterIconBounds.x + characterIconBounds.width - 10,
                 characterIconBounds.y + 10);
    ctx.fillText(`${character.level}`, characterIconBounds.x + characterIconBounds.width - 10,
                 characterIconBounds.y + 10);
}

// Draw shop icon
function drawShopIcon() {
    // Icon shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(shopIconBounds.x + 2, shopIconBounds.y + 2, 
                 shopIconBounds.width, shopIconBounds.height);
    
    // Icon background with gradient
    const gradient = ctx.createLinearGradient(
        shopIconBounds.x, shopIconBounds.y,
        shopIconBounds.x, shopIconBounds.y + shopIconBounds.height
    );
    gradient.addColorStop(0, 'rgba(255, 193, 7, 1)');
    gradient.addColorStop(1, 'rgba(255, 152, 0, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(shopIconBounds.x, shopIconBounds.y, 
                 shopIconBounds.width, shopIconBounds.height);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(shopIconBounds.x, shopIconBounds.y, 
                   shopIconBounds.width, shopIconBounds.height);
    
    // Inner glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(shopIconBounds.x + 1, shopIconBounds.y + 1, 
                   shopIconBounds.width - 2, shopIconBounds.height - 2);
    
    // Draw shop icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏪', shopIconBounds.x + shopIconBounds.width / 2, 
                 shopIconBounds.y + shopIconBounds.height / 2);
    
    // Gold display
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = 'bold 14px Arial';
    ctx.strokeText(`${playerGold}`, shopIconBounds.x + shopIconBounds.width / 2,
                 shopIconBounds.y + shopIconBounds.height + 15);
    ctx.fillText(`${playerGold}`, shopIconBounds.x + shopIconBounds.width / 2,
                 shopIconBounds.y + shopIconBounds.height + 15);
}

// Draw character on canvas
function drawCharacter() {
    // Character body
    ctx.fillStyle = '#667eea';
    ctx.fillRect(character.x, character.y, character.width, character.height);
    
    // Character face
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧙', character.x + character.width / 2, 
                 character.y + character.height / 2);
    
    // Name and level above character
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px Arial';
    ctx.strokeText(`${character.name} [Ур.${character.level}]`, 
                   character.x + character.width / 2, character.y - 10);
    ctx.fillText(`${character.name} [Ур.${character.level}]`, 
                 character.x + character.width / 2, character.y - 10);
    
    // HP bar
    const hpBarWidth = character.width;
    const hpBarHeight = 8;
    const hpPercent = character.hp / character.maxHp;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(character.x, character.y + character.height + 5, hpBarWidth, hpBarHeight);
    ctx.fillStyle = character.hp < character.maxHp * 0.3 ? '#f44336' : '#4caf50';
    ctx.fillRect(character.x, character.y + character.height + 5, hpBarWidth * hpPercent, hpBarHeight);
    
    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(`${character.hp}/${character.maxHp}`, character.x + character.width / 2, character.y + character.height + 25);
    
    // Show equipped weapon icon
    if (equippedWeapon) {
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(equippedWeapon.icon, character.x - 10, character.y + 20);
    }
}

// Draw boss
function drawBoss() {
    // Draw first boss
    if (boss.alive) {
        // Boss body
        ctx.fillStyle = boss.hp < boss.maxHp * 0.3 ? '#d32f2f' : '#8b0000';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

        // Boss face
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👹', boss.x + boss.width / 2, boss.y + boss.height / 2);

        // Boss name and level
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px Arial';
        ctx.strokeText(`${boss.name} [Ур.${boss.level}]`, 
                       boss.x + boss.width / 2, boss.y - 10);
        ctx.fillText(`${boss.name} [Ур.${boss.level}]`, 
                     boss.x + boss.width / 2, boss.y - 10);

        // HP bar
        const hpBarWidth = boss.width;
        const hpBarHeight = 8;
        const hpPercent = boss.hp / boss.maxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(boss.x, boss.y + boss.height + 5, hpBarWidth, hpBarHeight);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(boss.x, boss.y + boss.height + 5, hpBarWidth * hpPercent, hpBarHeight);

        // HP text
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(`${boss.hp}/${boss.maxHp}`, boss.x + boss.width / 2, boss.y + boss.height + 25);
    }

    // Draw second boss (locked / unlocked)
    if (boss2) {
        if (boss2.locked) {
            // show locked silhouette
            ctx.fillStyle = 'rgba(100,100,100,0.35)';
            ctx.fillRect(boss2.x, boss2.y, boss2.width, boss2.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒', boss2.x + boss2.width / 2, boss2.y + boss2.height / 2);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('Закрыт', boss2.x + boss2.width / 2, boss2.y - 10);
        } else if (boss2.alive) {
            ctx.fillStyle = boss2.hp < boss2.maxHp * 0.3 ? '#b71c1c' : '#5d0000';
            ctx.fillRect(boss2.x, boss2.y, boss2.width, boss2.height);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀', boss2.x + boss2.width / 2, boss2.y + boss2.height / 2);

            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 16px Arial';
            ctx.strokeText(`${boss2.name} [Ур.${boss2.level}]`, boss2.x + boss2.width / 2, boss2.y - 10);
            ctx.fillText(`${boss2.name} [Ур.${boss2.level}]`, boss2.x + boss2.width / 2, boss2.y - 10);

            const hpBarWidth2 = boss2.width;
            const hpBarHeight2 = 8;
            const hpPercent2 = boss2.hp / boss2.maxHp;
            ctx.fillStyle = '#333';
            ctx.fillRect(boss2.x, boss2.y + boss2.height + 5, hpBarWidth2, hpBarHeight2);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(boss2.x, boss2.y + boss2.height + 5, hpBarWidth2 * hpPercent2, hpBarHeight2);

            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(`${boss2.hp}/${boss2.maxHp}`, boss2.x + boss2.width / 2, boss2.y + boss2.height + 25);
        }
    }
}

// Damage animation system
function addDamageAnimation(x, y, damage, color) {
    damageAnimations.push({
        x: x,
        y: y,
        damage: damage,
        color: color,
        opacity: 1,
        offsetY: 0
    });
}

function updateDamageAnimations() {
    damageAnimations.forEach(anim => {
        anim.offsetY -= 2;
        anim.opacity -= 0.02;
    });
    
    damageAnimations = damageAnimations.filter(anim => anim.opacity > 0);
}

function drawDamageAnimations() {
    damageAnimations.forEach(anim => {
        ctx.save();
        ctx.globalAlpha = anim.opacity;
        ctx.fillStyle = anim.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(`${anim.damage}`, anim.x, anim.y + anim.offsetY);
        ctx.fillText(`${anim.damage}`, anim.x, anim.y + anim.offsetY);
        ctx.restore();
    });
}

// Draw character panel
// Calculate damage
function calculateDamage(attackerObj, defenderObj) {
    const baseDamage = (attackerObj === character) ?
        character.stats.strength + getWeaponDamage() : attackerObj.damage;
    const defense = (attackerObj === character) ?
        defenderObj.defense : character.stats.vitality * 0.5;

    const damage = Math.max(1, baseDamage - defense);
    return Math.floor(damage + Math.random() * 5);
}

// Generic respawn for an enemy
function respawnEnemy(enemy) {
    enemy.hp = enemy.maxHp;
    enemy.alive = true;
    inCombat = false;
    potionUsedInCurrentCombat = false;
}

// Generic attack loop for any enemy
function attackEnemy(enemy) {
    if (!enemy.alive || inCombat) return;

    inCombat = true;
    potionUsedInCurrentCombat = false;
    combatTimer = 0;

    const combatInterval = setInterval(() => {
        if (!enemy.alive || !inCombat) {
            clearInterval(combatInterval);
            inCombat = false;
            return;
        }

        // Player attacks
        const playerDamage = calculateDamage(character, enemy);
        enemy.hp -= playerDamage;
        addDamageAnimation(enemy.x + enemy.width / 2, enemy.y + 20, playerDamage, '#ff5252');

        // Flash enemy
        setTimeout(() => {
            if (enemy.hp <= 0) {
                enemy.hp = 0;
                enemy.alive = false;
                inCombat = false;
                clearInterval(combatInterval);
                // Reset potion usage after combat ends
                potionUsedInCurrentCombat = false;

                const goldReward = (enemy === boss) ? 20 + Math.floor(Math.random() * 10) : 50 + Math.floor(Math.random() * 50);
                playerGold += goldReward;
                gainExperience(enemy.expReward);

                // Track boss1 kills to unlock boss2
                if (enemy === boss) {
                    boss1KillCount++;
                    if (boss1KillCount >= 3 && boss2.locked) {
                        boss2.locked = false;
                        boss2.alive = true;
                        addDamageAnimation(canvas.width / 2, canvas.height / 2 - 20, 'Новое испытание открыто!', '#ffd700');
                    }
                }

                // Show victory messages
                addDamageAnimation(canvas.width / 2, canvas.height / 2 - 50, `+${goldReward} 💰`, '#ffd700');
                addDamageAnimation(canvas.width / 2, canvas.height / 2, `+${enemy.expReward} EXP`, '#4caf50');

                // Respawn enemy after delay (only for boss1; boss2 may also respawn)
                setTimeout(() => {
                    respawnEnemy(enemy);
                }, 3000);
                return;
            }

            // Enemy counter-attacks
            const enemyDamage = calculateDamage(enemy, character);
            character.hp -= enemyDamage;
            addDamageAnimation(character.x + character.width / 2, character.y + 20, enemyDamage, '#ff9800');

            // Check if character died
            if (character.hp <= 0) {
                character.hp = 0;
                inCombat = false;
                clearInterval(combatInterval);
                // Reset potion usage after combat ends
                potionUsedInCurrentCombat = false;

                // Game over - respawn character
                setTimeout(() => {
                    character.hp = character.maxHp;
                    addDamageAnimation(canvas.width / 2, canvas.height / 2, 'Возрождение!', '#4caf50');
                }, 2000);
                return;
            }
        }, 600);

    }, 1200);
}

// Attack boss - start automatic combat (wrapper for primary boss)
function attackBoss() {
    attackEnemy(boss);
}

// Respawn boss
function respawnBoss() {
    boss.hp = boss.maxHp;
    boss.alive = true;
    inCombat = false;
    // allow potion to be used again in next combat
    potionUsedInCurrentCombat = false;
}

// Compute Y position for combat indicator to avoid overlapping top icons
function getCombatY() {
    const iconsRight = Math.max(characterIconBounds.x + characterIconBounds.width, shopIconBounds.x + shopIconBounds.width);
    const iconsBottom = Math.max(characterIconBounds.y + characterIconBounds.height, shopIconBounds.y + shopIconBounds.height + 15);
    const indicatorLeft = canvas.width / 2 - 60;
    if (indicatorLeft < iconsRight + 10) {
        return iconsBottom + 10; // push down below icons
    }
    return 20; // default top position
}

// Helper: find health potion item (consumable)
function getHealthPotion() {
    return shopItems.find(i => i.type === 'consumable' && i.healing);
}

// Use a health potion during combat (consumes the potion)
function useHealthPotion() {
    const potion = getHealthPotion();
    if (!inCombat) {
        addDamageAnimation(canvas.width / 2, canvas.height / 2, 'Можно использовать только в бою', '#ccc');
        return;
    }
    if (!potion || (potion.count || 0) <= 0) {
        addDamageAnimation(canvas.width / 2, canvas.height / 2, 'Зелий нет', '#ccc');
        return;
    }
    if (potionUsedInCurrentCombat) {
        addDamageAnimation(canvas.width / 2, canvas.height / 2, 'Зелье уже использовано', '#ccc');
        return;
    }

    // Heal player and consume one potion
    const heal = potion.healing || 0;
    const prevHp = character.hp;
    character.hp = Math.min(character.maxHp, character.hp + heal);
    potion.count = Math.max(0, (potion.count || 0) - 1);
    potion.owned = potion.count > 0;
    potionUsedInCurrentCombat = true;

    console.log('useHealthPotion: healed', character.hp - prevHp, 'remaining potions', potion.count);

    addDamageAnimation(character.x + character.width / 2, character.y - 10, `+${character.hp - prevHp} HP`, '#4caf50');
    updateScore();
}

// Buy item from shop
function buyItem(item) {
    if (playerGold < item.price) return;

    // Purchase
    playerGold -= item.price;

    if (item.type === 'consumable') {
        item.count = (item.count || 0) + 1;
        item.owned = item.count > 0;
    } else {
        item.owned = true;
        // Auto-equip first weapon
        if (item.type === 'weapon' && !equippedWeapon) {
            equipWeapon(item);
        }
    }
    updateScore();
}

// Equip weapon
function equipWeapon(item) {
    if (!item.owned || item.type !== 'weapon') return;
    
    equippedWeapon = item;
}

// Calculate weapon bonus damage
function getWeaponDamage() {
    return equippedWeapon ? equippedWeapon.damage : 0;
}

// Draw character panel
function drawCharacterPanel() {
    if (!showCharacterPanel) return;
    
    const panelWidth = 420;
    const panelHeight = 580;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    // Panel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(panelX + 4, panelY + 4, panelWidth, panelHeight);
    
    // Panel background with gradient
    const bgGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
    bgGradient.addColorStop(0, 'rgba(26, 26, 46, 0.98)');
    bgGradient.addColorStop(1, 'rgba(15, 52, 96, 0.98)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Border gradient
    const borderGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
    borderGradient.addColorStop(0, '#667eea');
    borderGradient.addColorStop(1, '#764ba2');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Inner glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);
    
    // Title with glow
    ctx.shadowColor = '#667eea';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ ПЕРСОНАЖ ⚡', panelX + panelWidth / 2, panelY + 35);
    ctx.shadowBlur = 0;
    
    // Character info section with background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(panelX + 15, panelY + 55, panelWidth - 30, 95);
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 15, panelY + 55, panelWidth - 30, 95);
    
    // Character name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${character.name}`, panelX + 25, panelY + 78);
    
    // Level and HP on same line
    ctx.font = '14px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Уровень:', panelX + 25, panelY + 102);
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(character.level, panelX + 90, panelY + 102);
    
    ctx.fillStyle = '#aaa';
    ctx.font = '14px Arial';
    ctx.fillText('HP:', panelX + 210, panelY + 102);
    ctx.fillStyle = character.hp < character.maxHp * 0.3 ? '#f44336' : '#4caf50';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${character.hp}/${character.maxHp}`, panelX + 240, panelY + 102);
    
    // Experience label
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Опыт:', panelX + 25, panelY + 125);
    
    // Exp bar
    const expBarX = panelX + 25;
    const expBarY = panelY + 130;
    const expBarWidth = panelWidth - 50;
    const expBarHeight = 10;
    const expPercent = character.exp / character.expToNextLevel;
    
    // Bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(expBarX, expBarY, expBarWidth, expBarHeight);
    
    // Bar fill with gradient
    const expGradient = ctx.createLinearGradient(expBarX, expBarY, expBarX + expBarWidth * expPercent, expBarY);
    expGradient.addColorStop(0, '#667eea');
    expGradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = expGradient;
    ctx.fillRect(expBarX, expBarY, expBarWidth * expPercent, expBarHeight);
    
    // Exp text above bar
    ctx.fillStyle = '#ccc';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${character.exp} / ${character.expToNextLevel}`, expBarX + expBarWidth, expBarY - 2);
    
    // Available stat points
    if (character.statPoints > 0) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(panelX + 15, panelY + 160, panelWidth - 30, 24);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`⭐ Доступно очков: ${character.statPoints}`, panelX + panelWidth / 2, panelY + 177);
    }
    
    // Equipment section
    const equipY = panelY + (character.statPoints > 0 ? 195 : 165);
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⚔️ СНАРЯЖЕНИЕ', panelX + 25, equipY);
    
    // Weapon slot
    const weaponSlotY = equipY + 10;
    ctx.fillStyle = equippedWeapon ? 'rgba(76, 175, 80, 0.15)' : 'rgba(50, 50, 50, 0.5)';
    ctx.fillRect(panelX + 25, weaponSlotY, panelWidth - 50, 44);
    ctx.strokeStyle = equippedWeapon ? '#4caf50' : 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX + 25, weaponSlotY, panelWidth - 50, 44);
    
    if (equippedWeapon) {
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(equippedWeapon.icon, panelX + 50, weaponSlotY + 30);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(equippedWeapon.name, panelX + 75, weaponSlotY + 20);
        ctx.fillStyle = '#4caf50';
        ctx.font = '12px Arial';
        ctx.fillText(`⚔️ Урон: +${equippedWeapon.damage}`, panelX + 75, weaponSlotY + 36);
    } else {
        ctx.fillStyle = '#777';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Оружие не экипировано', panelX + panelWidth / 2, weaponSlotY + 28);
    }
    
    // Stats section
    const statsY = weaponSlotY + 60;
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📊 ХАРАКТЕРИСТИКИ', panelX + 25, statsY);
    
    const statsList = [
        { name: 'Сила', key: 'strength', icon: '💪', color: '#f44336' },
        { name: 'Ловкость', key: 'agility', icon: '⚡', color: '#ffeb3b' },
        { name: 'Выносливость', key: 'vitality', icon: '❤️', color: '#4caf50' },
        { name: 'Интеллект', key: 'intelligence', icon: '🧠', color: '#2196f3' },
        { name: 'Удача', key: 'luck', icon: '🍀', color: '#9c27b0' }
    ];
    
    statsList.forEach((stat, index) => {
        const y = statsY + 20 + index * 40;
        
        // Stat background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(panelX + 25, y, panelWidth - 50, 32);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 25, y, panelWidth - 50, 32);
        
        // Icon and name
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(stat.icon, panelX + 32, y + 21);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(stat.name, panelX + 55, y + 21);
        
        // Value
        ctx.fillStyle = stat.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(character.stats[stat.key], panelX + panelWidth - (character.statPoints > 0 ? 85 : 35), y + 21);
        
        // Plus button
        if (character.statPoints > 0) {
            const btnX = panelX + panelWidth - 60;
            const btnY = y + 4;
            
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(btnX, btnY, 32, 24);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, btnY, 32, 24);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('+', btnX + 16, btnY + 18);
        }
    });
    
    // Close button
    const closeY = panelY + panelHeight - 45;
    const closeGradient = ctx.createLinearGradient(panelX + panelWidth / 2 - 50, closeY, panelX + panelWidth / 2 - 50, closeY + 35);
    closeGradient.addColorStop(0, '#f44336');
    closeGradient.addColorStop(1, '#c62828');
    ctx.fillStyle = closeGradient;
    ctx.fillRect(panelX + panelWidth / 2 - 50, closeY, 100, 35);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX + panelWidth / 2 - 50, closeY, 100, 35);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✕ Закрыть', panelX + panelWidth / 2, closeY + 22);
}

// Draw shop panel
function drawShopPanel() {
    if (!showShopPanel && shopPanelOpacity <= 0) return;
    
    // Animate opacity
    if (showShopPanel && shopPanelOpacity < 1) {
        shopPanelOpacity += 0.1;
    } else if (!showShopPanel && shopPanelOpacity > 0) {
        shopPanelOpacity -= 0.1;
    }
    
    const panelWidth = 500;
    const panelHeight = 550;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    ctx.save();
    ctx.globalAlpha = shopPanelOpacity;
    
    // Panel background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏪 МАГАЗИН', panelX + panelWidth / 2, panelY + 40);
    
    // Gold display
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Золото: ${playerGold} 💰`, panelX + panelWidth / 2, panelY + 75);
    
    // Items
    const startY = panelY + 110;
    const itemHeight = 120;
    
    shopItems.forEach((item, index) => {
        const itemY = startY + index * itemHeight;
        
        // Item background
        ctx.fillStyle = item.owned ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 100, 100, 0.3)';
        ctx.fillRect(panelX + 20, itemY, panelWidth - 40, 110);
        ctx.strokeStyle = item.owned ? '#4caf50' : '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX + 20, itemY, panelWidth - 40, 110);
        
        // Item icon
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.icon, panelX + 60, itemY + 50);
        
        // Item name
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, panelX + 100, itemY + 25);
        
        // Item description
        ctx.fillStyle = '#ccc';
        ctx.font = '14px Arial';
        ctx.fillText(item.description, panelX + 100, itemY + 50);
        
        // Item stats
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        if (item.damage) {
            ctx.fillText(`⚔️ Урон: +${item.damage}`, panelX + 100, itemY + 75);
        }
        if (item.healing) {
            const cnt = item.count || 0;
            ctx.fillText(`❤️ Лечение: +${item.healing} (x${cnt})`, panelX + 100, itemY + 75);
        }
        
        // Price and buy/equip UI
        if (item.type === 'consumable') {
            const canAfford = playerGold >= item.price;
            ctx.fillStyle = canAfford ? '#4caf50' : '#666';
            ctx.fillRect(panelX + panelWidth - 140, itemY + 65, 120, 35);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(panelX + panelWidth - 140, itemY + 65, 120, 35);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Купить ${item.price}💰`, panelX + panelWidth - 80, itemY + 88);
        } else {
            if (!item.owned) {
                const canAfford = playerGold >= item.price;
                ctx.fillStyle = canAfford ? '#4caf50' : '#666';
                ctx.fillRect(panelX + panelWidth - 140, itemY + 65, 120, 35);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(panelX + panelWidth - 140, itemY + 65, 120, 35);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`Купить ${item.price}💰`, panelX + panelWidth - 80, itemY + 88);
            } else {
                ctx.fillStyle = '#4caf50';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('✓ Куплено', panelX + panelWidth - 30, itemY + 85);

                // Equip button for weapons
                if (item.type === 'weapon') {
                    const isEquipped = equippedWeapon && equippedWeapon.id === item.id;
                    ctx.fillStyle = isEquipped ? '#ff9800' : '#2196f3';
                    ctx.fillRect(panelX + panelWidth - 140, itemY + 65, 100, 30);
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(isEquipped ? '✓ Экипировано' : 'Экипировать', panelX + panelWidth - 90, itemY + 85);
                }
            }
        }
    });
    
    // Close button
    ctx.fillStyle = '#f44336';
    ctx.fillRect(panelX + panelWidth / 2 - 50, panelY + panelHeight - 50, 100, 35);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Закрыть', panelX + panelWidth / 2, panelY + panelHeight - 28);
    
    ctx.restore();
}

// Add experience and level up
function gainExperience(amount) {
    character.exp += amount;
    
    while (character.exp >= character.expToNextLevel) {
        character.exp -= character.expToNextLevel;
        character.level++;
        character.statPoints += 3;
        character.expToNextLevel = Math.floor(character.expToNextLevel * 1.5);
        
        // Show level up notification
        alert(`🎉 Уровень повышен! Теперь уровень ${character.level}\nПолучено 3 очка характеристик!`);
    }
    
    updateScore();
}

// Increase stat
function increaseStat(statKey) {
    if (character.statPoints > 0) {
        character.stats[statKey]++;
        character.statPoints--;
        
        // Update HP when vitality increases
        if (statKey === 'vitality') {
            const hpIncrease = 5;
            character.maxHp += hpIncrease;
            character.hp += hpIncrease;
        }
    }
}

// Update game state
function update() {
    // Здесь будет игровая логика (бой с монстрами, квесты и т.д.)
    updateDamageAnimations();
}

// Draw everything
function draw() {
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image
    if (bgImage.complete) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback gradient while image loads
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    drawCharacter();
    drawBoss();
    drawDamageAnimations();
    drawCharacterIcon();
    drawShopIcon();
    drawCharacterPanel();
    drawShopPanel();
    
    // Combat indicator
    if (inCombat) {
        const cy = getCombatY();

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(canvas.width / 2 - 58, cy + 2, 116, 36);
        
        // Background with gradient
        const gradient = ctx.createLinearGradient(
            canvas.width / 2 - 60, cy,
            canvas.width / 2 - 60, cy + 36
        );
        gradient.addColorStop(0, 'rgba(244, 67, 54, 0.95)');
        gradient.addColorStop(1, 'rgba(211, 47, 47, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(canvas.width / 2 - 60, cy, 120, 36);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 60, cy, 120, 36);
        
        // Inner glow
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width / 2 - 59, cy + 1, 118, 34);
        
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('⚔️ БОЙ ⚔️', canvas.width / 2, cy + 21);
        ctx.fillText('⚔️ БОЙ ⚔️', canvas.width / 2, cy + 21);

        // Draw potion button if player has at least one health potion and hasn't used it this combat
        const potion = getHealthPotion();
        const btnX = canvas.width / 2 + 70;
        const btnY = cy;
        const btnW = 40;
        const btnH = 36;

        // Backup button near character icon (visible on left side)
        const backupBtnX = characterIconBounds.x;
        const backupBtnY = characterIconBounds.y + characterIconBounds.height + 8;
        const backupBtnW = 48;
        const backupBtnH = 36;

        if (potion && (potion.count || 0) > 0 && !potionUsedInCurrentCombat) {
            const pg = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
            pg.addColorStop(0, '#ffb74d');
            pg.addColorStop(1, '#ff9800');
            ctx.fillStyle = pg;
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, btnW, btnH);

            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(potion.icon || '🧪', btnX + btnW / 2, btnY + btnH / 2);

            // Draw count badge
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(btnX + btnW - 16, btnY + btnH - 16, 18, 16);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${potion.count}`, btnX + btnW - 7, btnY + btnH - 5);
            // Draw backup button near character icon too
            ctx.save();
            const bg = ctx.createLinearGradient(backupBtnX, backupBtnY, backupBtnX, backupBtnY + backupBtnH);
            bg.addColorStop(0, '#ffb74d');
            bg.addColorStop(1, '#ff9800');
            ctx.fillStyle = bg;
            ctx.fillRect(backupBtnX, backupBtnY, backupBtnW, backupBtnH);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(backupBtnX, backupBtnY, backupBtnW, backupBtnH);
            ctx.fillStyle = '#fff';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(potion.icon || '🧪', backupBtnX + backupBtnW / 2, backupBtnY + backupBtnH / 2);
            // small count badge
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(backupBtnX + backupBtnW - 18, backupBtnY + backupBtnH - 18, 20, 16);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(`${potion.count}`, backupBtnX + backupBtnW - 8, backupBtnY + backupBtnH - 6);
            ctx.restore();
        } else {
            // Draw disabled hint if no potion or already used
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, btnY, btnW, btnH);
        }
        // Move DOM score element down so it doesn't overlap the combat indicator
        if (scoreElement) {
            if (defaultScoreTop === null) {
                const cs = window.getComputedStyle(scoreElement);
                defaultScoreTop = parseInt(cs.top) || 30;
            }
            // place score below the indicator
            scoreElement.style.top = (getCombatY() + canvas.offsetTop + 44) + 'px';
        }
    }
    else {
        // restore score position when not in combat
        if (scoreElement && defaultScoreTop !== null) {
            scoreElement.style.top = defaultScoreTop + 'px';
        }
    }
    
    // Instructions
    if (!showCharacterPanel && !showShopPanel && !inCombat) {
        const textWidth = 280;
        const textHeight = 44;
        const textX = canvas.width / 2 - textWidth / 2;
        const textY = canvas.height - 60;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(textX + 2, textY + 2, textWidth, textHeight);
        
        // Background with gradient
        const gradient = ctx.createLinearGradient(textX, textY, textX, textY + textHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        gradient.addColorStop(1, 'rgba(20, 20, 40, 0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(textX, textY, textWidth, textHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(textX, textY, textWidth, textHeight);
        
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('Кликните по боссу для атаки', canvas.width / 2, textY + 27);
        ctx.fillText('Кликните по боссу для атаки', canvas.width / 2, textY + 27);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Handle canvas click
function handleCanvasClick(x, y) {
    // Check if clicked on character icon
    if (x >= characterIconBounds.x && x <= characterIconBounds.x + characterIconBounds.width &&
        y >= characterIconBounds.y && y <= characterIconBounds.y + characterIconBounds.height) {
        showCharacterPanel = !showCharacterPanel;
        if (showCharacterPanel) showShopPanel = false;
        return;
    }
    
    // Check if clicked on shop icon
    if (x >= shopIconBounds.x && x <= shopIconBounds.x + shopIconBounds.width &&
        y >= shopIconBounds.y && y <= shopIconBounds.y + shopIconBounds.height) {
        showShopPanel = !showShopPanel;
        if (showShopPanel) showCharacterPanel = false;
        return;
    }
    
    // Check if clicked on boss2 (stronger) first
    if (boss2 && !boss2.locked && boss2.alive && !showCharacterPanel && !showShopPanel && !inCombat &&
        x >= boss2.x && x <= boss2.x + boss2.width &&
        y >= boss2.y && y <= boss2.y + boss2.height) {
        attackEnemy(boss2);
        return;
    }

    // Check if clicked on primary boss
    if (boss.alive && !showCharacterPanel && !showShopPanel && !inCombat &&
        x >= boss.x && x <= boss.x + boss.width &&
        y >= boss.y && y <= boss.y + boss.height) {
        attackEnemy(boss);
        return;
    }

    // If in combat, check for potion button click (to use during fight)
    const potion = getHealthPotion();
    const potionBtnX = canvas.width / 2 + 70;
    const potionBtnY = getCombatY();
    const potionBtnW = 40;
    const potionBtnH = 36;
    if (inCombat && potion && (potion.count || 0) > 0 && !potionUsedInCurrentCombat &&
        x >= potionBtnX && x <= potionBtnX + potionBtnW &&
        y >= potionBtnY && y <= potionBtnY + potionBtnH) {
        useHealthPotion();
        return;
    }
    // Also accept clicks on the backup potion button near character icon
    const backupBtnX = characterIconBounds.x;
    const backupBtnY = characterIconBounds.y + characterIconBounds.height + 8;
    const backupBtnW = 48;
    const backupBtnH = 36;
    if (inCombat && potion && (potion.count || 0) > 0 && !potionUsedInCurrentCombat &&
        x >= backupBtnX && x <= backupBtnX + backupBtnW &&
        y >= backupBtnY && y <= backupBtnY + backupBtnH) {
        useHealthPotion();
        return;
    }
    
    // If shop panel is open, check for button clicks
    if (showShopPanel && shopPanelOpacity > 0.5) {
        const panelWidth = 500;
        const panelHeight = 550;
        const panelX = (canvas.width - panelWidth) / 2;
        const panelY = (canvas.height - panelHeight) / 2;
        
        // Close button
        if (x >= panelX + panelWidth / 2 - 50 && x <= panelX + panelWidth / 2 + 50 &&
            y >= panelY + panelHeight - 50 && y <= panelY + panelHeight - 15) {
            showShopPanel = false;
            return;
        }
        
        // Item buttons
        const startY = panelY + 110;
        const itemHeight = 120;
        
        shopItems.forEach((item, index) => {
            const itemY = startY + index * itemHeight;
            
            // Buy button (allow buying consumables multiple times)
            if (playerGold >= item.price &&
                x >= panelX + panelWidth - 140 && x <= panelX + panelWidth - 20 &&
                y >= itemY + 65 && y <= itemY + 100) {
                buyItem(item);
            }
            
            // Equip button for weapons
            if (item.owned && item.type === 'weapon' &&
                x >= panelX + panelWidth - 140 && x <= panelX + panelWidth - 40 &&
                y >= itemY + 65 && y <= itemY + 95) {
                equipWeapon(item);
            }
        });
        
        return;
    }
    
    // If panel is open, check for button clicks
    if (showCharacterPanel) {
        const panelWidth = 420;
        const panelHeight = 580;
        const panelX = (canvas.width - panelWidth) / 2;
        const panelY = (canvas.height - panelHeight) / 2;
        
        // Close button - centered at bottom
        const closeY = panelY + panelHeight - 45;
        if (x >= panelX + panelWidth / 2 - 50 && x <= panelX + panelWidth / 2 + 50 &&
            y >= closeY && y <= closeY + 35) {
            showCharacterPanel = false;
            return;
        }
        
        // Stat increase buttons
        if (character.statPoints > 0) {
            // Equipment section starts at equipY
            const equipY = panelY + (character.statPoints > 0 ? 195 : 165);
            const weaponSlotY = equipY + 10;
            const statsY = weaponSlotY + 60;
            
            const statKeys = ['strength', 'agility', 'vitality', 'intelligence', 'luck'];
            
            statKeys.forEach((key, index) => {
                const statY = statsY + 20 + index * 40;
                const btnX = panelX + panelWidth - 60;
                const btnY = statY + 4;
                
                if (x >= btnX && x <= btnX + 32 &&
                    y >= btnY && y <= btnY + 24) {
                    increaseStat(key);
                }
            });
        }
    }
}

// Update score display
function updateScore() {
    if (!scoreElement) return;
    scoreElement.textContent = `Уровень: ${character.level} | Опыт: ${character.exp}/${character.expToNextLevel} | Золото: ${playerGold} 💰`;
}

// Get mouse position relative to canvas
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// Event listeners
if (canvas) {
    canvas.addEventListener('click', (e) => {
        const pos = getMousePos(e);
        handleCanvasClick(pos.x, pos.y);
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const pos = {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
        };
        handleCanvasClick(pos.x, pos.y);
    });
}

// Initialize
window.addEventListener('load', () => {
    console.log('Game loading...');
    console.log('Canvas:', canvas);
    console.log('Context:', ctx);
    
    initVK();
    setupCanvas();
    updateScore();
    
    console.log('Starting game loop...');
    if (ctx) gameLoop();
});

window.addEventListener('resize', () => {
    setupCanvas();
});
