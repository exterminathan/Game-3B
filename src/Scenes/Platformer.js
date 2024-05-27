class Enemy {
    constructor(scene, x, y, key) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, key);

        // Set enemy properties
        this.sprite.setCollideWorldBounds(true);
        this.sprite.body.setGravityY(3000);
        this.sprite.setBounce(0.2);
        this.sprite.setVelocityX(100);

        // Set enemy animations
        this.sprite.anims.play('walk', true);

        // Handle collision with the ground layer
        scene.physics.add.collider(this.sprite, scene.groundLayer);

        // Add overlap detection with player for custom behavior
        scene.physics.add.overlap(this.sprite, scene.player, this.handlePlayerCollision, null, this);
    }

    update() {
        // Check for edges and reverse direction
        if (this.sprite.body.blocked.right || this.sprite.body.blocked.left) {
            this.sprite.setVelocityX(this.sprite.body.velocity.x * -1);
        }

        // Prevent falling off edges
        if (this.sprite.body.blocked.down && !this.sprite.body.blocked.left && !this.sprite.body.blocked.right) {
            const nextTileLeft = this.scene.groundLayer.getTileAtWorldXY(this.sprite.x - this.sprite.width / 2, this.sprite.y + this.sprite.height / 2);
            const nextTileRight = this.scene.groundLayer.getTileAtWorldXY(this.sprite.x + this.sprite.width / 2, this.sprite.y + this.sprite.height / 2);

            if (!nextTileLeft) {
                this.sprite.setVelocityX(Math.abs(this.sprite.body.velocity.x));
            }

            if (!nextTileRight) {
                this.sprite.setVelocityX(-Math.abs(this.sprite.body.velocity.x));
            }
        }
    }

    handlePlayerCollision(enemySprite, playerSprite) {
        // Define what happens when the enemy collides with the player
        console.log('Player collided with enemy!');
        this.scene.playerDies();
    }
}

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 900;
        this.JUMP_VELOCITY = -475;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;

        this.score = 0;

        // Double jump and variable jump height variables
        this.doubleJumpTimer = null;
        this.DOUBLE_JUMP_VELOCITY = this.JUMP_VELOCITY / 2;
        this.isJumping = false;
        this.jumpStartTime = 0;
        this.jumps = 0;
        this.MAX_JUMPS = 2;

        this.isCrouching = false;
        this.CROUCH_SCALE = 0.5;
        this.CROUCH_JUMP_VELOCITY = this.JUMP_VELOCITY / 2;
        this.WALL_JUMP_VELOCITY_X = this.JUMP_VELOCITY * 0.95;
        this.WALL_JUMP_VELOCITY_Y = this.JUMP_VELOCITY * 1.05;
        this.DOUBLE_JUMP = true; // Enable double jump feature

        this.isWallJumping = false;
        this.wallJumpDirection = 0;
        this.allowWallJump = false;

        this.physics.world.gravity.y = 3000; // Increased from 1500
        this.MAX_JUMP_DURATION = 180; // Decreased from 300 to make jumps quicker
    }

    preload() {
        // No need to load bitmap font here, it's already loaded in Load.js
    }

    create() {

        // Create a new tilemap game object using the correct tile size and map size
        this.map = this.make.tilemap({ key: "baselevel" });

        // Set the world bounds to extend high above the visible area
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels + 5000);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("MonochromeTileset", "tilemap_tiles");

        // Create a ground layer
        this.groundLayer = this.map.createLayer("BaseLayer", this.tileset, 0, 0);

        // Set the collision properties for all tiles
        this.groundLayer.setCollisionByProperty({ collides: true });

        // Handle "platform" tiles
        this.groundLayer.forEachTile(tile => {
            if (tile.properties.platform) {
                tile.setCollision(false, false, true, false); // Only enable top collision
            }
        });

        // Set up player avatar
        this.player = this.physics.add.sprite(30, 345, "platformer_characters", 0);
        this.player.setCollideWorldBounds(true);
        this.player.setTint(0xff0000);

        // Enable collision handling
        this.physics.add.collider(this.player, this.groundLayer, this.handleTileCollision, null, this);

        // Ensure continuous collision checking
        this.player.body.onCollide = true;
        this.player.body.onWorldBounds = true;

        // Set up enemies
        this.enemies = this.physics.add.group();

        // Example enemy coordinates
        const enemyCoordinates = [
            { x: 200, y: 300 },
            { x: 400, y: 300 },
            { x: 600, y: 300 }
        ];

        // Create enemies at specified coordinates
        enemyCoordinates.forEach(coord => {
            const enemy = new Enemy(this, coord.x, coord.y, 'platformer_characters');
            this.enemies.add(enemy.sprite);
        });


        
        // Ensure enemies collide with the ground layer
        this.physics.add.collider(this.enemies, this.groundLayer);

         // Create coins from Tiled objects
         // Create coins with physics and proper settings
         this.coins = this.map.createFromObjects('Objects', {
            name: 'coin',
            key: 'platformer_characters',
            frame: 5  // Adjust the frame number if needed
        });
    
        // Convert the coins into Arcade Physics sprites (STATIC_BODY, so they don't move)
        this.coins.forEach((coin) => {
            this.physics.world.enable(coin, Phaser.Physics.Arcade.STATIC_BODY);
            coin.body.setAllowGravity(false);
            coin.setOrigin(0, 0);
        });
    
        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
    
        // Handle collision detection with coins
        this.physics.add.overlap(this.player, this.coinGroup, (player, coin) => {
            coin.destroy(); // remove coin on overlap
            this.collectCoin(); // add any additional logic for collecting the coin
        });






        // Set up Phaser-provided cursor key input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');
        this.lShiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.yKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);

        this.input.keyboard.enabled = true;


        // Debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            this.physics.world.debugGraphic.clear();
            this.allowWallJump = !this.allowWallJump;
        }, this);

        // Camera settings to follow the player and limit vertical movement
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(this.player, true, 0.25, 0.25);
        //OPTIONAL: CAMERA DEADZONE
        this.cameras.main.setDeadzone(50, 50);

        this.cameras.main.setZoom(this.SCALE);
        this.cameras.main.setFollowOffset(0, -this.map.heightInPixels / 2); // Ensure camera doesn't move too high

        this.scoreText = this.add.bitmapText(60, 20, 'b93', "Score: 0", 30).setOrigin(0.5);
        this.scoreText.setScrollFactor(0); // Ensures text stays in place during camera movement

        console.log('Score text created:', this.scoreText);
    }

    handleYKeyPress() {
        // Play the exit sound
        this.sound.play('exit');
    
        // Transition to the EndScene
        this.scene.start('EndScene');
    }
    


    collectCoin(player, coin) {
        coin.disableBody(true, true);
    
        // Update the score
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
    
        // Play coin collection sound
        this.sound.play('coin');
    }
    

    update() {

        if (Phaser.Input.Keyboard.JustDown(this.yKey)) {
            this.handleYKeyPress();
        }

        
        // Handle player controls
        const maxFallingSpeed = 800; // Adjust this value as needed
        const maxRisingSpeed = -800;
        if (this.player.body.velocity.y > maxFallingSpeed) {
            this.player.body.setVelocityY(maxFallingSpeed);
        }
        if (this.player.body.velocity.y < maxRisingSpeed) {
            this.player.body.setVelocityY(maxRisingSpeed);
        }

        // Player ground check and reset double jump
        if (this.player.body.blocked.down) {
            this.isJumping = false;
            this.jumpStartTime = 0;
            this.jumps = 0;
            this.isWallJumping = false;
        }

        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-this.ACCELERATION);
            this.player.setFlip(true, false);
            this.player.anims.play('walk', true);
        } else if (this.cursors.right.isDown) {
            this.player.setAccelerationX(this.ACCELERATION);
            this.player.resetFlip();
            this.player.anims.play('walk', true);
        } else {
            this.player.setAccelerationX(0);
            this.player.setDragX(this.DRAG);
            this.player.anims.play('idle');
        }

        // Handle wall jumping
        if (this.allowWallJump) {
            const leftTiles = this.groundLayer.getTilesWithinWorldXY(this.player.x - 10, this.player.y, 10, this.player.height, { isNotEmpty: true });
            const rightTiles = this.groundLayer.getTilesWithinWorldXY(this.player.x + this.player.width, this.player.y, 10, this.player.height, { isNotEmpty: true });

            const isTouchingWallLeft = leftTiles.some(tile => tile.collides);
            const isTouchingWallRight = rightTiles.some(tile => tile.collides);

            if ((isTouchingWallLeft || isTouchingWallRight) && !this.player.body.blocked.down) {
                if (isTouchingWallLeft && this.cursors.right.isDown) {
                    this.isWallJumping = true;
                    this.wallJumpDirection = -1; // Jump to the right
                } else if (isTouchingWallRight && this.cursors.left.isDown) {
                    this.isWallJumping = true;
                    this.wallJumpDirection = 1; // Jump to the left
                }
            }
        }

        // Handle jumping
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && (this.jumps < this.MAX_JUMPS || this.isWallJumping)) {
            this.isJumping = true;
            if (this.isWallJumping) {
                this.player.setVelocityY(this.JUMP_VELOCITY * 1.35);
                this.player.setVelocityX(this.wallJumpDirection * this.WALL_JUMP_VELOCITY_X); // Add outward velocity
                this.isWallJumping = false;
            } else if (this.jumps === 0) {
                this.player.setVelocityY(this.JUMP_VELOCITY);
                this.jumpStartTime = this.time.now;
            } else {
                this.player.setVelocityY(this.JUMP_VELOCITY * 1.25); // Increased to make the double jump higher
            }
            this.jumps++;
            // Play jump sound
            this.sound.play('jump');
        }

        // Allow variable jump height
        if (this.cursors.up.isDown && this.isJumping && this.time.now - this.jumpStartTime < this.MAX_JUMP_DURATION) {
            this.player.setVelocityY(this.JUMP_VELOCITY);
        } else if (this.cursors.up.isUp) {
            this.isJumping = false;
        }

        // FAN STUFF
        // Check for fan tiles directly below the player at any y level
        const fanTiles = this.groundLayer.getTilesWithinWorldXY(this.player.x, this.player.y + this.player.height, 1, 1000, { isNotEmpty: true }).filter(tile => tile.properties.fan);
        if (fanTiles.length > 0) {
            const fanPower = fanTiles[0].properties.fanPower || 200; // Use the first fan tile's properties or a default
            let can_go = !this.isBlockedByCollisionTile(this.player, fanTiles[0]);
            if (can_go) {
                this.player.setVelocityY(-fanPower);
            }
        }

        // Handle crouching
        if (this.lShiftKey.isDown) {
            if (!this.isCrouching) {
                this.isCrouching = true;
                this.player.setScale(1, this.CROUCH_SCALE);
            }
        } else {
            if (this.isCrouching) {
                this.isCrouching = false;
                this.player.setScale(1, 1);
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }

        // Check if the player fell off the screen
        if (this.player.y > this.map.height + 500) {
            this.playerDies();
        }

        // Update enemies
        this.enemies.children.iterate(enemy => {
            if (enemy) {
                enemy.update();
            }
        });
    }

    playerDies() {
        this.physics.pause();
        this.cameras.main.shake(1000, 0.001);
        this.input.keyboard.enabled = false;

        // Play death sound
        this.sound.play('death');

        let deathText = this.add.bitmapText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, 'b93', 'You Died!', 64).setOrigin(0.5);

        deathText.setWordTint(0xff0000);

        this.time.delayedCall(5000, () => {
            this.scene.restart();
        });
    }

    handleTileCollision(player, tile) {
        if (tile.properties.platform) {
            if (player.body.velocity.y > 0) {
                if (!tile.checkCollision) {
                    tile.checkCollision = { down: true };
                } else {
                    tile.checkCollision.down = true;
                }
                return true; // Enable collision when falling
            } else {
                if (!tile.checkCollision) {
                    tile.checkCollision = { down: false };
                } else {
                    tile.checkCollision.down = false;
                }
                return false; // Disable collision otherwise
            }
        }
        return true; // Default collision handling for other tiles
    }

    isBlockedByCollisionTile(player, fanTile) {
        const playerX = Math.floor(player.x / this.map.tileWidth) * this.map.tileWidth;
        const playerY = player.y + player.height;
        const fanX = fanTile.pixelX;
        const fanY = fanTile.pixelY;

        const endY = Math.min(playerY, fanY);

        for (let y = fanY - this.map.tileHeight; y >= endY; y -= this.map.tileHeight) {
            const tile = this.groundLayer.getTileAtWorldXY(playerX, y);
            if (tile && (tile.properties.collides || tile.properties.platform)) {
                return true; // Found a collision tile between the player and the fan
            }
        }

        return false;
    }
}



//Win End Screen
class EndScene extends Phaser.Scene {
    constructor() {
        super("EndScene");

    }

    preload() {
        // Load the bitmap font
        this.load.setPath('/assets/fonts');
        this.load.bitmapFont('b93', 'b93font_0.png', 'b93font.fnt');

    }

    create() {
        // Background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 1).setOrigin(0);

        // Title
        this.add.bitmapText(this.cameras.main.width / 2, this.cameras.main.height / 4, 'b93', 'Congratulations!', 64).setOrigin(0.5);

        // Instructions
        this.add.bitmapText(this.cameras.main.width / 2, this.cameras.main.height * 3 / 4, 'b93', 'Press <Q> to restart and try again!', 64).setOrigin(0.5);

        // Input listener to return to the game when any key is pressed
        this.input.keyboard.once('keydown-Q', () => {
            this.scene.start('Platformer');
            this.gameRestart();
        });
    }

    gameRestart() {
        this.scene.start('platformerScene');
    }
}