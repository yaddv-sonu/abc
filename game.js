let scene, camera, renderer, model, employeeModel;
let mixer, employeeMixer;
const clock = new THREE.Clock();

// Add audio setup
const slapSound = new Audio('/slap.mp3');
const hurtSound = new Audio('/young-man-being-hurt-95628.mp3');

// Constants for model positions
const BOSS_POSITION     = { x: 3, y: 0,   z: 0    };
const EMPLOYEE_POSITION= { x: 2.75,    y: 0.12,z: -0.7 };

// Slap animation variables
let isSlapping = false;
let slapStartTime = 0;
const SLAP_DURATION = 0.5; // seconds
let empLeftShoulder, empRightShoulder;

// Names for boss and employee
let bossName = "Boss";
let employeeName = "Employee";

// === 1) Define your clipping plane ===
//   This plane keeps only the parts where Y >= CLIP_HEIGHT
const CLIP_HEIGHT = -0.8;  // adjust this to your model's chest height
const globalClipPlane = new THREE.Plane(
  /* normal */ new THREE.Vector3( 0, 1, 0 ),
  /* constant */ CLIP_HEIGHT
);

function createNameInputCard() {
  const card = document.createElement('div');
  card.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.95);
    padding: 30px 40px;
    border-radius: 15px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 1000;
    min-width: 320px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
  `;

  const title = document.createElement('h2');
  title.textContent = 'Enter Character Names';
  title.style.cssText = `
    margin: 0 0 25px 0;
    color: #333;
    font-size: 24px;
    text-align: center;
    font-family: Arial, sans-serif;
  `;
  card.appendChild(title);

  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    margin-bottom: 25px;
  `;

  const bossInput = document.createElement('input');
  bossInput.placeholder = 'Enter Boss Name';
  bossInput.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px 15px;
    margin-bottom: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
    box-sizing: border-box;
    outline: none;
  `;
  bossInput.addEventListener('focus', () => {
    bossInput.style.borderColor = '#4CAF50';
    bossInput.style.boxShadow = '0 0 0 3px rgba(76,175,80,0.1)';
  });
  bossInput.addEventListener('blur', () => {
    bossInput.style.borderColor = '#e0e0e0';
    bossInput.style.boxShadow = 'none';
  });
  inputContainer.appendChild(bossInput);

  const employeeInput = document.createElement('input');
  employeeInput.placeholder = 'Enter Employee Name';
  employeeInput.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
    box-sizing: border-box;
    outline: none;
  `;
  employeeInput.addEventListener('focus', () => {
    employeeInput.style.borderColor = '#4CAF50';
    employeeInput.style.boxShadow = '0 0 0 3px rgba(76,175,80,0.1)';
  });
  employeeInput.addEventListener('blur', () => {
    employeeInput.style.borderColor = '#e0e0e0';
    employeeInput.style.boxShadow = 'none';
  });
  inputContainer.appendChild(employeeInput);
  card.appendChild(inputContainer);

  const startButton = document.createElement('button');
  startButton.textContent = 'Start Game';
  startButton.style.cssText = `
    width: 100%;
    padding: 14px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  startButton.addEventListener('mouseover', () => {
    startButton.style.background = '#45a049';
    startButton.style.transform = 'translateY(-2px)';
    startButton.style.boxShadow = '0 5px 15px rgba(76,175,80,0.3)';
  });
  startButton.addEventListener('mouseout', () => {
    startButton.style.background = '#4CAF50';
    startButton.style.transform = 'translateY(0)';
    startButton.style.boxShadow = 'none';
  });
  startButton.onclick = () => {
    bossName = bossInput.value || 'Boss';
    employeeName = employeeInput.value || 'Employee';
    document.body.removeChild(card);
    init();
  };
  card.appendChild(startButton);

  // Add a subtle animation when the card appears
  card.style.opacity = '0';
  card.style.transform = 'translate(-50%, -48%)';
  document.body.appendChild(card);
  
  // Trigger animation
  requestAnimationFrame(() => {
    card.style.transition = 'all 0.3s ease-out';
    card.style.opacity = '1';
    card.style.transform = 'translate(-50%, -50%)';
  });
}

function init() {
  // --- scene & camera ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);

  camera = new THREE.PerspectiveCamera( 75, 420/340, 0.1, 1000 );
  camera.position.x = 5;
  camera.position.y = 2;

  // Add zoom animation
  const zoomAnimation = () => {
    const startFOV = 30; // Start with a narrow FOV (zoomed in)
    const endFOV = 75;   // End with the original FOV
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    function animateZoom() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      camera.fov = startFOV + (endFOV - startFOV) * easeProgress;
      camera.updateProjectionMatrix();
      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      }
    }
    animateZoom();
  };
  setTimeout(zoomAnimation, 0);

  // --- renderer with global clipping enabled ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(420, 340);
  renderer.localClippingEnabled = true;
  renderer.clippingPlanes = [ globalClipPlane ];

  // Place canvas in the new container
  const canvasContainer = document.querySelector('.game-canvas-container');
  canvasContainer.appendChild(renderer.domElement);

  

  // --- lights & controls ---
  scene.add( new THREE.AmbientLight(0xffffff, 0.5) );
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(5,5,5);
  scene.add(dir);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // --- model loader ---
  const loader = new THREE.GLTFLoader();

  function setupModelClipping(root) {
    root.traverse(obj => {
      if (obj.isMesh && obj.material) {
        // apply clipping plane to each material
        obj.material.clippingPlanes = [ globalClipPlane ];
        obj.material.clipIntersection = true;
        obj.material.needsUpdate = true;
      }
    });
  }

  // Load boss
  loader.load('/boss.glb', (gltf) => {
    model = gltf.scene;
    // you can still nudge it up/down if needed:
    model.position.set(BOSS_POSITION.x, BOSS_POSITION.y, BOSS_POSITION.z);
    setupModelClipping(model);
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    let leftShoulder, rightShoulder;
    model.traverse(o => {
      if (o.isBone) {
        if (o.name === 'Shoulder_L') leftShoulder = o;
        if (o.name === 'Shoulder_R') rightShoulder = o;
      }
    });
    if (leftShoulder)  leftShoulder.rotation.y = Math.PI/2;
    if (rightShoulder) rightShoulder.rotation.y = Math.PI/2;
    model.rotation.y = Math.PI;
  });

  // Load employee
  loader.load('/employee.glb', (gltf) => {
    employeeModel = gltf.scene;
    employeeModel.position.set(EMPLOYEE_POSITION.x, EMPLOYEE_POSITION.y, EMPLOYEE_POSITION.z);
    setupModelClipping(employeeModel);
    scene.add(employeeModel);

    employeeMixer = new THREE.AnimationMixer(employeeModel);
    employeeModel.traverse(o => {
      if (o.isBone) {
        if (o.name === 'Shoulder_L') empLeftShoulder = o;
        if (o.name === 'Shoulder_R') empRightShoulder = o;
      }
    });
    if (empLeftShoulder)  empLeftShoulder.rotation.y = Math.PI/2;
    if (empRightShoulder) empRightShoulder.rotation.y = Math.PI/2;
  });

  window.addEventListener('resize', onWindowResize);
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame( animate );

  const delta = clock.getDelta();
  if (mixer)          mixer.update(delta);
  if (employeeMixer)  employeeMixer.update(delta);

  // slap animation…
  if (isSlapping) {
    const elapsed = clock.getElapsedTime() - slapStartTime;
    const p = Math.min(elapsed / SLAP_DURATION, 1);
    if (empLeftShoulder) {
      empLeftShoulder.rotation.x = -Math.sin(p * Math.PI) * (Math.PI/2);
      empLeftShoulder.rotation.z = Math.sin(p * Math.PI) * 0.2;
    }
    if (p >= 1) {
      isSlapping = false;
      if (empLeftShoulder) {
        empLeftShoulder.rotation.x = 0;
        empLeftShoulder.rotation.z = Math.PI/2;
      }
      // Play slap sound first
      slapSound.currentTime = 0;
      slapSound.play();
      
      // Show slap effect
      const slapEffect = document.getElementById('slap-effect');
      if (model && slapEffect) {
        // Get boss's mouth position (approximate)
        const mouthPosition = new THREE.Vector3(
          BOSS_POSITION.x,
          BOSS_POSITION.y + 1.7, // Adjusted height to reach mouth level
          BOSS_POSITION.z - 0.1  // Slightly forward to match face position
        );
        
        // Project 3D position to screen coordinates
        mouthPosition.project(camera);
        const x = (mouthPosition.x * 0.5 + 0.5) * 420; // Use container width
        const y = (-(mouthPosition.y * 0.5) + 0.5) * 340; // Use container height
        
        // Position and show the effect
        slapEffect.style.left = `${x - 30}px`; // Center the effect (60px width)
        slapEffect.style.top = `${y - 30}px`; // Center the effect (60px height)
        slapEffect.style.display = 'block';
        slapEffect.style.opacity = '1';
        
        // Fade out animation
        setTimeout(() => {
          slapEffect.style.transition = 'opacity 0.3s ease-out';
          slapEffect.style.opacity = '0';
          setTimeout(() => {
            slapEffect.style.display = 'none';
          }, 300);
        }, 200);
      }
      
      // Play hurt sound after a small delay
      setTimeout(() => {
        hurtSound.currentTime = 0;
        hurtSound.play();
      }, 100); // 100ms delay between sounds
    }
  }

  renderer.render( scene, camera );
}

// Use new slap button
const slapBtn = document.getElementById('slap-btn');
slapBtn.onclick = () => {
  if (!isSlapping) {
    isSlapping = true;
    slapStartTime = clock.getElapsedTime();
    showFeedbackBar();
    animateProgressBar();
  }
};

// Feedback and boss bar logic
function showFeedbackBar() {
  const feedbackBar = document.getElementById('feedback-bar');
  const bossBar = document.getElementById('boss-bar');
  feedbackBar.textContent = bossName.toUpperCase() + ' JUST SLAPPED!';
  bossBar.textContent = employeeName.toUpperCase() + '!';
  feedbackBar.style.display = 'block';
  bossBar.style.display = 'block';
  feedbackBar.style.opacity = '1';
  bossBar.style.opacity = '1';
  setTimeout(() => {
    feedbackBar.style.transition = 'opacity 0.5s';
    bossBar.style.transition = 'opacity 0.5s';
    feedbackBar.style.opacity = '0';
    bossBar.style.opacity = '0';
    setTimeout(() => {
      feedbackBar.style.display = 'none';
      bossBar.style.display = 'none';
      feedbackBar.style.transition = '';
      bossBar.style.transition = '';
    }, 500);
  }, 1200);
}

// Progress bar logic
function animateProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = '0%';
  setTimeout(() => {
    progressBar.style.transition = 'width 0.4s';
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.style.transition = 'width 0.3s';
      progressBar.style.width = '0%';
    }, 600);
  }, 50);
}

// Start with the name input card
createNameInputCard();
