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

var globals = {};
var currentMapName = "mapOne";

var game = new Phaser.Game(config);

function preload() {
  this.load.image("tiles", "assets/1_nYRQLN_J6TOMcurufrT7TQ.png");
  this.load.tilemapTiledJSON("map", "assets/testMapJson.json");
  this.load.spritesheet('llama', 'assets/llama.png', { frameWidth: 48, frameHeight: 48 });
};

function create() {
  this.socket = io();

  var self = this;

  this.otherPlayers = this.physics.add.group();

  const map = this.make.tilemap({ key: "map" });
  const tileset = map.addTilesetImage("testTileset", "tiles");

  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const belowLayer = map.createStaticLayer("Below Player", tileset, 0, 0);
  const worldLayer = map.createStaticLayer("World", tileset, 0, 0);
  const aboveLayer = map.createStaticLayer("Above Player", tileset, 0, 0);
  // const movingVerticalBlocks = map.createFromTiles("Moving Vertical Blocks", tileset, 0, 0);

  worldLayer.setCollisionByProperty({ collides: true });
  // movingVerticalBlocks.setCollisionByProperty({ collides: true });

  const finishLine = map.findObject("Objects", obj => obj.name === "Map_One_Finish_Line");
  const startingLine = map.findObject("Objects", obj => obj.name === "Map_One_Starting_Line");
  const spawnPoint = map.findObject("Objects", obj => obj.name === "Spawn Point");

  globals.currentPlayerState = {};

  globals[currentMapName] = {
    finishLine: finishLine,
    startingLine: startingLine,
    spawnPoint: spawnPoint,
    map: map,
    belowLayer: belowLayer,
    worldLayer: worldLayer,
    aboveLayer: aboveLayer,
    hasStarted: false,
    countdownStarted: false,
    nbrOfLaps: 3,
    takeBackToStart: true
  };

  this.countDownNumber = self.add.text(startingLine.x, startingLine.y, "");

  this.socket.on('currentPlayers', function (players) {
    console.log(players);
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        console.log("add player myself")
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {

        //determine player direction to set animation and flipX
        if (otherPlayer.x < playerInfo.x) {
          //going right
          otherPlayer.flipX = false;
          otherPlayer.anims.play('right', true);
        } else if (otherPlayer.x > playerInfo.x) {
          //going left
          otherPlayer.flipX = true;
          otherPlayer.anims.play('left', true);
        }

        didPlayerWin(self, otherPlayer);

        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on('raceStartCountDown', function (currentCountdownNbr) {
    if (globals[currentMapName].hasStarted == false) {
      globals[currentMapName].countdownStarted = true;
      self.countDownNumber.setText(currentCountdownNbr);

      if (currentCountdownNbr == 0) {
        globals[currentMapName].hasStarted = true;
        self.countDownNumber.setText("GO!");
      }
    }
  });

  this.socket.on('disconnect', function (playerId) {
    console.log(playerId);
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
};

function update(time, delta) {
  var cursors = this.input.keyboard.createCursorKeys();
  var spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  var enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

  if (this.player) {
    if (globals.currentPlayerState[this.player.playerId].isWinner == false) {
      if (cursors.left.isDown) {
        this.player.flipX = true;
        this.player.setVelocityX(-160);
        this.player.anims.play('left', true);
      } else if (cursors.right.isDown) {
        this.player.flipX = false;

        if (globals[currentMapName].hasStarted == false) {
          if (this.player.x <= globals[currentMapName].startingLine.x - 10) {
            this.player.setVelocityX(160);
          } else {
            this.player.setVelocityX(0);
          }
        } else {
          this.player.setVelocityX(160);
        }

        this.player.anims.play('right', true);
      } else {
        this.player.setVelocityX(0);
        this.player.anims.play('turn');
      }
    
      if (spaceBar.isDown && this.player.body.onFloor()) {
        this.player.setVelocityY(-330 * 2);
      }

      if (enterKey.isDown && globals[currentMapName].countdownStarted == false) {
        //start count down
        globals[currentMapName].countdownStarted = true;
        this.socket.emit('beginRaceCountDown');
      }
    }

    didPlayerWin(this, this.player);

    // emit player movement
    var x = this.player.x;
    var y = this.player.y;
    if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y)) {
      this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y });
    }
    
    // save old position data
    this.player.oldPosition = {
      x: this.player.x,
      y: this.player.y
    };
  }

  //moving blocks



};

function didPlayerWin(self, currentPlayer) {
  if (currentPlayer.x > globals[currentMapName].finishLine.x && globals.currentPlayerState[currentPlayer.playerId].isWinner == false) {
    
    if (globals.currentPlayerState[currentPlayer.playerId].lapsCompleted < globals[currentMapName].nbrOfLaps) {
      //lap completed 
      globals.currentPlayerState[currentPlayer.playerId].lapsCompleted = globals.currentPlayerState[currentPlayer.playerId].lapsCompleted + 1;
      
      self.countDownNumber.setText("Lap " + globals.currentPlayerState[currentPlayer.playerId].lapsCompleted + " of " + globals[currentMapName].nbrOfLaps);

      //take em back to the start for now
      if (globals[currentMapName].takeBackToStart) {
        currentPlayer.setPosition(globals[currentMapName].spawnPoint.x, globals[currentMapName].spawnPoint.y);
        currentPlayer.setVelocityX(160);
        currentPlayer.setVelocityY(0);
        currentPlayer.anims.play('right', true);
      }
    } else {
      globals.currentPlayerState[currentPlayer.playerId].isWinner = true;

      self.add.text(currentPlayer.x, currentPlayer.y, 'WINNER!');
  
      //go outta the screen
      for (let index = currentPlayer.x; index < globals[currentMapName].map.widthInPixels; index++) {
        currentPlayer.setVelocityX(160);
        currentPlayer.anims.play('right', true);
      }
    }
  }
}

function addPlayer(self, playerInfo) {
  //player
  self.player = self.physics.add.sprite(globals[currentMapName].spawnPoint.x, globals[currentMapName].spawnPoint.y, "llama").setSize(24, 24).setOffset(8, 24);
  self.player.playerId = playerInfo.playerId;
  self.physics.add.collider(self.player, globals[currentMapName].worldLayer);
  // self.physics.add.collider(self.player, globals[currentMapName].movingVerticalBlocks);
  self.player.body.bounce.y = 0.4;

  globals.currentPlayerState[self.player.playerId] = {
    isWinner: false,
    lapsCompleted: 0
  };

  const camera = self.cameras.main;
  camera.startFollow(self.player);
  camera.setBounds(0, 0, globals[currentMapName].map.widthInPixels, globals[currentMapName].map.heightInPixels);

  self.anims.create({
    key: 'left',
    frames: self.anims.generateFrameNumbers('llama', { start: 0, end: 6 }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
    key: 'turn',
    frames: [{ key: 'llama', frame: 4 }],
    frameRate: 20
  });

  self.anims.create({
    key: 'right',
    frames: self.anims.generateFrameNumbers('llama', { start: 0, end: 6 }),
    frameRate: 10,
    repeat: -1
  });
};

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add.sprite(globals[currentMapName].spawnPoint.x + 50, globals[currentMapName].spawnPoint.y - 70, "llama").setSize(24, 24).setOffset(8, 24);
  self.physics.add.collider(otherPlayer, globals[currentMapName].worldLayer);
  otherPlayer.body.bounce.y = 0.4;

  // if (playerInfo.team === 'blue') {
  //   otherPlayer.setTint(0x0000ff);
  // } else {
  //   otherPlayer.setTint(0xff0000);
  // }

  //other player tint?
  otherPlayer.setTint(0xff0000);

  otherPlayer.playerId = playerInfo.playerId;

  globals.currentPlayerState[otherPlayer.playerId] = {
    isWinner: false,
    lapsCompleted: 0
  };

  self.otherPlayers.add(otherPlayer);
};
