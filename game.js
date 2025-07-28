class SouthParkShooterGame {
    constructor(container) {
        // Initial logical size for aspect ratio
        this.baseWidth = 480;
        this.baseHeight = 640;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.tabIndex = 1;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Game state
        this.state = 'menu'; // menu, playing, gameover

        // Player (Cartman)
        this.player = {
            x: this.width / 2,
            y: this.height - 60,
            w: 38,
            h: 38,
            speed: 5,
            cooldown: 0,
            // --- Special Abilities ---
            ability: {
                fudgeOfDoomReady: true,
                fudgeOfDoomCooldown: 0,
                fudgeOfDoomActive: false,
                fudgeOfDoomDuration: 0,
                fudgeOfDoomMaxCooldown: 300, // frames (~5s)
                fudgeOfDoomMaxDuration: 28,  // frames (~0.5s)
                shieldReady: true,
                shieldActive: false,
                shieldCooldown: 0,
                shieldMaxCooldown: 480, // 8s
                shieldDuration: 90,    // frames (1.5s)
                shieldTimer: 0
            }
        };

        // Bullets (snowballs, fudge)
        this.bullets = [];

        // Enemies (Kenny, Stan, Kyle, random)
        this.enemies = [];
        this.enemyCooldown = 0;

        // Explosions (blood & bones)
        this.explosions = [];

        // Input
        this.keys = {};

        // Score
        this.score = 0;

        // Bindings
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Event listeners
        this.canvas.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('click', this.handleCanvasClick);
        window.addEventListener('resize', this.handleResize);

        // Focus for keyboard input
        setTimeout(() => this.canvas.focus(), 100);

        // Responsive fullscreen
        this.handleResize();

        // Start rendering immediately
        this.render();
    }

    handleResize() {
        // Fill container or viewport, preserve aspect ratio (portrait)
        let container = this.container;
        let ww = window.innerWidth;
        let wh = window.innerHeight;
        let scale = Math.min(ww / this.baseWidth, wh / this.baseHeight);

        // Calculate new canvas size
        let newWidth = Math.round(this.baseWidth * scale);
        let newHeight = Math.round(this.baseHeight * scale);

        this.canvas.style.width = newWidth + "px";
        this.canvas.style.height = newHeight + "px";
        this.canvas.width = this.width = this.baseWidth;
        this.canvas.height = this.height = this.baseHeight;

        // Center canvas in container
        this.canvas.style.display = "block";
        this.canvas.style.margin = "auto";
        this.canvas.style.boxSizing = "border-box";
    }

    resetGame() {
        this.player.x = this.width / 2;
        this.player.y = this.height - 60;
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];
        this.score = 0;
        this.player.cooldown = 0;
        this.enemyCooldown = 0;
        // Reset abilities
        this.player.ability.fudgeOfDoomReady = true;
        this.player.ability.fudgeOfDoomCooldown = 0;
        this.player.ability.fudgeOfDoomActive = false;
        this.player.ability.fudgeOfDoomDuration = 0;
        this.player.ability.shieldReady = true;
        this.player.ability.shieldActive = false;
        this.player.ability.shieldCooldown = 0;
        this.player.ability.shieldTimer = 0;
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
        // Start game from menu with Enter
        if (this.state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
            this.resetGame();
            this.state = 'playing';
        }
        // Restart from gameover
        if (this.state === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
            this.resetGame();
            this.state = 'playing';
        }
        // --- Special Abilities Activation ---
        if (this.state === 'playing') {
            // Fudge of Doom: Key X or Key F
            if ((e.code === 'KeyX' || e.code === 'KeyF') && this.player.ability.fudgeOfDoomReady && !this.player.ability.fudgeOfDoomActive) {
                this.activateFudgeOfDoom();
            }
            // Cheesy Poofs Shield: Key C or Key S
            if ((e.code === 'KeyC' || e.code === 'KeyS') && this.player.ability.shieldReady && !this.player.ability.shieldActive) {
                this.activateShield();
            }
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    handleCanvasClick(e) {
        if (this.state === 'menu' || this.state === 'gameover') {
            this.resetGame();
            this.state = 'playing';
        }
    }

    // --- Special Abilities Implementation ---

    activateFudgeOfDoom() {
        // Fudge of Doom: Massive brown blast in all directions, clears all enemies on screen
        this.player.ability.fudgeOfDoomActive = true;
        this.player.ability.fudgeOfDoomReady = false;
        this.player.ability.fudgeOfDoomDuration = this.player.ability.fudgeOfDoomMaxDuration;
        // Create fudge blast bullets in all directions
        const fudgeCount = 24;
        for (let i = 0; i < fudgeCount; i++) {
            const angle = (Math.PI * 2) * (i / fudgeCount);
            this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                r: 11,
                speed: 12,
                fudge: true,
                angle: angle,
                vx: Math.cos(angle) * 12,
                vy: Math.sin(angle) * 12,
                life: 32
            });
        }
    }

    activateShield() {
        // Cheesy Poofs Shield: Temporary invulnerability, orange/yellow bubble
        this.player.ability.shieldActive = true;
        this.player.ability.shieldReady = false;
        this.player.ability.shieldTimer = this.player.ability.shieldDuration;
    }

    updateAbilities() {
        // --- Fudge of Doom Cooldown & Duration ---
        if (this.player.ability.fudgeOfDoomActive) {
            this.player.ability.fudgeOfDoomDuration--;
            if (this.player.ability.fudgeOfDoomDuration <= 0) {
                this.player.ability.fudgeOfDoomActive = false;
                this.player.ability.fudgeOfDoomCooldown = this.player.ability.fudgeOfDoomMaxCooldown;
            }
        }
        if (!this.player.ability.fudgeOfDoomReady) {
            if (this.player.ability.fudgeOfDoomCooldown > 0) {
                this.player.ability.fudgeOfDoomCooldown--;
            } else {
                this.player.ability.fudgeOfDoomReady = true;
            }
        }

        // --- Shield Cooldown & Timer ---
        if (this.player.ability.shieldActive) {
            this.player.ability.shieldTimer--;
            if (this.player.ability.shieldTimer <= 0) {
                this.player.ability.shieldActive = false;
                this.player.ability.shieldCooldown = this.player.ability.shieldMaxCooldown;
            }
        }
        if (!this.player.ability.shieldReady && !this.player.ability.shieldActive) {
            if (this.player.ability.shieldCooldown > 0) {
                this.player.ability.shieldCooldown--;
            } else {
                this.player.ability.shieldReady = true;
            }
        }
    }

    update() {
        if (this.state !== 'playing') return;

        // Update special abilities timers/cooldowns
        this.updateAbilities();

        // Player movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.x += this.player.speed;
        }
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.player.y -= this.player.speed;
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.player.y += this.player.speed;
        }
        // Boundaries
        this.player.x = Math.max(this.player.w / 2, Math.min(this.width - this.player.w / 2, this.player.x));
        this.player.y = Math.max(this.player.h / 2, Math.min(this.height - this.player.h / 2, this.player.y));

        // Shooting (snowball)
        if ((this.keys['Space'] || this.keys['KeyZ']) && this.player.cooldown <= 0) {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - this.player.h / 2 - 4,
                r: 7,
                speed: 8,
                fudge: false
            });
            this.player.cooldown = 12;
        }
        if (this.player.cooldown > 0) this.player.cooldown--;

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.fudge) {
                // Fudge of Doom: radial fudge balls
                b.x += b.vx;
                b.y += b.vy;
                b.life--;
                if (b.life <= 0 ||
                    b.x < -30 || b.x > this.width + 30 ||
                    b.y < -30 || b.y > this.height + 30
                ) {
                    this.bullets.splice(i, 1);
                }
            } else {
                b.y -= b.speed;
                if (b.y + b.r < 0) {
                    this.bullets.splice(i, 1);
                }
            }
        }

        // Spawn enemies (random South Park kids)
        if (this.enemyCooldown <= 0) {
            const ex = 30 + Math.random() * (this.width - 60);
            const enemyTypes = ['kenny', 'stan', 'kyle'];
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.push({
                x: ex,
                y: -32,
                w: 32,
                h: 38,
                speed: 2 + Math.random() * 1.2,
                hp: 1,
                type: type
            });
            this.enemyCooldown = 34 + Math.random() * 24;
        } else {
            this.enemyCooldown--;
        }

        // Update enemies
        this.enemies.forEach(en => en.y += en.speed);
        this.enemies = this.enemies.filter(en => en.y - en.h < this.height);

        // Collisions (bullets vs enemies)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const en = this.enemies[i];
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                let hit = false;
                if (b.fudge) {
                    // Fudge of Doom has large area
                    if (Math.abs(b.x - en.x) < en.w/2 + 9 && Math.abs(b.y - en.y) < en.h/2 + 9) {
                        hit = true;
                    }
                } else {
                    if (Math.abs(b.x - en.x) < en.w/2 && Math.abs(b.y - en.y) < en.h/2) {
                        hit = true;
                    }
                }
                if (hit) {
                    en.hp--;
                    // Only destroy fudge bullet if not "fudge of doom" (let fudge go through)
                    if (!b.fudge) this.bullets.splice(j, 1);
                    if (en.hp <= 0) {
                        // Create explosion at enemy's position
                        this.spawnExplosion(en.x, en.y, en.type);
                        this.enemies.splice(i, 1);
                        this.score += 100;
                    }
                    break;
                }
            }
        }

        // Collisions (player vs enemies)
        for (let i = 0; i < this.enemies.length; i++) {
            const en = this.enemies[i];
            if (Math.abs(this.player.x - en.x) < (this.player.w/2 + en.w/2 - 4) &&
                Math.abs(this.player.y - en.y) < (this.player.h/2 + en.h/2 - 4)) {
                if (!this.player.ability.shieldActive) {
                    this.state = 'gameover';
                } else {
                    // Shield destroys enemy & absorbs hit
                    this.spawnExplosion(en.x, en.y, en.type);
                    this.enemies.splice(i, 1);
                    i--;
                }
            }
        }

        // Update explosions (blood & bones)
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.time += 1;
            exp.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.96; // slight drag
                p.vy *= 0.98;
                p.vy += 0.12; // gravity
                p.life--;
            });
            // Remove particles that are dead
            exp.particles = exp.particles.filter(p => p.life > 0);
            // Remove explosion if all particles are gone or time > max
            if (exp.particles.length === 0 || exp.time > 32) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // --- South Park Character Drawings ---

    drawCartman(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Main body (red jacket)
        ctx.beginPath();
        ctx.ellipse(0, 10, 15, 17, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#d12c2c";
        ctx.fill();

        // Face (peach)
        ctx.beginPath();
        ctx.arc(0, -7, 15, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe3b0";
        ctx.fill();

        // Hat (blue)
        ctx.beginPath();
        ctx.arc(0, -15, 15, Math.PI, 0, false);
        ctx.fillStyle = "#27a3c9";
        ctx.fill();

        // Hat band (yellow)
        ctx.beginPath();
        ctx.arc(0, -15, 14, Math.PI, 0, false);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#ffe468";
        ctx.stroke();

        // Pom (yellow)
        ctx.beginPath();
        ctx.arc(0, -23, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe468";
        ctx.fill();

        // Eyes
        ctx.beginPath();
        ctx.arc(-5, -10, 4, 0, Math.PI * 2);
        ctx.arc(5, -10, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        // Pupils
        ctx.beginPath();
        ctx.arc(-5, -9, 1.4, 0, Math.PI * 2);
        ctx.arc(5, -9, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "#3a2900";
        ctx.fill();

        // Mouth
        ctx.beginPath();
        ctx.arc(0, -2, 3.2, 0, Math.PI, false);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#9d4525";
        ctx.stroke();

        // Gloves (yellow)
        ctx.beginPath();
        ctx.arc(-12, 17, 4, 0, Math.PI * 2);
        ctx.arc(12, 17, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe468";
        ctx.fill();

        ctx.restore();
    }

    drawKenny(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Main body (orange parka)
        ctx.beginPath();
        ctx.ellipse(0, 10, 14, 16, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#e19c24";
        ctx.fill();

        // Face inside hood
        ctx.beginPath();
        ctx.arc(0, -6, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe3b0";
        ctx.fill();

        // Hood (orange)
        ctx.beginPath();
        ctx.arc(0, -6, 13, 0, Math.PI * 2);
        ctx.fillStyle = "#e19c24";
        ctx.fill();

        // Hood rim (brown)
        ctx.beginPath();
        ctx.arc(0, -6, 11.5, 0, Math.PI * 2);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = "#a56b2b";
        ctx.stroke();

        // Eyes
        ctx.beginPath();
        ctx.arc(-4, -9, 2.6, 0, Math.PI * 2);
        ctx.arc(4, -9, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.arc(-4, -8, 1, 0, Math.PI * 2);
        ctx.arc(4, -8, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#3a2900";
        ctx.fill();

        ctx.restore();
    }

    drawStan(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Main body (brown)
        ctx.beginPath();
        ctx.ellipse(0, 10, 13, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#7d4d2b";
        ctx.fill();

        // Face
        ctx.beginPath();
        ctx.arc(0, -7, 13, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe3b0";
        ctx.fill();

        // Hat (blue)
        ctx.beginPath();
        ctx.arc(0, -15, 13, Math.PI, 0, false);
        ctx.fillStyle = "#27a3c9";
        ctx.fill();

        // Hat band (red)
        ctx.beginPath();
        ctx.arc(0, -15, 12, Math.PI, 0, false);
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#d12c2c";
        ctx.stroke();

        // Pom (red)
        ctx.beginPath();
        ctx.arc(0, -22, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#d12c2c";
        ctx.fill();

        // Eyes
        ctx.beginPath();
        ctx.arc(-4.5, -10, 3, 0, Math.PI * 2);
        ctx.arc(4.5, -10, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.arc(-4, -9, 1, 0, Math.PI * 2);
        ctx.arc(4, -9, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#3a2900";
        ctx.fill();

        ctx.restore();
    }

    drawKyle(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Main body (green jacket)
        ctx.beginPath();
        ctx.ellipse(0, 10, 13, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#61b13e";
        ctx.fill();

        // Face
        ctx.beginPath();
        ctx.arc(0, -7, 13, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe3b0";
        ctx.fill();

        // Hat (green)
        ctx.beginPath();
        ctx.rect(-13, -19, 26, 9);
        ctx.fillStyle = "#3c9f3c";
        ctx.fill();

        // Hat band (darker green)
        ctx.beginPath();
        ctx.rect(-13, -11, 26, 6);
        ctx.fillStyle = "#246824";
        ctx.fill();

        // Ears (side)
        ctx.beginPath();
        ctx.arc(-13, -7, 3, 0, Math.PI * 2);
        ctx.arc(13, -7, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe3b0";
        ctx.fill();

        // Eyes
        ctx.beginPath();
        ctx.arc(-4.5, -10, 3, 0, Math.PI * 2);
        ctx.arc(4.5, -10, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.arc(-4, -9, 1, 0, Math.PI * 2);
        ctx.arc(4, -9, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#3a2900";
        ctx.fill();

        ctx.restore();
    }

    drawPlayer(ctx, x, y) {
        this.drawCartman(ctx, x, y);

        // --- Draw Abilities Effects ---
        // Cheesy Poofs Shield Bubble
        if (this.player.ability.shieldActive) {
            ctx.save();
            ctx.globalAlpha = 0.33 + 0.09 * Math.sin(performance.now()/80);
            ctx.beginPath();
            ctx.arc(x, y + 2, 27, 0, Math.PI * 2);
            let grad = ctx.createRadialGradient(x, y + 2, 11, x, y + 2, 27);
            grad.addColorStop(0, "#ffe468bb");
            grad.addColorStop(0.5, "#ffbb0060");
            grad.addColorStop(1, "#ff910030");
            ctx.fillStyle = grad;
            ctx.shadowColor = "#fffab0";
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.restore();
        }
        // Fudge of Doom effect (smoky blast at Cartman)
        if (this.player.ability.fudgeOfDoomActive) {
            ctx.save();
            ctx.globalAlpha = 0.24 + 0.13 * Math.sin(performance.now()/100);
            ctx.beginPath();
            ctx.arc(x, y + 10, 40 + Math.sin(performance.now()/70)*6, 0, Math.PI * 2);
            let fudgeGrad = ctx.createRadialGradient(x, y + 13, 18, x, y + 13, 44);
            fudgeGrad.addColorStop(0, "#683e10aa");
            fudgeGrad.addColorStop(0.18, "#8a4f0faa");
            fudgeGrad.addColorStop(0.65, "#a8691a66");
            fudgeGrad.addColorStop(1, "#3a1a0150");
            ctx.fillStyle = fudgeGrad;
            ctx.fill();
            ctx.restore();
        }
    }

    drawEnemy(ctx, x, y, type) {
        if (type === "kenny") {
            this.drawKenny(ctx, x, y);
        } else if (type === "stan") {
            this.drawStan(ctx, x, y);
        } else if (type === "kyle") {
            this.drawKyle(ctx, x, y);
        }
    }

    drawBullet(ctx, bullet) {
        ctx.save();
        if (bullet.fudge) {
            // Fudge of Doom: Big brown fudge ball
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
            let fudgeGrad = ctx.createRadialGradient(bullet.x, bullet.y, 2, bullet.x, bullet.y, bullet.r);
            fudgeGrad.addColorStop(0, "#986028");
            fudgeGrad.addColorStop(0.5, "#5e3413");
            fudgeGrad.addColorStop(1, "#3a1a01");
            ctx.fillStyle = fudgeGrad;
            ctx.shadowColor = "#a8691aff";
            ctx.shadowBlur = 8;
            ctx.fill();
            // Smelly lines
            ctx.globalAlpha = 0.38;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(bullet.x + Math.cos(bullet.angle + i)*bullet.r, bullet.y + Math.sin(bullet.angle + i)*bullet.r);
                ctx.bezierCurveTo(
                    bullet.x + Math.cos(bullet.angle + i + 0.25)*bullet.r*1.25, bullet.y + Math.sin(bullet.angle + i + 0.25)*bullet.r*1.15 - 8,
                    bullet.x + Math.cos(bullet.angle + i + 0.45)*bullet.r*1.35, bullet.y + Math.sin(bullet.angle + i + 0.45)*bullet.r*1.11 - 14,
                    bullet.x + Math.cos(bullet.angle + i + 0.55)*bullet.r*1.36, bullet.y + Math.sin(bullet.angle + i + 0.55)*bullet.r*1.09 - 22
                );
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ffe468bb";
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        } else {
            // Snowball
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#d8f0ff';
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.restore();
    }

    drawExplosion(ctx, explosion) {
        // Blood and bone fragments
        explosion.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.beginPath();
            if (p.type === 'blood') {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowColor = '#a01212';
                ctx.shadowBlur = 6;
                ctx.fill();
            } else if (p.type === 'bone') {
                // Draw small bone: line with rounded ends
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.strokeStyle = '#f8f8f6';
                ctx.lineWidth = p.size;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-p.length/2, 0);
                ctx.lineTo(p.length/2, 0);
                ctx.stroke();
                // End balls
                ctx.beginPath();
                ctx.arc(-p.length/2, 0, p.size/1.5, 0, Math.PI*2);
                ctx.arc(p.length/2, 0, p.size/1.5, 0, Math.PI*2);
                ctx.fillStyle = '#f8f8f6';
                ctx.fill();
            }
            ctx.restore();
        });
    }

    drawScore(ctx) {
        ctx.save();
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#333';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${this.score}`, 16, 30);
        ctx.restore();
    }

    drawAbilitiesUI(ctx) {
        // --- Draw Special Ability UI: bottom left/right corners ---
        // Fudge of Doom (X/F)
        ctx.save();
        let fudgeIconX = 44, fudgeIconY = this.height - 38;
        ctx.globalAlpha = 0.95;
        // Icon circle
        ctx.beginPath();
        ctx.arc(fudgeIconX, fudgeIconY, 22, 0, Math.PI*2);
        ctx.fillStyle = this.player.ability.fudgeOfDoomReady ? "#986028" : "#4b3218";
        ctx.fill();
        // Fudge swirl
        ctx.beginPath();
        ctx.arc(fudgeIconX, fudgeIconY, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#a8691a";
        ctx.fill();
        // Smell lines
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(fudgeIconX + 10 + i*2, fudgeIconY - 10 - i*4);
            ctx.bezierCurveTo(
                fudgeIconX + 13 + i*2, fudgeIconY - 22 - i*4,
                fudgeIconX + 9 + i*2, fudgeIconY - 28 - i*4,
                fudgeIconX + 2 + i*2, fudgeIconY - 34 - i*4
            );
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffe468";
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.font = "bold 13px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText("Fudge", fudgeIconX, fudgeIconY + 21);
        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "#ffe468";
        ctx.fillText("[X]", fudgeIconX, fudgeIconY + 34);
        // Cooldown overlay
        if (!this.player.ability.fudgeOfDoomReady) {
            let cd = this.player.ability.fudgeOfDoomCooldown/this.player.ability.fudgeOfDoomMaxCooldown;
            ctx.globalAlpha = 0.34;
            ctx.beginPath();
            ctx.moveTo(fudgeIconX, fudgeIconY);
            ctx.arc(fudgeIconX, fudgeIconY, 22, -Math.PI/2, -Math.PI/2 + Math.PI*2*cd, false);
            ctx.lineTo(fudgeIconX, fudgeIconY);
            ctx.closePath();
            ctx.fillStyle = "#222";
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Shield (C/S)
        ctx.save();
        let shieldIconX = this.width - 44, shieldIconY = this.height - 38;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(shieldIconX, shieldIconY, 22, 0, Math.PI*2);
        ctx.fillStyle = this.player.ability.shieldReady ? "#ffe468" : "#e2a33a";
        ctx.fill();
        // Shield symbol (white circle)
        ctx.beginPath();
        ctx.arc(shieldIconX, shieldIconY, 13, 0, Math.PI*2);
        ctx.fillStyle = "#fff8";
        ctx.fill();
        // Bubble lines
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(shieldIconX, shieldIconY, 18, Math.PI * 0.6, Math.PI * 2.3);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffbb00";
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.font = "bold 13px Arial";
        ctx.fillStyle = "#222";
        ctx.textAlign = "center";
        ctx.fillText("Shield", shieldIconX, shieldIconY + 21);
        ctx.font = "bold 11px Arial";
        ctx.fillStyle = "#ffe468";
        ctx.fillText("[C]", shieldIconX, shieldIconY + 34);
        // Cooldown overlay
        if (!this.player.ability.shieldReady) {
            let cd = this.player.ability.shieldCooldown/this.player.ability.shieldMaxCooldown;
            ctx.globalAlpha = 0.34;
            ctx.beginPath();
            ctx.moveTo(shieldIconX, shieldIconY);
            ctx.arc(shieldIconX, shieldIconY, 22, -Math.PI/2, -Math.PI/2 + Math.PI*2*cd, false);
            ctx.lineTo(shieldIconX, shieldIconY);
            ctx.closePath();
            ctx.fillStyle = "#222";
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    drawMenu(ctx) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.font = 'bold 38px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#27a3c9';
        ctx.shadowBlur = 12;
        ctx.fillText('SOUTH PARK SHOOTER', this.width/2, this.height/2 - 60);

        ctx.font = '20px Arial';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe468';
        ctx.fillText('Press [Space] or Click to Start', this.width/2, this.height/2 + 10);

        // Draw Cartman in the center
        this.drawCartman(ctx, this.width/2, this.height/2 + 70);

        // Draw special abilities quick help
        ctx.font = 'bold 17px Arial';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.fillText('Special Abilities:', this.width/2, this.height/2 + 125);
        ctx.font = '15px Arial';
        ctx.globalAlpha = 0.74;
        ctx.fillText('Fudge of Doom [X]: Big fudge blast, clears enemies (5s cooldown)', this.width/2, this.height/2 + 146);
        ctx.fillText('Cheesy Poofs Shield [C]: Invulnerable bubble (1.5s, 8s cooldown)', this.width/2, this.height/2 + 167);

        ctx.restore();
    }

    drawGameOver(ctx) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.font = 'bold 38px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#d12c2c';
        ctx.shadowBlur = 12;
        ctx.fillText('GAME OVER', this.width/2, this.height/2 - 40);

        ctx.font = '24px Arial';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe468';
        ctx.fillText(`Score: ${this.score}`, this.width/2, this.height/2 + 16);

        ctx.font = '18px Arial';
        ctx.fillText('Press [Space] or Click to Restart', this.width/2, this.height/2 + 56);

        // Draw fallen Cartman
        ctx.save();
        ctx.translate(this.width/2, this.height/2 + 110);
        ctx.rotate(Math.PI * -0.18);
        this.drawCartman(ctx, 0, 0);
        ctx.restore();

        ctx.restore();
    }

    // --- EXPLOSION EFFECTS ---

    spawnExplosion(x, y, type) {
        // Type is used for possible future bone colors/shapes, but now is just for fun
        const particles = [];
        const bloodColors = [
            "#c80019", "#a00011", "#e03636", "#932222"
        ];
        // Blood particles
        for (let i = 0; i < 18 + Math.floor(Math.random()*7); i++) {
            const angle = Math.random()*Math.PI*2;
            const speed = 2 + Math.random()*3;
            particles.push({
                x: x + (Math.random()-0.5)*8,
                y: y + (Math.random()-0.5)*7,
                vx: Math.cos(angle)*speed,
                vy: Math.sin(angle)*speed,
                size: 2.5 + Math.random()*2.7,
                color: bloodColors[Math.floor(Math.random()*bloodColors.length)],
                life: 16 + Math.random()*20,
                maxLife: 24,
                type: 'blood'
            });
        }
        // Bone particles
        for (let i = 0; i < 3 + Math.floor(Math.random()*3); i++) {
            const angle = Math.random()*Math.PI*2;
            const speed = 2 + Math.random()*2.5;
            particles.push({
                x: x + (Math.random()-0.5)*10,
                y: y + (Math.random()-0.5)*8,
                vx: Math.cos(angle)*speed,
                vy: Math.sin(angle)*speed,
                size: 2.2 + Math.random()*1.3,
                length: 10 + Math.random()*8,
                angle: Math.random()*Math.PI*2,
                life: 20 + Math.random()*14,
                maxLife: 22,
                type: 'bone'
            });
        }
        this.explosions.push({
            x, y, type,
            time: 0,
            particles
        });
    }

    render = () => {
        // If canvas was resized by CSS, scale context accordingly
        const cw = this.canvas.clientWidth;
        const ch = this.canvas.clientHeight;
        if (cw !== this.width || ch !== this.height) {
            this.ctx.setTransform(cw/this.baseWidth, 0, 0, ch/this.baseHeight, 0, 0);
        } else {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Background: snowy South Park hills
        this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);

        // Draw sky
        let grad = this.ctx.createLinearGradient(0, 0, 0, this.baseHeight);
        grad.addColorStop(0, "#82d7ff");
        grad.addColorStop(1, "#f0fff8");
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

        // Draw distant snowy mountains
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.baseHeight * 0.32);
        this.ctx.lineTo(90, this.baseHeight * 0.17);
        this.ctx.lineTo(190, this.baseHeight * 0.38);
        this.ctx.lineTo(270, this.baseHeight * 0.2);
        this.ctx.lineTo(370, this.baseHeight * 0.35);
        this.ctx.lineTo(470, this.baseHeight * 0.12);
        this.ctx.lineTo(this.baseWidth, this.baseHeight * 0.36);
        this.ctx.lineTo(this.baseWidth, 0);
        this.ctx.lineTo(0, 0);
        this.ctx.closePath();
        this.ctx.fillStyle = "#e6f8ff";
        this.ctx.fill();
        // Mountain shadows
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.baseHeight * 0.32);
        this.ctx.lineTo(90, this.baseHeight * 0.17);
        this.ctx.lineTo(190, this.baseHeight * 0.38);
        this.ctx.lineTo(270, this.baseHeight * 0.2);
        this.ctx.lineTo(370, this.baseHeight * 0.35);
        this.ctx.lineTo(470, this.baseHeight * 0.12);
        this.ctx.lineTo(this.baseWidth, this.baseHeight * 0.36);
        this.ctx.lineTo(this.baseWidth, this.baseHeight * 0.36 + 16);
        this.ctx.lineTo(0, this.baseHeight * 0.32 + 18);
        this.ctx.closePath();
        this.ctx.globalAlpha = 0.09;
        this.ctx.fillStyle = "#b8e3fd";
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        this.ctx.restore();

        // Draw snowy ground
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.baseHeight * 0.38);
        this.ctx.bezierCurveTo(this.baseWidth * 0.25, this.baseHeight * 0.43, this.baseWidth * 0.75, this.baseHeight * 0.45, this.baseWidth, this.baseHeight * 0.39);
        this.ctx.lineTo(this.baseWidth, this.baseHeight);
        this.ctx.lineTo(0, this.baseHeight);
        this.ctx.closePath();
        this.ctx.fillStyle = "#fff";
        this.ctx.shadowColor = "#b8e3fd";
        this.ctx.shadowBlur = 20;
        this.ctx.fill();
        this.ctx.restore();

        // Snowfall
        for (let i = 0; i < 50; i++) {
            this.ctx.beginPath();
            let sx = (i * 77) % this.baseWidth + ((i * 13) % 8) - 4;
            let sy = ((i * 91) % this.baseHeight + ((i * 17) % 23) + Math.sin(performance.now()/300 + i) * 20) % this.baseHeight;
            let radius = (i % 3 === 0) ? 1.8 : 1.1;
            this.ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now()/800 + i);
            this.ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;

        if (this.state === 'menu') {
            this.drawMenu(this.ctx);
        } else if (this.state === 'playing') {
            this.update();

            // Draw player (Cartman)
            this.drawPlayer(this.ctx, this.player.x, this.player.y);

            // Draw bullets (snowballs, fudge)
            this.bullets.forEach(b => this.drawBullet(this.ctx, b));

            // Draw enemies (other characters)
            this.enemies.forEach(en => this.drawEnemy(this.ctx, en.x, en.y, en.type));

            // Draw explosions (blood & bone)
            this.explosions.forEach(exp => this.drawExplosion(this.ctx, exp));

            // Draw score
            this.drawScore(this.ctx);

            // Draw special abilities UI
            this.drawAbilitiesUI(this.ctx);
        } else if (this.state === 'gameover') {
            // Draw all still
            this.enemies.forEach(en => this.drawEnemy(this.ctx, en.x, en.y, en.type));
            this.bullets.forEach(b => this.drawBullet(this.ctx, b));
            // Draw explosions even on game over
            this.explosions.forEach(exp => this.drawExplosion(this.ctx, exp));
            this.drawPlayer(this.ctx, this.player.x, this.player.y);
            this.drawScore(this.ctx);
            this.drawGameOver(this.ctx);
            this.drawAbilitiesUI(this.ctx);
        }

        requestAnimationFrame(this.render);
    }
}

function initGame() {
    const container = document.getElementById('gameContainer');
    new SouthParkShooterGame(container);
}

window.addEventListener('DOMContentLoaded', initGame);