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

let avgX = windowWidth / 2;
let avgY = windowHeight / 2;

let colliding = false;

// create two boxes and a ground
var bodyA = Bodies.circle(-windowWidth / 2, 0, 40, {
  render: { fillStyle: '#0496ff' } 
});
var bodyB = Bodies.trapezoid(windowWidth / 2, windowHeight / 2 + 150, 100, 40, 1, {
  isStatic: true,
  render: { fillStyle: '#d81159' } 
});
var bodyC = Bodies.circle(windowWidth / 2, windowHeight / 2 - 150, 40, {
  isSensor: true,
  isStatic: true,
  render: { fillStyle: '#ffbc42' } 
});
var ground = Bodies.rectangle(windowWidth / 2, windowHeight - 50, windowWidth * 2, 60, {
  isStatic: true,
  render: { fillStyle: '#2e2b44' } 
});

bodyA.restitution = 1;
bodyB.restitution = 1;

const video = document.getElementById('video');
const actionBtn = document.getElementById('actionBtn');
const videoBtn = document.getElementById('videoBtn');
const FPS = 24;

let stream;
let streaming = false;

let videoMode = 0;
let score = 0;

function onOpenCvReady() {
  document.getElementById('status').innerHTML = 'Game is ready.';
  let src;
  let dst;
  let hsv;
  const cap = new cv.VideoCapture(video);

  actionBtn.addEventListener('click', () => {
    if (streaming) {
      stop();
    } else {
      start();
    }
  });

  videoBtn.addEventListener('click', () => {
    let canvasOutput = document.getElementById('canvasOutput');
    switch (videoMode) {
      case 0:
        videoMode = 1;
        canvasOutput.style.height = '225px';
        canvasOutput.style.width = '300px';
        canvasOutput.style.opacity = '1';
        videoBtn.innerHTML = 'Background video: Window';
        break;
      case 1:
        videoMode = 2;
        canvasOutput.style.display = 'none';
        videoBtn.innerHTML = 'Background video: Off';
        break;
      case 2:
        videoMode = 0;
        canvasOutput.style.display = 'block';
        canvasOutput.style.height = '100%';
        canvasOutput.style.width = '100%';
        canvasOutput.style.opacity = '0.05';
        videoBtn.innerHTML = 'Background video: Full';
        break;
    }
  });

  Events.on(engine, 'beforeUpdate', function(event) {
    if (colliding) {
      Body.applyForce(bodyA, { x: bodyA.position.x, y: bodyA.position.y }, {x: 0, y: -0.1});
      colliding = false;
    }
  });

  // an example of using collisionStart event on an engine
  Events.on(engine, 'collisionStart', function(event) {
    var pairs = event.pairs;

    // change object colours to show those starting a collision
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];

      if (pair.bodyA.id == 1 || pair.bodyB.id == 1) {
        colliding = true;
        if (streaming) {
          if (pair.bodyA.id == 3 || pair.bodyB.id == 3) {
            colliding = false;
            score++;
            document.getElementById('score').innerHTML = `Score: ${score}`;
            Body.setPosition(bodyC, {
              x: Math.floor(Math.random() * windowWidth / 2 + windowWidth / 4),
              y: Math.floor(Math.random() * windowHeight / 2 + windowHeight / 4),
            });
          } else if (pair.bodyA.id == 4 || pair.bodyB.id == 4) {
            document.getElementById('score').innerHTML = 'Score';
            document.getElementById('heading').innerHTML = `Final Score: ${score}`;
            document.getElementById('status').innerHTML = 'Try again.';
            score = 0;
            stop();
          }
        }
      }
    }
  });

  // add all of the bodies to the world
  World.add(engine.world, [bodyA, bodyB, bodyC, ground]);

  // document.body.addEventListener('click', (event) => {
  //   Body.setPosition(bodyA, { x: windowWidth / 2, y: 0 });
  //   Body.setVelocity(bodyA, { x: 0, y: 0 });
  // });

  function start () {
    document.getElementById('main').style.display = 'none';
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(_stream => {
      stream = _stream;
      video.srcObject = stream;
      video.play();
      streaming = true;
      src = new cv.Mat(225, 300, cv.CV_8UC4);
      dst = new cv.Mat();
      hsv = new cv.Mat();
      setTimeout(processVideo, 0)

      Body.setPosition(bodyA, { x: windowWidth / 2, y: 0 });
      Body.setVelocity(bodyA, { x: 0, y: 0 });
      Body.setPosition(bodyC, { x: windowWidth / 2, y: windowHeight / 2 - 150 });
    })
    .catch(err => console.log(`An error occurred: ${err}`));
  }

  function stop () {
    document.getElementById('main').style.display = 'block';
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    if (stream) {
      stream.getVideoTracks()[0].stop();
    }
    streaming = false;
  }

  function processVideo () {
    if (!streaming) {
      src.delete();
      dst.delete();
      hsv.delete();
      return;
    }
    const begin = Date.now();

    cap.read(src)

    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
    let low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [150, 20, 180, 0]);
    let high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 255, 255, 255]);
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

    Body.setPosition(bodyB, { x: avgX, y: avgY });

    cv.imshow('canvasOutput', dst);

    const delay = 1000 / FPS - (Date.now() - begin);
    setTimeout(processVideo, delay);

    low.delete();
    high.delete();
  }
}