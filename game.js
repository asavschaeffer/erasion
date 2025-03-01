class Game {
    constructor() {
        this.player = {
            x: 345,
            y: 345,
            speed: 3,
            ammo: 100,
            health: 100
        };
        this.enemies = [];
        this.obstacles = [];
        this.constructingObstacles = [];
        this.walls = [];  // Will store {line: SVGElement, obstacle1: Element, obstacle2: Element, health: number}
        this.buildings = [];
        this.towers = [];
        this.resources = {
            wood: 0,
            coins: 0,
            rocks: 0
        };
        this.score = 0;
        this.gameArena = document.getElementById('gameArena');
        this.playerElement = document.getElementById('player');
        this.wallCountElement = document.getElementById('wallCount');
        this.buildingCountElement = document.getElementById('buildingCount');
        this.towerCountElement = document.getElementById('towerCount');
        this.placementPreview = null;
        this.previewElement = null;
        this.previewWallLine = null;
        this.isSpaceDown = false;
        this.keys = {};
        this.mousePosition = { x: 0, y: 0 };
        this.svgContainer = document.getElementById('connection-lines');
        this.setupEventListeners();
        this.gameLoop();
    }

    addDebugLog(message, type) {
        const consoleStyles = {
            enemy: 'color: #ff4444; font-weight: bold',
            collision: 'color: #ffaa00; font-weight: bold',
            structure: 'color: #44ff44; font-weight: bold',
            input: 'color: #44aaff; font-weight: bold'
        };
        console.log(
            `%c[${type}] ${message}`,
            consoleStyles[type] || 'color: white; font-weight: bold'
        );
    }

    updateStructureCounts() {
        this.wallCountElement.textContent = this.walls.length;
        this.buildingCountElement.textContent = this.buildings.length;
        this.towerCountElement.textContent = this.towers.length;
        this.addDebugLog(`Structures: ${this.walls.length} walls, ${this.buildings.length} buildings, ${this.towers.length} towers`, 'structure');
    }

    spawnEnemy() {
        if (Math.random() < 0.005) { // 0.5% chance each frame
            const side = Math.floor(Math.random() * 4);
            let x, y;

            switch(side) {
                case 0: // Top
                    x = Math.random() * 690;
                    y = 0;
                    break;
                case 1: // Right
                    x = 690;
                    y = Math.random() * 690;
                    break;
                case 2: // Bottom
                    x = Math.random() * 690;
                    y = 690;
                    break;
                case 3: // Left
                    x = 0;
                    y = Math.random() * 690;
                    break;
            }

            const enemy = {
                x: x,
                y: y,
                element: document.createElement('div'),
                speed: 1
            };

            enemy.element.className = 'enemy';
            enemy.element.style.left = enemy.x + 'px';
            enemy.element.style.top = enemy.y + 'px';
            this.gameArena.appendChild(enemy.element);
            this.enemies.push(enemy);

            this.addDebugLog(`Enemy spawned at (${Math.round(x)}, ${Math.round(y)})`, 'enemy');
        }
    }

    destroyEnemy(index) {
        const enemy = this.enemies[index];
        if (enemy && enemy.element) {
            enemy.element.remove();
            this.addDebugLog(`Enemy destroyed at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`, 'enemy');
            this.enemies.splice(index, 1);
        }
    }

    checkCollisions() {
        // Check enemy collisions with structures and player
        for (let enemy of this.enemies) {
            // Check player collision
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30) {
                this.player.health = Math.max(0, this.player.health - 1);
                document.getElementById('healthValue').textContent = this.player.health;
                this.addDebugLog(`Player took damage! Health: ${this.player.health}`, 'collision');
                
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }

            // Check walls
            for (let i = this.walls.length - 1; i >= 0; i--) {
                const wall = this.walls[i];
                if (this.lineIntersectsCircle(
                    wall.obstacle1.x, wall.obstacle1.y,
                    wall.obstacle2.x, wall.obstacle2.y,
                    enemy.x, enemy.y, 15
                )) {
                    wall.health--;
                    this.addDebugLog(`Wall damaged! Health: ${wall.health}`, 'collision');
                    if (wall.health <= 0) {
                        wall.line.remove();
                        this.walls.splice(i, 1);
                        this.addDebugLog('Wall destroyed!', 'structure');
                        this.updateStructureCounts();
                    }
                }
            }

            // Check obstacles
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obstacle = this.obstacles[i];
                const dx = enemy.x - obstacle.x;
                const dy = enemy.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 30) {
                    obstacle.health--;
                    this.addDebugLog(`Obstacle damaged! Health: ${obstacle.health}`, 'collision');
                    if (obstacle.health <= 0) {
                        obstacle.element.remove();
                        this.obstacles.splice(i, 1);
                        this.addDebugLog('Obstacle destroyed!', 'structure');
                        this.updateStructureCounts();
                    }
                }
            }
        }
    }

    createWallConnection(obstacle1, obstacle2) {
        this.addDebugLog(`Creating wall connection between (${Math.round(obstacle1.x)}, ${Math.round(obstacle1.y)}) and (${Math.round(obstacle2.x)}, ${Math.round(obstacle2.y)})`, 'structure');
        
        // Calculate extended line points using 1.7x multiplier
        const dx = obstacle2.x - obstacle1.x;
        const dy = obstacle2.y - obstacle1.y;
        const x1 = obstacle1.x - dx * 0.7;
        const y1 = obstacle1.y - dy * 0.7;
        const x2 = obstacle2.x + dx * 0.7;
        const y2 = obstacle2.y + dy * 0.7;
        
        // Create SVG line with extended points
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.classList.add('wall-line');
        
        // Add to SVG container
        this.svgContainer.appendChild(line);
        
        // Store wall connection
        this.walls.push({
            line: line,
            obstacle1: obstacle1,
            obstacle2: obstacle2,
            health: 1000
        });

        // Update obstacle appearances
        obstacle1.element.classList.add('wall-node');
        obstacle2.element.classList.add('wall-node');
        
        this.addDebugLog('Wall connection complete', 'structure');
    }

    placeObstacle() {
        const dx = this.mousePosition.x - this.player.x;
        const dy = this.mousePosition.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 45) {
            this.showInvalidRangeFlash(this.player.x, this.player.y);
            return;
        }

        // Check for nearby obstacles during construction
        const nearbyObstacles = [...this.obstacles, ...this.constructingObstacles].filter(obs => {
            const distance = Math.sqrt((obs.x - this.mousePosition.x) ** 2 + (obs.y - this.mousePosition.y) ** 2);
            return distance <= 45;
        });

        // Find closest obstacle and its overlap
        if (nearbyObstacles.length > 0) {
            const closest = nearbyObstacles.reduce((prev, curr) => {
                const prevDist = Math.sqrt((prev.x - this.mousePosition.x) ** 2 + (prev.y - this.mousePosition.y) ** 2);
                const currDist = Math.sqrt((curr.x - this.mousePosition.x) ** 2 + (curr.y - this.mousePosition.y) ** 2);
                return currDist < prevDist ? curr : prev;
            });

            const overlap = this.calculateOverlap(closest.x, closest.y, this.mousePosition.x, this.mousePosition.y);
            this.addDebugLog(`Overlap with nearby obstacle: ${Math.round(overlap)}%`, 'structure');

            if (overlap >= 85) {
                this.addDebugLog('Too much overlap, cannot place here', 'structure');
                this.showInvalidRangeFlash(this.mousePosition.x, this.mousePosition.y);
                return;
            }
        }

        // Create new obstacle with visual elements
        const obstacle = {
            x: this.mousePosition.x,
            y: this.mousePosition.y,
            element: document.createElement('div'),
            timerElement: document.createElement('div'),
            rangeElement: document.createElement('div'),
            health: 5,
            constructionStartTime: Date.now()
        };

        // Setup main element
        obstacle.element.className = 'obstacle constructing';
        obstacle.element.style.left = `${obstacle.x}px`;
        obstacle.element.style.top = `${obstacle.y}px`;

        // Setup timer
        obstacle.timerElement.className = 'construction-timer';
        obstacle.timerElement.textContent = '5.0';
        obstacle.element.appendChild(obstacle.timerElement);

        // Setup range indicator around player
        obstacle.rangeElement.className = 'construction-range';
        obstacle.rangeElement.style.left = `${this.player.x}px`;
        obstacle.rangeElement.style.top = `${this.player.y}px`;

        this.gameArena.appendChild(obstacle.rangeElement);
        this.gameArena.appendChild(obstacle.element);

        this.addDebugLog(`Started construction at (${Math.round(obstacle.x)}, ${Math.round(obstacle.y)})`, 'structure');
        this.constructingObstacles.push(obstacle);

        setTimeout(() => {
            if (obstacle.element.parentNode) {
                const elapsedTime = Date.now() - obstacle.constructionStartTime;
                const remainingTime = Math.max(0, (5000 - elapsedTime) / 1000);
                
                // Update timer display
                obstacle.timerElement.textContent = remainingTime.toFixed(1);
                
                // Only log progress at 25% intervals
                const progress = Math.round((1 - remainingTime/5) * 100);
                if (progress % 25 === 0) {
                    this.addDebugLog(`Construction progress: ${progress}%`, 'structure');
                }

                // Check if construction is complete
                if (remainingTime <= 0) {
                    obstacle.element.classList.remove('constructing');
                    obstacle.timerElement.remove();
                    obstacle.rangeElement.remove();
                    
                    // Determine final structure type
                    const structureInfo = this.determineStructureType(obstacle.x, obstacle.y);
                    this.addDebugLog(`Final structure type determined: ${structureInfo.type}`, 'structure');
                    
                    // Handle structure transformation
                    if (structureInfo.type === 'wall' && structureInfo.target) {
                        this.createWallConnection(obstacle, structureInfo.target);
                    } else if (structureInfo.type === 'building' && structureInfo.target) {
                        this.createBuilding(obstacle, structureInfo.target);
                    } else if (structureInfo.type === 'tower' && structureInfo.target) {
                        structureInfo.target.towerHeight++;
                    }
                    
                    // Move from constructing to completed
                    const index = this.constructingObstacles.indexOf(obstacle);
                    if (index > -1) {
                        this.constructingObstacles.splice(index, 1);
                        this.obstacles.push(obstacle);
                    }
                    
                    this.showConstructionComplete(obstacle.x, obstacle.y, structureInfo.type);
                    this.updateStructureCounts();
                }
            }
        }, 5000);
    }

    updateConstructingObstacles() {
        const currentTime = Date.now();
        for (const obstacle of this.constructingObstacles) {
            const elapsedTime = currentTime - obstacle.constructionStartTime;
            const remainingTime = Math.max(0, (5000 - elapsedTime) / 1000);
            
            // Update timer display
            obstacle.timerElement.textContent = remainingTime.toFixed(1);
            
            // Only log progress at 25% intervals
            const progress = Math.round((1 - remainingTime/5) * 100);
            if (progress % 25 === 0) {
                this.addDebugLog(`Construction progress: ${progress}%`, 'structure');
            }

            // Check if construction is complete
            if (remainingTime <= 0) {
                obstacle.element.classList.remove('constructing');
                obstacle.timerElement.remove();
                obstacle.rangeElement.remove();
                
                // Move from constructing to completed first
                const index = this.constructingObstacles.indexOf(obstacle);
                if (index > -1) {
                    this.constructingObstacles.splice(index, 1);
                    this.obstacles.push(obstacle);
                }
                
                // Determine final structure type
                const structureInfo = this.determineStructureType(obstacle.x, obstacle.y);
                this.addDebugLog(`Final structure type determined: ${structureInfo.type}`, 'structure');
                
                // Handle structure transformation
                if (structureInfo.type === 'wall' && structureInfo.target) {
                    const createWall = this.createWallConnection.bind(this);
                    createWall(obstacle, structureInfo.target);
                } else if (structureInfo.type === 'building' && structureInfo.target) {
                    this.createBuilding(obstacle, structureInfo.target);
                } else if (structureInfo.type === 'tower' && structureInfo.target) {
                    structureInfo.target.towerHeight++;
                }
                
                this.showConstructionComplete(obstacle.x, obstacle.y, structureInfo.type);
                this.updateStructureCounts();
                continue;
            }

            // Update range indicator position to follow player
            obstacle.rangeElement.style.left = `${this.player.x}px`;
            obstacle.rangeElement.style.top = `${this.player.y}px`;
            
            // Update range indicator visibility
            const dx = this.player.x - obstacle.x;
            const dy = this.player.y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 45) {
                obstacle.rangeElement.classList.add('active');
            } else {
                obstacle.rangeElement.classList.remove('active');
            }
        }
    }

    showInvalidRangeFlash(x, y) {
        const flash = document.createElement('div');
        flash.className = 'range-flash';
        flash.style.left = `${x}px`;
        flash.style.top = `${y}px`;
        this.gameArena.appendChild(flash);
        
        setTimeout(() => {
            flash.remove();
        }, 500);
    }

    calculateOverlap(x1, y1, x2, y2, radius = 15) {
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const overlapPercentage = Math.max(0, (2 * radius - distance) / (2 * radius)) * 100;
        this.addDebugLog(`Overlap calculation: ${Math.round(overlapPercentage)}% at distance ${Math.round(distance)}px`, 'structure');
        return overlapPercentage;
    }

    determineStructureType(newX, newY) {
        const nearbyObstacles = this.obstacles.filter(obs => {
            const distance = Math.sqrt((obs.x - newX) ** 2 + (obs.y - newY) ** 2);
            return distance < 60;
        });

        if (nearbyObstacles.length === 0) {
            return { type: 'obstacle' };
        }

        const closest = nearbyObstacles[0];
        const overlap = this.calculateOverlap(newX, newY, closest.x, closest.y);
        
        this.addDebugLog(`Structure determination - overlap: ${Math.round(overlap)}%`, 'structure');

        if (overlap >= 80) {
            return { type: 'tower', target: closest };
        } else if (overlap >= 34 && overlap < 80) {
            return { type: 'building', target: closest };
        } else if (overlap >= 0.1 && overlap <= 33) {
            return { type: 'wall', target: closest };
        }
        
        return { type: 'obstacle' };
    }

    createBuilding(obstacle1, obstacle2) {
        // Merge the two obstacles visually
        const midX = (obstacle1.x + obstacle2.x) / 2;
        const midY = (obstacle1.y + obstacle2.y) / 2;
        
        obstacle1.element.classList.add('building');
        obstacle2.element.classList.add('building');
        
        this.addDebugLog(`Created building at (${Math.round(midX)}, ${Math.round(midY)})`, 'structure');
    }

    showConstructionComplete(x, y, structureType = 'structure') {
        const popup = document.createElement('div');
        popup.className = 'construction-complete';
        popup.textContent = `${structureType} Complete!`;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        this.gameArena.appendChild(popup);
        
        this.addDebugLog(`Construction complete popup shown for ${structureType}`, 'structure');
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 1000);
    }

    gameOver() {
        this.addDebugLog('Game Over! Player health reached 0', 'collision');
        alert('Game Over! Your structures have been eroded away...');
        location.reload();
    }

    canPlaceObstacle() {
        const dx = this.mousePosition.x - this.player.x;
        const dy = this.mousePosition.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if within placement range
        if (distance > 45) {
            this.addDebugLog('Cannot place: Outside range', 'structure');
            return false;
        }

        // Check for excessive overlap with existing obstacles
        const nearbyObstacles = this.obstacles.filter(obs => {
            const obstacleDistance = Math.sqrt(
                (obs.x - this.mousePosition.x) ** 2 + 
                (obs.y - this.mousePosition.y) ** 2
            );
            return obstacleDistance < 60;
        });

        if (nearbyObstacles.length > 0) {
            const closest = nearbyObstacles[0];
            const overlap = this.calculateOverlap(
                this.mousePosition.x,
                this.mousePosition.y,
                closest.x,
                closest.y
            );

            // Prevent placement if overlap is too high (>90%)
            if (overlap > 90) {
                this.addDebugLog(`Cannot place: Overlap too high (${Math.round(overlap)}%)`, 'structure');
                return false;
            }
        }

        return true;
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (e) => {
            const rect = this.gameArena.getBoundingClientRect();
            this.mousePosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.updatePlacementPreview();
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpaceDown) {
                this.isSpaceDown = true;
                this.showPlacementRange();
            }
            this.keys[e.code] = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpaceDown = false;
                if (this.canPlaceObstacle()) {
                    this.placeObstacle();
                }
                this.hidePlacementRange();
            }
            this.keys[e.code] = false;
        });

        this.gameArena.addEventListener('mousemove', (e) => {
            const rect = this.gameArena.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
            
            // Calculate angle for player rotation
            const dx = this.mousePosition.x - this.player.x;
            const dy = this.mousePosition.y - this.player.y;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.playerElement.style.transform = `rotate(${angle}deg)`;
        });

        this.gameArena.addEventListener('click', (e) => {
            const rect = this.gameArena.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            this.addDebugLog(`Mouse clicked at (${Math.round(clickX)}, ${Math.round(clickY)})`, 'input');

            // Check if clicked on any enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const dx = clickX - enemy.x;
                const dy = clickY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 15) {
                    this.destroyEnemy(i);
                    break;
                }
            }
        });
    }

    updatePlacementPreview() {
        if (!this.isSpaceDown) return;

        const dx = this.mousePosition.x - this.player.x;
        const dy = this.mousePosition.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clear existing previews
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
        if (this.previewWallLine) {
            this.previewWallLine.remove();
            this.previewWallLine = null;
        }

        // Find nearby obstacles
        const nearbyObstacles = this.obstacles.filter(obs => {
            const obstacleDistance = Math.sqrt(
                (obs.x - this.mousePosition.x) ** 2 + 
                (obs.y - this.mousePosition.y) ** 2
            );
            return obstacleDistance < 60;
        });

        if (nearbyObstacles.length > 0) {
            const closest = nearbyObstacles[0];
            const overlap = this.calculateOverlap(
                this.mousePosition.x,
                this.mousePosition.y,
                closest.x,
                closest.y
            );

            this.addDebugLog(`Preview overlap: ${Math.round(overlap)}%`, 'structure');

            if (overlap >= 80) {
                // Tower preview
                this.previewElement = document.createElement('div');
                this.previewElement.className = 'tower-preview';
                this.previewElement.style.left = `${closest.x}px`;
                this.previewElement.style.top = `${closest.y}px`;
                this.gameArena.appendChild(this.previewElement);
            } else if (overlap >= 34 && overlap < 80) {
                // Building preview
                this.previewElement = document.createElement('div');
                this.previewElement.className = 'building-preview';
                this.previewElement.style.left = `${closest.x}px`;
                this.previewElement.style.top = `${closest.y}px`;
                this.gameArena.appendChild(this.previewElement);
            } else if (overlap >= 0.1 && overlap <= 33) {
                // Wall preview
                this.previewWallLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                this.previewWallLine.setAttribute('x1', String(closest.x));
                this.previewWallLine.setAttribute('y1', String(closest.y));
                this.previewWallLine.setAttribute('x2', String(this.mousePosition.x));
                this.previewWallLine.setAttribute('y2', String(this.mousePosition.y));
                this.previewWallLine.classList.add('wall-preview');
                this.svgContainer.appendChild(this.previewWallLine);
            }
        } else if (distance <= 45) {
            // Basic obstacle preview within range
            this.previewElement = document.createElement('div');
            this.previewElement.className = 'placement-preview';
            this.previewElement.style.left = `${this.mousePosition.x}px`;
            this.previewElement.style.top = `${this.mousePosition.y}px`;
            this.gameArena.appendChild(this.previewElement);
            this.gameArena.style.cursor = 'pointer';
        } else {
            this.gameArena.style.cursor = 'not-allowed';
        }
    }

    showPlacementRange() {
        if (!this.placementPreview) {
            this.placementPreview = document.createElement('div');
            this.placementPreview.className = 'construction-range active';
            this.placementPreview.style.left = `${this.player.x}px`;
            this.placementPreview.style.top = `${this.player.y}px`;
            this.gameArena.appendChild(this.placementPreview);
            this.addDebugLog('Showing placement range', 'structure');
        }
    }

    hidePlacementRange() {
        if (this.placementPreview) {
            this.placementPreview.remove();
            this.placementPreview = null;
        }
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
        if (this.previewWallLine) {
            this.previewWallLine.remove();
            this.previewWallLine = null;
        }
        this.addDebugLog('Hiding placement range', 'structure');
    }

    calculateSlideDirection(wallStartX, wallStartY, wallEndX, wallEndY, enemyX, enemyY) {
        // Calculate wall vector
        const wallVectorX = wallEndX - wallStartX;
        const wallVectorY = wallEndY - wallStartY;
        
        // Normalize wall vector
        const wallLength = Math.sqrt(wallVectorX * wallVectorX + wallVectorY * wallVectorY);
        const normalizedWallX = wallVectorX / wallLength;
        const normalizedWallY = wallVectorY / wallLength;
        
        // Calculate dot product
        const dotProduct = (enemyX - wallStartX) * normalizedWallX + (enemyY - wallStartY) * normalizedWallY;
        
        // Calculate closest point on wall
        const closestX = wallStartX + dotProduct * normalizedWallX;
        const closestY = wallStartY + dotProduct * normalizedWallY;
        
        // Get direction vector from closest point to enemy
        return {
            x: enemyX - closestX,
            y: enemyY - closestY
        };
    }

    gameLoop() {
        // Store previous position for collision detection
        const prevX = this.player.x;
        const prevY = this.player.y;

        // Update player position based on keyboard input
        if (this.keys['ArrowUp'] || this.keys['KeyW']) this.player.y -= this.player.speed;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) this.player.y += this.player.speed;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += this.player.speed;

        // Keep player within bounds
        this.player.x = Math.max(0, Math.min(this.player.x, 690));
        this.player.y = Math.max(0, Math.min(this.player.y, 690));

        // Check wall collisions for player
        let playerCollided = false;
        for (const wall of this.walls) {
            if (this.lineIntersectsCircle(
                wall.obstacle1.x, wall.obstacle1.y,
                wall.obstacle2.x, wall.obstacle2.y,
                this.player.x, this.player.y, 15
            )) {
                // Restore previous position if collided
                this.player.x = prevX;
                this.player.y = prevY;
                playerCollided = true;
                break;
            }
        }

        // Only update player element position if not collided
        if (!playerCollided) {
            this.playerElement.style.left = `${this.player.x}px`;
            this.playerElement.style.top = `${this.player.y}px`;
        }

        // Update placement range position if active
        if (this.placementPreview) {
            this.placementPreview.style.left = `${this.player.x}px`;
            this.placementPreview.style.top = `${this.player.y}px`;
        }

        // Update enemies with wall collisions
        this.spawnEnemy();
        for (const enemy of this.enemies) {
            const prevEnemyX = enemy.x;
            const prevEnemyY = enemy.y;

            // Calculate base movement towards player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const angle = Math.atan2(dy, dx);
            
            // Store the intended movement
            const intendedX = Math.cos(angle) * enemy.speed;
            const intendedY = Math.sin(angle) * enemy.speed;
            
            // Initialize actual movement
            let actualX = intendedX;
            let actualY = intendedY;

            // Check wall collisions and adjust movement
            for (const wall of this.walls) {
                if (this.lineIntersectsCircle(
                    wall.obstacle1.x, wall.obstacle1.y,
                    wall.obstacle2.x, wall.obstacle2.y,
                    enemy.x + intendedX, enemy.y + intendedY, 15
                )) {
                    // Calculate slide direction along the wall
                    const slideDir = this.calculateSlideDirection(
                        wall.obstacle1.x, wall.obstacle1.y,
                        wall.obstacle2.x, wall.obstacle2.y,
                        enemy.x, enemy.y
                    );
                    
                    // Normalize slide direction
                    const slideMagnitude = Math.sqrt(slideDir.x * slideDir.x + slideDir.y * slideDir.y);
                    if (slideMagnitude > 0) {
                        const normalizedSlideX = slideDir.x / slideMagnitude;
                        const normalizedSlideY = slideDir.y / slideMagnitude;
                        
                        // Project intended movement onto slide direction
                        const projection = intendedX * normalizedSlideX + intendedY * normalizedSlideY;
                        
                        // Update actual movement to slide along the wall
                        actualX = normalizedSlideX * projection * 0.8; // Reduce speed slightly when sliding
                        actualY = normalizedSlideY * projection * 0.8;
                    }
                }
            }

            // Check obstacle collisions
            for (const obstacle of this.obstacles) {
                const futureX = enemy.x + actualX;
                const futureY = enemy.y + actualY;
                const dx = futureX - obstacle.x;
                const dy = futureY - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30) {
                    // Calculate tangent direction around obstacle
                    const angle = Math.atan2(dy, dx);
                    const tangentAngle = angle + Math.PI / 2;
                    
                    // Update movement to slide around obstacle
                    actualX = Math.cos(tangentAngle) * enemy.speed * 0.8;
                    actualY = Math.sin(tangentAngle) * enemy.speed * 0.8;
                }
            }

            // Apply the final movement
            enemy.x += actualX;
            enemy.y += actualY;

            // Keep enemies within bounds
            enemy.x = Math.max(0, Math.min(enemy.x, 690));
            enemy.y = Math.max(0, Math.min(enemy.y, 690));

            // Update enemy element position
            enemy.element.style.left = `${enemy.x}px`;
            enemy.element.style.top = `${enemy.y}px`;
        }

        // Check for collisions
        this.checkCollisions();
        
        // Update constructing obstacles
        this.updateConstructingObstacles();

        // Continue the game loop
        requestAnimationFrame(() => this.gameLoop());
    }

    lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
        // Calculate the closest point on the line to the circle
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize direction vector
        const nx = dx / len;
        const ny = dy / len;
        
        // Vector from line start to circle center
        const px = cx - x1;
        const py = cy - y1;
        
        // Project circle center onto line
        const projection = px * nx + py * ny;
        
        // Get closest point on line
        let closestX, closestY;
        if (projection < 0) {
            closestX = x1;
            closestY = y1;
        } else if (projection > len) {
            closestX = x2;
            closestY = y2;
        } else {
            closestX = x1 + nx * projection;
            closestY = y1 + ny * projection;
        }
        
        // Check if closest point is within circle radius
        const distX = cx - closestX;
        const distY = cy - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        return distance <= r;
    }
}

// Start the game
window.addEventListener('load', () => {
    new Game();
});
