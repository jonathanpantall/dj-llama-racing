var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true, // Force the game to scale images up crisply
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: Math.PI * 400 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var player;
var globals = {};

var game = new Phaser.Game(config);

function preload() {
  this.load.image("tiles", "assets/1_nYRQLN_J6TOMcurufrT7TQ.png");
  this.load.tilemapTiledJSON("map", "assets/testMapJson.json");
  this.load.spritesheet('llama', 'assets/llama.png', { frameWidth: 48, frameHeight: 48 });
};

function create() {
  this.socket = io();

  const map = this.make.tilemap({ key: "map" });
  const tileset = map.addTilesetImage("testTileset", "tiles");

  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const belowLayer = map.createStaticLayer("Below Player", tileset, 0, 0);
  const worldLayer = map.createStaticLayer("World", tileset, 0, 0);
  const aboveLayer = map.createStaticLayer("Above Player", tileset, 0, 0);

  worldLayer.setCollisionByProperty({ collides: true });

  const spawnPoint = map.findObject("Objects", obj => obj.name === "Spawn Point");
  const finishLine = map.findObject("Objects", obj => obj.name === "Map_One_Finish_Line");

  globals.currentPlayerState = {
    isWinner: false
  };

  globals.mapOne = {
    finishLine: finishLine,
    map: map
  };

  //player
  player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, "llama").setSize(24, 24).setOffset(8, 24);
  this.physics.add.collider(player, worldLayer);
  player.body.bounce.y = 0.4;

  const camera = this.cameras.main;
  camera.startFollow(player);
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('llama', { start: 0, end: 6 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'turn',
    frames: [{ key: 'llama', frame: 4 }],
    frameRate: 20
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('llama', { start: 0, end: 6 }),
    frameRate: 10,
    repeat: -1
  });
};

function update(time, delta) {
  var cursors = this.input.keyboard.createCursorKeys();
  var spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  if (globals.currentPlayerState.isWinner == false) {
    if (cursors.left.isDown) {
      player.flipX = true;
      player.setVelocityX(-160);
      player.anims.play('left', true);
    } else if (cursors.right.isDown) {
      player.flipX = false;
      player.setVelocityX(160);
      player.anims.play('right', true);
    } else {
      player.setVelocityX(0);
      player.anims.play('turn');
    }
  
    if (spaceBar.isDown && player.body.onFloor()) {
      player.setVelocityY(-330 * 2);
    }
  }

  if (player.x > globals.mapOne.finishLine.x && globals.currentPlayerState.isWinner == false) {
    globals.currentPlayerState.isWinner = true;
    this.add.text(player.x, player.y, 'WINNER!');

    //go outta the screen
    for (let index = player.x; index < globals.mapOne.map.widthInPixels; index++) {
      player.setVelocityX(160);
      player.anims.play('right', true);
    }

  }

};