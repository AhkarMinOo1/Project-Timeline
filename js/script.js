// Initialize Three.js scene
let scene, camera, renderer, waveObjects, raycaster, mouse;
let timelineItems, achievementItems;
const colors = [
  new THREE.Color(0xFF4F18), // primary
  new THREE.Color(0xFF7046), // primary-light
  new THREE.Color(0xFF9174), // phase3
  new THREE.Color(0xFFB2A0), // phase4
  new THREE.Color(0xFFD3CB)  // phase5
];

// Initialize the scene once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  animateOnScroll();
  addInteractivity();
});

// Set up Three.js environment
function initThreeJS() {
  // Create container for Three.js canvas
  const container = document.createElement('div');
  container.id = 'canvas-container';
  document.body.prepend(container);
  
  // Initialize scene
  scene = new THREE.Scene();
  
  // Set up camera
  const fov = 75;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 50;
  
  // Set up renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  // Create geometric waves instead of particles
  createWaves();
  
  // Initialize raycaster for interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  // Add window resize handler
  window.addEventListener('resize', onWindowResize);
  
  // Start animation loop
  animate();
}

// Create flowing geometric waves
function createWaves() {
  waveObjects = new THREE.Group();
  scene.add(waveObjects);
  
  // Create multiple wave planes
  for (let i = 0; i < 5; i++) {
    createWavePlane(i);
  }
  
  // Add some floating geometric objects for depth
  createFloatingObjects();
}

// Create a single wave plane
function createWavePlane(index) {
  const segmentsX = 50;
  const segmentsY = 50;
  const size = 80;
  
  // Create a plane geometry
  const geometry = new THREE.PlaneGeometry(size, size, segmentsX, segmentsY);
  
  // Create custom shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: colors[index] },
      opacity: { value: 0.2 + (index * 0.01) }
    },
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        
        // Create wave effect
        float speed = 0.5 + (${index.toFixed(1)} * 0.1);
        float amplitude = 2.0 - (${index.toFixed(1)} * 0.3);
        float frequency = 0.3 + (${index.toFixed(1)} * 0.05);
        
        vec3 pos = position;
        pos.z += sin(pos.x * frequency + time * speed) * amplitude;
        pos.z += cos(pos.y * frequency + time * speed) * amplitude;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        // Create gradient from center
        float dist = distance(vUv, vec2(0.5, 0.5));
        float alpha = opacity * (1.0 - smoothstep(0.2, 0.8, dist));
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const wave = new THREE.Mesh(geometry, material);
  wave.rotation.x = -Math.PI / 3; // Tilt the plane
  wave.position.z = -10 - (index * 5); // Stack planes
  wave.position.y = -10 + (index * 3); // Offset each plane
  waveObjects.add(wave);
}

// Create additional floating geometric objects
function createFloatingObjects() {
  // Create geometric elements that float around
  const shapes = [
    new THREE.TorusGeometry(5, 1, 16, 50),
    new THREE.OctahedronGeometry(4, 0),
    new THREE.TetrahedronGeometry(4, 0),
    new THREE.IcosahedronGeometry(4, 0),
    new THREE.TorusKnotGeometry(3, 1, 64, 8, 2, 3)
  ];
  
  // Create 10 random floating objects
  for (let i = 0; i < 10; i++) {
    const shapeIndex = Math.floor(Math.random() * shapes.length);
    const colorIndex = Math.floor(Math.random() * colors.length);
    
    const material = new THREE.MeshBasicMaterial({
      color: colors[colorIndex],
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    const object = new THREE.Mesh(shapes[shapeIndex], material);
    
    // Random positions
    const spread = 60;
    object.position.x = (Math.random() - 0.5) * spread;
    object.position.y = (Math.random() - 0.5) * spread;
    object.position.z = (Math.random() - 0.5) * 20 - 10;
    
    // Random rotation
    object.rotation.x = Math.random() * Math.PI;
    object.rotation.y = Math.random() * Math.PI;
    
    // Store initial position for animation
    object.userData = {
      originalPosition: object.position.clone(),
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      },
      movementSpeed: 0.01 + Math.random() * 0.01,
      movementOffset: Math.random() * Math.PI * 2
    };
    
    waveObjects.add(object);
  }
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate the entire group gently
  if (waveObjects) {
    waveObjects.rotation.y += 0.001;
    
    // Update each wave's time uniform
    waveObjects.children.forEach(child => {
      if (child.material && child.material.uniforms && child.material.uniforms.time) {
        child.material.uniforms.time.value += 0.01;
      }
      
      // Animate floating objects
      if (child.userData && child.userData.originalPosition) {
        const data = child.userData;
        
        // Apply rotation
        child.rotation.x += data.rotationSpeed.x;
        child.rotation.y += data.rotationSpeed.y;
        child.rotation.z += data.rotationSpeed.z;
        
        // Apply floating motion
        const time = Date.now() * 0.001;
        child.position.y = data.originalPosition.y + Math.sin(time * data.movementSpeed + data.movementOffset) * 5;
        child.position.x = data.originalPosition.x + Math.cos(time * data.movementSpeed + data.movementOffset) * 5;
      }
    });
  }
  
  renderer.render(scene, camera);
}

// Animate elements as they come into view
function animateOnScroll() {
  timelineItems = document.querySelectorAll('.timeline-content');
  achievementItems = document.querySelectorAll('.achievement-item');
  
  // Add observer for timeline items
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  }, { threshold: 0.2 });
  
  // Observe all timeline and achievement items
  timelineItems.forEach(item => {
    observer.observe(item);
    item.classList.add('hidden');
  });
  
  achievementItems.forEach(item => {
    observer.observe(item);
    item.classList.add('hidden');
  });
}

// Add interactivity to timeline elements
function addInteractivity() {
  // Add mousemove effect to header
  const header = document.querySelector('header');
  header.addEventListener('mousemove', (e) => {
    const xPos = (e.clientX / window.innerWidth - 0.5) * 10;
    const yPos = (e.clientY / window.innerHeight - 0.5) * 10;
    
    // Move wave objects based on mouse position
    if (waveObjects) {
      waveObjects.rotation.x = -yPos * 0.01 - Math.PI / 6;
      waveObjects.rotation.y = -xPos * 0.01;
    }
  });
  
  // Add click effect for timeline nodes
  const timelineNodes = document.querySelectorAll('.timeline-item::after');
  timelineNodes.forEach(node => {
    node.addEventListener('click', createTimelineNodeEffect);
  });
  
  // Add mouse move effect on achievement items
  const achievementItems = document.querySelectorAll('.achievement-item');
  achievementItems.forEach(item => {
    item.addEventListener('mousemove', (e) => {
      const box = e.currentTarget.getBoundingClientRect();
      const xPos = (e.clientX - box.left) / box.width - 0.5;
      const yPos = (e.clientY - box.top) / box.height - 0.5;
      
      e.currentTarget.style.transform = `
        translateY(-5px)
        rotate3d(${-yPos * 2}, ${xPos * 2}, 0, ${Math.sqrt(xPos*xPos + yPos*yPos) * 10}deg)
      `;
    });
    
    item.addEventListener('mouseleave', (e) => {
      e.currentTarget.style.transform = '';
    });
  });
}

// Create effect when timeline node is clicked
function createTimelineNodeEffect(e) {
  // Find closest timeline item
  const timelineItem = e.target.closest('.timeline-item');
  if (!timelineItem) return;
  
  // Create ripple effect
  const ripple = document.createElement('div');
  ripple.classList.add('ripple');
  timelineItem.appendChild(ripple);
  
  // Remove ripple after animation completes
  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

// Add mouse tracking for parallax effect
document.addEventListener('mousemove', (event) => {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update camera position slightly based on mouse for parallax effect
  if (camera) {
    camera.position.x = mouse.x * 5;
    camera.position.y = mouse.y * 5;
  }
}); 