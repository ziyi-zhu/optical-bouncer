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
  document.body.style.background = "#333"

  function onOpenCvReady() {
    document.getElementById('status').innerHTML = 'Game is ready.';
  }
} else {
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
      hasBounds: false,
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
      showPositions: true,
      showAngleIndicator: false,
      showIds: false,
      showShadows: false,
      showVertexNumbers: false,
      showConvexHulls: false,
      showInternalEdges: false,
      showMousePosition: false
    }
  });

  // add mouse control
  let world = engine.world;
    let Mouse = Matter.Mouse;
    let MouseConstraint = Matter.MouseConstraint;
    let mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
          mouse: mouse,
          constraint: {
            stiffness: 0.2,
            render: {
              visible: false
            }
          }
        });

  World.add(world, mouseConstraint);

  // run the engine
  Engine.run(engine);

  // run the renderer
  Render.run(render);

  function onCvLoaded () {
    console.log('cv', cv);
    cv.onRuntimeInitialized = onReady;
  }

  const video = document.getElementById('video');
  const actionBtn = document.getElementById('actionBtn');
  const FPS = 30;

  let stream;
  let streaming = false;

  let avgX = windowWidth / 2;
  let avgY = windowHeight / 2;

  let colliding = false;

  // create two boxes and a ground
  var bodyA = Bodies.circle(-windowWidth / 2, 0, 40, {
    render: { fillStyle: '#0496ff' } 
  });
  var bodyB = Bodies.trapezoid(windowWidth / 2, windowHeight / 2 + 150, 200, 40, 1, {
    isStatic: true,
    render: { fillStyle: '#d81159' } 
  });
  var ground = Bodies.rectangle(windowWidth / 2, windowHeight - 50, windowWidth, 60, {
    isStatic: true,
    render: { fillStyle: '#2e2b44' } 
  });

  bodyA.restitution = 1;
  bodyB.restitution = 1;

  function onOpenCvReady() {
    document.getElementById('status').innerHTML = 'Game is ready.';
    let src;
    let dst;
    const cap = new cv.VideoCapture(video);

    actionBtn.addEventListener('click', () => {
      if (streaming) {
        stop();
        actionBtn.textContent = 'Start';
      } else {
        start();
        actionBtn.textContent = 'Stop';
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

        if (!pair.bodyA.isStatic || !pair.bodyB.isStatic) {
          colliding = true;
        }
      }
    });

    // add all of the bodies to the world
    World.add(engine.world, [bodyA, bodyB, ground]);

    document.body.addEventListener('click', (event) => {
      Body.setPosition(bodyA, { x: windowWidth / 2, y: 0 });
      Body.setVelocity(bodyA, { x: 0, y: 0 });
    });

    function start () {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(_stream => {
        stream = _stream;
        console.log('stream', stream);
        video.srcObject = stream;
        video.play();
        streaming = true;
        src = new cv.Mat(225, 300, cv.CV_8UC4);
        dst = new cv.Mat(225, 300, cv.CV_8UC1);
        setTimeout(processVideo, 0)
      })
      .catch(err => console.log(`An error occurred: ${err}`));
    }

    function stop () {
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
        return;
      }
      const begin = Date.now();

      cap.read(src)

      let low = new cv.Mat(src.rows, src.cols, src.type(), [150, 0, 0, 0]);
      let high = new cv.Mat(src.rows, src.cols, src.type(), [255, 100, 50, 255]);
      cv.inRange(src, low, high, dst);

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

      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
      cv.imshow('canvasOutput', dst);

      const delay = 1000 / FPS - (Date.now() - begin);
      setTimeout(processVideo, delay);
    }
  }
}