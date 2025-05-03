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
    background: rgba(255, 255, 255, 0.98);
    padding: clamp(16px, 4vw, 40px);
    border-radius: clamp(16px, 4vw, 24px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    z-index: 1000;
    width: clamp(280px, 85vw, 400px);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.3);
    animation: popupFadeIn 0.4s ease-out;
    max-height: 90vh;
    overflow-y: auto;
  `;

  // Add keyframe animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes popupFadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, -48%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
    @keyframes inputFocus {
      from { transform: scale(1); }
      to { transform: scale(1.02); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .error-message {
      color: #ff5252;
      font-size: clamp(11px, 2.5vw, 12px);
      margin-top: 4px;
      display: none;
      animation: shake 0.3s ease-in-out;
      font-family: Arial, sans-serif;
    }
    .input-error {
      border-color: #ff5252 !important;
      animation: shake 0.3s ease-in-out;
    }
    @media (max-height: 600px) {
      .input-card {
        padding: 12px !important;
      }
      .input-title {
        margin-bottom: 12px !important;
        font-size: 20px !important;
      }
      .input-container {
        margin-bottom: 12px !important;
        gap: 8px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const title = document.createElement('h2');
  title.textContent = 'Enter Character Names';
  title.style.cssText = `
    margin: 0 0 clamp(16px, 4vw, 30px) 0;
    color: #333;
    font-size: clamp(18px, 4vw, 28px);
    text-align: center;
    font-family: 'Fredoka One', Arial, sans-serif;
    background: linear-gradient(45deg, #ff5252, #ff9800);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    line-height: 1.2;
  `;
  card.appendChild(title);

  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    margin-bottom: clamp(16px, 4vw, 30px);
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 3vw, 15px);
  `;

  const createInput = (placeholder) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      margin-bottom: 2px;
    `;

    const input = document.createElement('input');
    input.placeholder = placeholder;
    input.style.cssText = `
      display: block;
      width: 100%;
      padding: clamp(10px, 2.5vw, 16px);
      border: 2px solid #e0e0e0;
      border-radius: clamp(8px, 2vw, 12px);
      font-size: clamp(14px, 3vw, 16px);
      transition: all 0.3s ease;
      box-sizing: border-box;
      outline: none;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      font-family: Arial, sans-serif;
    `;

    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'Please enter a name';
    errorMessage.style.cssText = `
      color: #ff5252;
      font-size: clamp(11px, 2.5vw, 12px);
      margin-top: 4px;
      display: none;
      font-family: Arial, sans-serif;
    `;

    input.addEventListener('focus', () => {
      input.style.borderColor = '#ff5252';
      input.style.boxShadow = '0 0 0 3px rgba(255,82,82,0.1)';
      input.style.animation = 'inputFocus 0.3s forwards';
      errorMessage.style.display = 'none';
      input.classList.remove('input-error');
    });

    input.addEventListener('blur', () => {
      if (!input.value.trim()) {
        input.style.borderColor = '#e0e0e0';
        input.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      }
      input.style.animation = 'none';
    });

    wrapper.appendChild(input);
    wrapper.appendChild(errorMessage);
    return { wrapper, input, errorMessage };
  };

  const bossInput = createInput('Enter Boss Name');
  const employeeInput = createInput('Enter Employee Name');

  inputContainer.appendChild(bossInput.wrapper);
  inputContainer.appendChild(employeeInput.wrapper);
  card.appendChild(inputContainer);

  const startButton = document.createElement('button');
  startButton.textContent = 'Start Game';
  startButton.style.cssText = `
    width: 100%;
    padding: clamp(12px, 3vw, 18px);
    background: linear-gradient(45deg, #ff5252, #ff9800);
    color: white;
    border: none;
    border-radius: clamp(8px, 2vw, 12px);
    font-size: clamp(14px, 3vw, 18px);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: 'Fredoka One', Arial, sans-serif;
    box-shadow: 0 4px 15px rgba(255,82,82,0.3);
    margin-top: clamp(8px, 2vw, 16px);
  `;

  startButton.addEventListener('mouseover', () => {
    startButton.style.transform = 'translateY(-2px)';
    startButton.style.boxShadow = '0 6px 20px rgba(255,82,82,0.4)';
  });

  startButton.addEventListener('mouseout', () => {
    startButton.style.transform = 'translateY(0)';
    startButton.style.boxShadow = '0 4px 15px rgba(255,82,82,0.3)';
  });

  startButton.addEventListener('mousedown', () => {
    startButton.style.transform = 'translateY(1px)';
  });

  startButton.addEventListener('mouseup', () => {
    startButton.style.transform = 'translateY(-2px)';
  });

  startButton.onclick = () => {
    let isValid = true;

    // Validate boss name
    if (!bossInput.input.value.trim()) {
      bossInput.input.classList.add('input-error');
      bossInput.errorMessage.style.display = 'block';
      isValid = false;
    }

    // Validate employee name
    if (!employeeInput.input.value.trim()) {
      employeeInput.input.classList.add('input-error');
      employeeInput.errorMessage.style.display = 'block';
      isValid = false;
    }

    if (isValid) {
      bossName = bossInput.input.value.trim();
      employeeName = employeeInput.input.value.trim();
      
      // Add fade out animation for the input card
      card.style.animation = 'popupFadeOut 0.3s forwards';
      
      setTimeout(() => {
        document.body.removeChild(card);
        
        // Show game wrapper with fade-in animation
        const gameWrapper = document.getElementById('game-wrapper');
        gameWrapper.classList.add('visible');
        
        // Initialize the game
        init();
      }, 300);
    }
  };

  card.appendChild(startButton);

  // Add fade out animation
  style.textContent += `
    @keyframes popupFadeOut {
      from {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -48%);
      }
    }
  `;

  document.body.appendChild(card);
}

function init() {
  // --- scene & camera ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);

  // Get container dimensions
  const container = document.querySelector('.game-canvas-container');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  camera = new THREE.PerspectiveCamera(75, containerWidth/containerHeight, 0.1, 1000);
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
  renderer.setSize(containerWidth, containerHeight);
  renderer.localClippingEnabled = true;
  renderer.clippingPlanes = [ globalClipPlane ];

  // Place canvas in the container
  container.appendChild(renderer.domElement);

  

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
  let modelsLoaded = 0;
  const totalModels = 2; // We're loading 2 models

  function setupModelClipping(root) {
    root.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.clippingPlanes = [ globalClipPlane ];
        obj.material.clipIntersection = true;
        obj.material.needsUpdate = true;
      }
    });
  }

  function checkAllModelsLoaded() {
    modelsLoaded++;
    if (modelsLoaded === totalModels) {
      // All models are loaded, hide the loading overlay
      const loadingOverlay = document.getElementById('loading-overlay');
      loadingOverlay.style.opacity = '0';
      loadingOverlay.style.transition = 'opacity 0.5s ease-out';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }
  }

  // Load boss
  loader.load('/boss.glb', (gltf) => {
    model = gltf.scene;
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
    checkAllModelsLoaded();
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
    checkAllModelsLoaded();
  });

  window.addEventListener('resize', onWindowResize);
  animate();
}

function onWindowResize() {
  const container = document.querySelector('.game-canvas-container');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  camera.aspect = containerWidth / containerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerWidth, containerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer)          mixer.update(delta);
  if (employeeMixer)  employeeMixer.update(delta);

  // slap animation...
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
          BOSS_POSITION.y + 1.7,
          BOSS_POSITION.z - 0.1
        );
        
        // Project 3D position to screen coordinates
        mouthPosition.project(camera);
        const container = document.querySelector('.game-canvas-container');
        const x = (mouthPosition.x * 0.5 + 0.5) * container.clientWidth;
        const y = (-(mouthPosition.y * 0.5) + 0.5) * container.clientHeight;
        
        // Position and show the effect
        slapEffect.style.left = `${x - 30}px`;
        slapEffect.style.top = `${y - 30}px`;
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
      }, 100);
    }
  }

  renderer.render(scene, camera);
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
