const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 480,
    parent: "game-container",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 }
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
  
  const game = new Phaser.Game(config);
  let cursors;
  let player; let player2;
  let showDebug = false;
  let finder;
  let marker;
  let camera;
  let scene;

  function preload() {
    // Runs once, loads up assets like images and audio
    this.load.image("tiles", "./assets/tilesets/tuxmon-sample-32px.png");
    this.load.tilemapTiledJSON("map", "./assets/tilesets/tuxmon-sample-32px.json");
    // An atlas is a way to pack multiple images together into one texture. I'm using it to load all
    // the player animations (walking left, walking right, etc.) in one image. For more info see:
    //  https://labs.phaser.io/view.html?src=src/animation/texture%20atlas%20animation.js
    // If you don't use an atlas, you can do the same thing with a spritesheet, see:
    //  https://labs.phaser.io/view.html?src=src/animation/single%20sprite%20sheet.js
    this.load.atlas("atlas", "./assets/atlas/atlas.png", "./assets/atlas/atlas.json");
    this.load.scenePlugin('AnimatedTiles', './assets/plugins/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
    //this.load.plugin('AnimatedTiles', './assets/plugins/AnimatedTiles.js');
    this.load.json('mapData', "./assets/tilesets/tuxmon-sample-32px.json");
    this.load.image("bg", "./assets/bgs/spielburgGate.jpg");
  }
  
  function create() {
    this.input.on('pointerup',handleClick);
    let data = this.cache.json.get('mapData');
    scene = this;
    
    this.add.image(0, 0, 'bg').setOrigin(0, 0);
    //this.sys.install('AnimatedTiles');
    // Runs once, after all assets in preload are loaded
     map = this.make.tilemap({ key: "map" });

     tileset = map.addTilesetImage("tuxmon-sample-32px", "tiles");

    // Parameters: layer name (or index) from Tiled, tileset, x, y
     belowLayer = map.createDynamicLayer("Below Player", tileset, 0, 0);
     worldLayer = map.createDynamicLayer("World", tileset, 0, 0);
     aboveLayer = map.createDynamicLayer("Above Player", tileset, 0, 0);
    this.sys.animatedTiles.init(map);
    console.log(map);
    worldLayer.setCollisionByProperty({ collides: true });
    //console.log(this.plugins);
    //let plugin = this.plugins.get('animatedTiles');
    //plugin.init(map);
    //console.log(this.plugin.get)
    
    //this.sys.animatedTiles.init(map);
    // By default, everything gets depth sorted on the screen in the order we created things. Here, we
    // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
    // Higher depths will sit on top of lower depth objects.
    aboveLayer.setDepth(10);

    // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
    // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"
    const spawnPoint = map.findObject("Objects", obj => obj.name === "Spawn Point");

    // Create a sprite with physics enabled via the physics system. The image used for the sprite has
    // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
    player = this.physics.add
      .sprite(spawnPoint.x, spawnPoint.y, "atlas", "misa-front")
      .setSize(30, 40)
      .setOffset(0, 24);

      player2 = this.physics.add
      .sprite(400, 400, "atlas", "misa-front")
      .setSize(30, 40)
      .setOffset(0, 24);

    // Watch the player and worldLayer for collisions, for the duration of the scene:
    this.physics.add.collider(player, worldLayer);
    this.physics.add.collider(player, player2);
    // Create the player's walking animations from the texture atlas. These are stored in the global
    // animation manager so any sprite can access them.
    this.anims.create({
      key: "misa-left-walk",
      frames: this.anims.generateFrameNames("atlas", { prefix: "misa-left-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "misa-right-walk",
      frames: this.anims.generateFrameNames("atlas", { prefix: "misa-right-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "misa-down-walk",
      frames: this.anims.generateFrameNames("atlas", { prefix: "misa-front-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "misa-up-walk",
      frames: this.anims.generateFrameNames("atlas", { prefix: "misa-back-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1
    });

    // Phaser supports multiple cameras, but you can access the default camera like this:
    camera = this.cameras.main;
    camera.startFollow(player);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Set up the arrows to control the camera
    cursors = this.input.keyboard.createCursorKeys();
    finder = new EasyStar.js();
    finder.enableDiagonals();
    finder.enableCornerCutting();

    // Marker that will follow the mouse
    //marker = this.add.graphics();
    //marker.lineStyle(3, 0xffffff, 1);
    //marker.strokeRect(0, 0, map.tileWidth, map.tileHeight);

    // We create the 2D array representing all the tiles of our map
    var grid = [];
    for(var y = 0; y < map.height; y++){
        var col = [];
        for(var x = 0; x < map.width; x++){
            // In each cell we store the ID of the tile, which corresponds
            // to its index in the tileset of the map ("ID" field in Tiled)
            col.push(getTileID(x,y));
        }
        grid.push(col);
    }
    finder.setGrid(grid);

    var tileset2 = map.tilesets[0];
    var properties = tileset2.tileProperties;
    var acceptableTiles = [];

    // We need to list all the tile IDs that can be walked on. Let's iterate over all of them
    // and see what properties have been entered in Tiled.
    for(var i = tileset2.firstgid-1; i < tileset.total; i++){ // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
        if(!properties.hasOwnProperty(i)) {
            // If there is no property indicated at all, it means it's a walkable tile
            acceptableTiles.push(i+1);
            continue;
        }
        if(!properties[i].collides) acceptableTiles.push(i+1);
        if(properties[i].cost) finder.setTileCost(i+1, properties[i].cost); // If there is a cost attached to the tile, let's register it
    }
    finder.setAcceptableTiles(acceptableTiles);


    // Help text that has a "fixed" position on the screen
    this.add
    .text(16, 16, 'Arrow keys to move\nPress "D" to show hitboxes', {
      font: "18px monospace",
      fill: "#000000",
      padding: { x: 20, y: 10 },
      backgroundColor: "#ffffff"
    })
    .setScrollFactor(0)
    .setDepth(30);
/*
    this.input.on('pointerdown', function (pointer) {
      //console.log(pointer);
      //this.physics.moveTo(player, pointer.x, pointer.y , null, 1000);

      //this.add.image(pointer.x, pointer.y, 'logo');
        player.tweening = null;
        player.tweening = this.tweens.add({
        targets		: [ player ],
        x		: pointer.x,
        y: pointer.y,
        ease		: 'Linear',
        duration	: 3000,
        yoyo		: false,
        repeat		: 0, // -1 for infinite repeats
        onStart		: function () { console.log('onStart'); console.log(arguments); },
        onComplete	: function () { console.log('onComplete'); console.log(arguments); },
        onYoyo		: function () { console.log('onYoyo'); console.log(arguments); },
        onRepeat	: function () { console.log('onRepeat'); console.log(arguments); },
        callbackScope	: this
    });

  }, this);*/

    // Debug graphics
    this.input.keyboard.once("keydown_D", event => {
      
      // Turn on physics debugging to show player's hitbox
      this.physics.world.createDebugGraphic();

      // Create worldLayer collision graphic above the player, but below the help text
      const graphics = this.add
        .graphics()
        .setAlpha(0.75)
        .setDepth(20);
      worldLayer.renderDebug(graphics, {
        tileColor: null, // Color of non-colliding tiles
        collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
        faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
      });
    });

  }
  
  function update(time, delta) {

    var worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);

    // Rounds down to nearest tile
    //var pointerTileX = map.worldToTileX(worldPoint.x);
    //var pointerTileY = map.worldToTileY(worldPoint.y);
    //marker.x = map.tileToWorldX(pointerTileX);
    //marker.y = map.tileToWorldY(pointerTileY);
    //marker.setVisible(!checkCollision(pointerTileX,pointerTileY));

    //  only move when you click
    const speed = 175;
    const prevVelocity = player.body.velocity.clone();
  
    // Stop any previous movement from the last frame
    player.body.setVelocity(0);
  
    // Horizontal movement
    if (cursors.left.isDown) {
      player.body.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
      player.body.setVelocityX(speed);
    }
  
    // Vertical movement
    if (cursors.up.isDown) {
      player.body.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
      player.body.setVelocityY(speed);
    }
  
    // Normalize and scale the velocity so that player can't move faster along a diagonal
    player.body.velocity.normalize().scale(speed);
  
    // Update the animation last and give left/right animations precedence over up/down animations
    if (cursors.left.isDown) {
      player.anims.play("misa-left-walk", true);
    } else if (cursors.right.isDown) {
      player.anims.play("misa-right-walk", true);
    } else if (cursors.up.isDown) {
      player.anims.play("misa-up-walk", true);
    } else if (cursors.down.isDown) {
      player.anims.play("misa-down-walk", true);
    } else {
      player.anims.stop();
  
      // If we were moving, pick and idle frame to use
      if (prevVelocity.x < 0) player.setTexture("atlas", "misa-left");
      else if (prevVelocity.x > 0) player.setTexture("atlas", "misa-right");
      else if (prevVelocity.y < 0) player.setTexture("atlas", "misa-back");
      else if (prevVelocity.y > 0) player.setTexture("atlas", "misa-front");
    }
  }

checkCollision = function(x,y){
  //console.log(x,y);
  //console.log(worldLayer);
  var tile = worldLayer.getTileAt(x, y);
  //console.log(tile);
  if(tile != null){
    return tile.properties.collides == true;
  }else{
    return false;
  }
    
};

getTileID = function(x,y){
  //console.log(x,y);
  //console.log(worldLayer);
    var tile = worldLayer.getTileAt(x, y);
    //console.log(tile);
    return tile.index;
};

handleClick = function(pointer){
  var startPoint = Movement.GetStartPoint(player);
  console.log("start point");
    console.log(startPoint);

    var x = camera.scrollX + pointer.x;
    var y = camera.scrollY + pointer.y;
    var toX = Math.floor(x/8);
    var toY = Math.floor(y/8);
    var fromX = Math.floor(player.x/8);
    var fromY = Math.floor(player.y/8);

    console.log("end point");
    console.log(x,y);

    var distance = Phaser.Math.Distance.Between(x,y,startPoint.x,startPoint.y);
    console.log("distance ", distance);

    //figure out the angle of the movement
    var angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x,y,startPoint.x,startPoint.y));
    console.log("angle",angle);

    var direction = Movement.GetDirection(x,y,startPoint.x,startPoint.y,angle);
    console.log("direcion", direction);

    var duration = Movement.GetDuration(.15,direction, distance, 1.5);
    console.log("duration", duration);

    let pathLine = new Phaser.Curves.Line(new Phaser.Math.Vector2(player.x, player.y), new Phaser.Math.Vector2(pointer.x,pointer.y));
    console.log("Points on Line");
    
    allpoints = pathLine.getPoints(20);
    console.log(allpoints);
    var shortPath = [];
    var endpoint = allpoints[allpoints.length-1];
    for(let i=0; i < allpoints.length; i++){
      let currentPoint = {x:Math.floor(allpoints[i].x/8), y:Math.floor(allpoints[i].y/8)};
      let currentTile = map.getTileAt(Math.floor(allpoints[i].x/8),Math.floor(allpoints[i].y/8),false,worldLayer);
      shortPath.push(currentTile);
      console.log(allpoints[i],currentPoint,currentTile.collides);
      if(currentTile.collides){
        endpoint = allpoints[i-1];
        shortPath.pop();
        break;
      }
    }
    console.log(endpoint);

    if(player.tweening != null){
      player.tweening.stop();
      player.tweening = null;
    };
    
        player.tweening = scene.tweens.add({
        targets		: [ player ],
        x		: endpoint.x,
        y: endpoint.y,
        ease		: 'Linear',
        duration	: duration,
        yoyo		: false,
        repeat		: 0, // -1 for infinite repeats
        onStart		: function () { 
          console.log('onStart');
          console.log(arguments); 
          //player.anims.pause();
          player.anims.play("misa-" + direction + "-walk", true); 
        },
        onComplete	: function () { 
          console.log('onComplete'); 
          console.log(arguments); 
          //player.anims.stop();
  
          // If we were moving, pick and idle frame to use
          if(!player.tweening.isPlaying()){
            if (direction == "left") player.setTexture("atlas", "misa-left");
            else if (direction == "right") player.setTexture("atlas", "misa-right");
            else if (direction == "up") player.setTexture("atlas", "misa-back");
            else if (direction == "down") player.setTexture("atlas", "misa-front");
          }
        },
        onYoyo		: function () { console.log('onYoyo'); console.log(arguments); },
        onRepeat	: function () { console.log('onRepeat'); console.log(arguments);},
        callbackScope	: scene
    });

    //moveCharacter(shortPath);
    /*
    console.log('going from ('+fromX+','+fromY+') to ('+toX+','+toY+')');

    finder.findPath(fromX, fromY, toX, toY, function( path ) {
        if (path === null) {
            console.warn("Path was not found.");
        } else {
            console.log(path);
            moveCharacter(path);
        }
    });
    finder.calculate(); // don't forget, otherwise nothing happens
    */
};

moveCharacter = function(path){
  console.log("Path");
  console.log(path);
    // Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline
    player.anims.play("misa-left-walk", true);
    var tweens = [];
    for(var i = 0; i < path.length-1; i++){
        var ex = path[i+1].x;
        var ey = path[i+1].y;
        tweens.push({
            targets: player,
            x: {value: ex*map.tileWidth, duration: 50},
            y: {value: ey*map.tileHeight, duration: 50}
        });
    }

    scene.tweens.timeline({
        tweens: tweens
    });
};