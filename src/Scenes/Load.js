class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/tiled");

        this.load.image('coin', 'coin.png');

        // Load tilemap information
        this.load.image("tilemap_tiles", "tilemap_packed.png");     // Packed tilemap
        this.load.tilemapTiledJSON("baselevel", "baselevel.tmj");   // Tilemap in JSON

        // Load the sprite sheet for the characters (assuming 16x16 pixels per frame)
        this.load.spritesheet("platformer_characters", "transparent_tilemap_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.multiatlas("kenny-particles", "kenny-particles.json");


        // Load the bitmap font
        this.load.setPath('./assets/fonts');
        this.load.bitmapFont('b93', 'b93font_0.png', 'b93font.xml');


        // Load audio files
        this.load.setPath('./assets/audio');
        this.load.audio('death', 'death.mp3');
        this.load.audio('jump', 'jump.mp3');
        this.load.audio('coin', 'coin.mp3');
        this.load.audio('exit', 'exit.mp3');




    }

    create() {
        // Set up animations using frame numbers
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('platformer_characters', { start: 262, end: 265 }),
            frameRate: 15,
            repeat: -1,
        });

        this.anims.create({
            key: 'idle',
            frames: [{ key: 'platformer_characters', frame: 261 }],
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'jump',
            frames: [{ key: 'platformer_characters', frame: 1 }],
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'fan',
            frames: [{ key: 'platformer_characters', frame: 290}],
            frameRate: 10,
            repeat: -1,
        });

        // Pass to the next Scene
        this.scene.start("platformerScene");
    }
}
