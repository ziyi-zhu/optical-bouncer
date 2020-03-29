var isMobile = {
  Android: function() {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function() {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function() {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function() {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function() {
    return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
  },
  any: function() {
    return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
  }
};

if (isMobile.any()) {
  document.getElementById('dot').style.display = 'block';
  document.getElementById('main').style.display = 'none';
  document.getElementById('canvas').style.display = 'none';
  document.body.style.background = '#333'
}

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies;
    Body = Matter.Body;
    Events = Matter.Events;
    Common = Matter.Common;

const windowWidth = document.documentElement.clientWidth;
const windowHeight = document.documentElement.clientHeight;

// create an engine
var engine = Engine.create();

// create a renderer
var render = Render.create({
  canvas: document.getElementById('canvas'),
  engine: engine,
  options: {
    width: windowWidth,
    height: windowHeight,
    pixelRatio: 1,
    background: '#333',
    wireframeBackground: '#333',
    hasBounds: true,
    enabled: true,
    wireframes: false,
    showSleeping: true,
    showDebug: false,
    showBroadphase: false,
    showBounds: false,
    showVelocity: false,
    showCollisions: false,
    showSeparations: false,
    showAxes: false,
    showPositions: false,
    showAngleIndicator: false,
    showIds: false,
    showShadows: false,
    showVertexNumbers: false,
    showConvexHulls: false,
    showInternalEdges: false,
    showMousePosition: false
  }
});

// run the engine
Engine.run(engine);

// run the renderer
Render.run(render);

let avgX = 0;
let avgY = 0;

let colliding = false;

// create two boxes and a ground
var ball = Bodies.circle(-windowWidth / 2, 0, 30, {
  render: { sprite: { texture: 'public/images/football.png' } },
  friction: 0.1
});
var player = Bodies.trapezoid(windowWidth / 2, windowHeight / 2 + 150, 150, 40, 1, {
  isStatic: true,
  render: { sprite: { texture: 'public/images/sneaker.png' } },
});
var target = Bodies.circle(windowWidth / 2, windowHeight / 2 - 150, 30, {
  isSensor: true,
  isStatic: true,
  render: { sprite: { texture: 'public/images/goal.png' } },
});
var bomb = Bodies.circle(-windowWidth / 2, 0, 30, {
  isSensor: true,
  isStatic: true,
  render: { sprite: { texture: 'public/images/bomb.png' } },
});
var ground = Bodies.rectangle(windowWidth / 2, windowHeight - 50, windowWidth * 2, 60, {
  isStatic: true,
  render: { fillStyle: '#2e2b44' } 
});

ball.restitution = 1;
player.restitution = 1;

const video = document.getElementById('video');
const actionButton = document.getElementById('actionButton');
const videoButton = document.getElementById('videoButton');
const FPS = 24;
let begin = Date.now();

let stream;
let streaming = false;

let videoMode = 0;
let score = 0;

let hue = 165;
let saturation = 204;
let value = 128;

function Sound(src) {
  this.sound = document.createElement('audio');
  this.sound.src = src;
  this.sound.setAttribute('preload', 'auto');
  this.sound.setAttribute('controls', 'none');
  this.sound.style.display = 'none';
  document.body.appendChild(this.sound);
  this.play = function(){
    this.sound.play();
  }
  this.stop = function(){
    this.sound.pause();
  }
}

let correctSound = new Sound('public/sounds/correct.wav');
let kickSound = new Sound('public/sounds/kick.wav');
let failSound = new Sound('public/sounds/fail.wav');
let explodeSound = new Sound('public/sounds/explode.wav');

function changeHue(newValue) {
  hue = parseInt(newValue * 1.8);
  updateColor();
}

function changeSaturation(newValue) {
  saturation = parseInt(newValue * 2.55);
  updateColor();
}

function changeValue(newValue) {
  value = parseInt(newValue * 2.55);
  updateColor();
}

function updateColor() {
  document.getElementById('color').style.fill = `hsl(${hue * 2},${saturation / 2.55}%,${value / 2.55}%)`;
  document.getElementById('colorCurrent').style.fill = `hsl(${hue * 2},${saturation / 2.55}%,${value / 2.55}%)`;
}

function resetGame() {
  Body.setPosition(ball, { x: windowWidth / 2, y: 100 });
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setPosition(target, { x: windowWidth / 2, y: windowHeight / 2 - 150 });
  Body.setPosition(bomb, { x: -windowWidth / 2, y: 0 });

  avgX = windowWidth / 2;
  avgY = windowHeight / 2 + 150;

  bomb.render.sprite.texture = 'public/images/bomb.png';
}

function gameOver() {
  document.getElementById('score').innerHTML = 'Score';
  document.getElementById('heading').innerHTML = `Final Score: ${score}`;
  document.getElementById('status').innerHTML = 'Try again.';
  score = 0;
}

function onOpenCvReady() {
  document.getElementById('status').innerHTML = 'Game is ready.';
  let src;
  let dst;
  let hsv;
  const cap = new cv.VideoCapture(video);

  actionButton.addEventListener('click', () => {
    if (streaming) {
      stop();
    } else {
      start();
    }
  });

  videoButton.addEventListener('click', () => {
    let canvasOutput = document.getElementById('canvasOutput');
    switch (videoMode) {
      case 0:
        videoMode = 1;
        canvasOutput.style.height = '192px';
        canvasOutput.style.width = '256px';
        canvasOutput.style.opacity = '1';
        videoButton.innerHTML = 'Background video: Window';
        break;
      case 1:
        videoMode = 2;
        canvasOutput.style.display = 'none';
        videoButton.innerHTML = 'Background video: Off';
        break;
      case 2:
        videoMode = 0;
        canvasOutput.style.display = 'block';
        canvasOutput.style.height = '100%';
        canvasOutput.style.width = '100%';
        canvasOutput.style.opacity = '0.05';
        videoButton.innerHTML = 'Background video: Full';
        break;
    }
  });

  Events.on(engine, 'beforeUpdate', function(event) { 
    if (streaming && (Date.now() - begin) > 1000 / FPS) {
      processVideo();
      Body.setPosition(player, { x: avgX, y: avgY });
      begin = Date.now();
    }
    if (colliding) {
      Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, {x: 0, y: -0.05});
      colliding = false;
    }
  });

  // an example of using collisionStart event on an engine
  Events.on(engine, 'collisionStart', function(event) {
    var pairs = event.pairs;

    // change object colours to show those starting a collision
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];

      if (pair.bodyA === ball || pair.bodyB === ball) {
        if (streaming) {
          if (pair.bodyA === target || pair.bodyB === target) {
            correctSound.play();
            score++;
            document.getElementById('score').innerHTML = `Score: ${score}`;
            let randX = Common.random(windowWidth * 0.3, windowWidth * 0.7);
            let randY = Common.random(windowHeight * 0.3, windowHeight * 0.5);
            Body.setPosition(target, {
              x: randX,
              y: randY
            });
            Body.setPosition(bomb, {
              x: randX + Common.random(windowWidth * 0.1, windowWidth * 0.3) * Common.choose([-1, 1]),
              y: randY + Common.random(windowHeight * 0.1, windowHeight * 0.3) * Common.choose([-1, 1])
            });
          } else if (pair.bodyA === player || pair.bodyB === player) {
            colliding = true;
            kickSound.play();
          } else if (pair.bodyA === ground || pair.bodyB === ground) {
            gameOver();
            failSound.play();
            stop();
          } else if (pair.bodyA === bomb || pair.bodyB === bomb) {
            bomb.render.sprite.texture = 'public/images/flame.png';
            gameOver();
            explodeSound.play();
            stop();
          }
        }
      }
    }
  });

  // add all of the bodies to the world
  World.add(engine.world, [ball, player, target, bomb, ground]);

  World.add(engine.world, [
    // walls
    Bodies.rectangle(windowWidth / 2, - 25, windowWidth, 50, { isStatic: true }),
    Bodies.rectangle(windowWidth + 25, windowHeight / 2, 50, windowHeight, { isStatic: true }),
    Bodies.rectangle(-25, windowHeight / 2, 50, windowHeight, { isStatic: true })
  ]);

  function start() {
    document.getElementById('main').style.display = 'none';
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(_stream => {
      stream = _stream;
      video.srcObject = stream;
      video.play();
      streaming = true;
      src = new cv.Mat(72, 96, cv.CV_8UC4);
      dst = new cv.Mat();
      hsv = new cv.Mat();
      resetGame();
    })
    .catch(err => console.log(`An error occurred: ${err}`));
  }

  function stop() {
    document.getElementById('main').style.display = 'block';
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    if (stream) {
      stream.getVideoTracks()[0].stop();
    }
    streaming = false;
    src.delete();
    dst.delete();
    hsv.delete();
  }

  function processVideo() {
    cap.read(src)

    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
    let low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hue - 15, saturation - 50, value, 0]);
    let high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hue + 15, 255, 255, 255]);
    cv.inRange(hsv, low, high, dst);

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let x = 0; x < dst.cols; x++) {
      for (let y = 0; y < dst.rows; y++) {
        if (dst.data[y * dst.cols + x] != 0) {
          sumX += x;
          sumY += y;
          count++; 
        }
      }
    }
    if (count != 0) {
      avgX = windowWidth - parseInt(sumX / count * windowWidth / dst.cols);
      avgY = parseInt(sumY / count * windowHeight / dst.rows);
    }
    cv.imshow('canvasOutput', dst);

    low.delete();
    high.delete();
  }
}