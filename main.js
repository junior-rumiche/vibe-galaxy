// Toggle para el panel de configuración
document.getElementById('toggle_settings').addEventListener('click', function () {
    document.getElementById('controls_panel').classList.toggle('panel-visible');
});

/**
 * @file Archivo principal para el simulador de galaxias 3D con Three.js.
 * @author Roo
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generate_galaxy } from './galaxy.js'; // Asumimos que galaxy.js será actualizado para 3D

// --- Elementos del DOM para Controles (igual que antes) ---
const num_stars_slider = document.getElementById('num_stars_slider');
const num_stars_value_span = document.getElementById('num_stars_value');
const num_arms_slider = document.getElementById('num_arms_slider');
const num_arms_value_span = document.getElementById('num_arms_value');
const arm_spread_slider = document.getElementById('arm_spread_slider');
const arm_spread_value_span = document.getElementById('arm_spread_value');
const rotation_factor_slider = document.getElementById('rotation_factor_slider');
const rotation_factor_value_span = document.getElementById('rotation_factor_value');
const core_concentration_slider = document.getElementById('core_concentration_slider');
const core_concentration_value_span = document.getElementById('core_concentration_value');
const haze_factor_slider = document.getElementById('haze_factor_slider');
const haze_factor_value_span = document.getElementById('haze_factor_value');
const regenerate_button = document.getElementById('regenerate_button');
const capture_button = document.getElementById('capture_button');

// --- Variables de Configuración (igual que antes) ---
let current_num_stars = num_stars_slider ? parseInt(num_stars_slider.value) : 2000;
let current_num_arms = num_arms_slider ? parseInt(num_arms_slider.value) : 10;
let current_arm_spread = arm_spread_slider ? parseFloat(arm_spread_slider.value) : 0.1;
let current_rotation_factor = rotation_factor_slider ? parseFloat(rotation_factor_slider.value) : 7.0;
let current_core_concentration = core_concentration_slider ? parseFloat(core_concentration_slider.value) : 3.0;
let current_haze_factor = haze_factor_slider ? parseFloat(haze_factor_slider.value) / 100 : 30;

// --- Variables Globales de Three.js ---
let scene, camera, renderer, controls;
let star_points = null; // Objeto Points para las estrellas
let geometry = null; // BufferGeometry para las estrellas
let material = null; // PointsMaterial para las estrellas
let nebula_group = null; // Grupo para contener los sprites de nebulosas
let nebula_material = null; // Material para las nebulosas

/**
 * Inicializa la escena 3D, cámara, renderizador y controles.
 */
function init_three() {
    // Escena
    scene = new THREE.Scene();

    // Cámara
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 3000; // Aumentar aún más para que quepa la Sky Sphere
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 1300; // Posición inicial de la cámara
    camera.position.y = 150; // Ligeramente elevada
    camera.lookAt(scene.position); // Mirar al centro de la escena

    // Renderizador
    renderer = new THREE.WebGLRenderer({
        antialias: true, // Suavizado
        preserveDrawingBuffer: true // Necesario para capturas de pantalla
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Mejor calidad en pantallas HiDPI
    renderer.setClearColor(0x000000, 1); // Fondo negro
    document.body.appendChild(renderer.domElement); // Añadir canvas al DOM

    // Controles Orbitales
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Movimiento suave (inercia)
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Panear relativo al plano XZ
    controls.enableZoom = false; // Deshabilitar zoom
    controls.minDistance = 10; // Zoom mínimo (no tendrá efecto)
    controls.maxDistance = 1500; // Zoom máximo (no tendrá efecto)
    controls.zoomSpeed = 0.5; // Ajustar velocidad de zoom (no tendrá efecto)
    controls.rotateSpeed = 0.3; // Ajustar velocidad de rotación
    controls.panSpeed = 0.5; // Ajustar velocidad de paneo

    // Crear textura para las estrellas (círculo difuso)
    const star_texture = create_star_texture();

    // Material para las estrellas (puntos con textura)
    material = new THREE.PointsMaterial({
        map: star_texture, // Aplicar la textura circular
        size: 3.5,         // Aumentar tamaño base para que la textura sea visible
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,      // Ligeramente más opaco
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    // Crear geometría inicial (vacía)
    geometry = new THREE.BufferGeometry();
    star_points = new THREE.Points(geometry, material);
    scene.add(star_points);

    // Crear grupo para nebulosas
    nebula_group = new THREE.Group();
    scene.add(nebula_group);

    // Crear material para nebulosas (se creará una vez)
    nebula_material = new THREE.SpriteMaterial({
        map: create_nebula_texture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.15 // Nebulosas más sutiles
    });

    // --- Crear Sky Sphere (Fondo Estrellado) ---
    const sky_sphere_radius = 1800; // Debe ser mayor que maxDistance de OrbitControls y far plane
    const sky_sphere_geometry = new THREE.SphereGeometry(sky_sphere_radius, 64, 32); // Más segmentos para suavidad
    const sky_sphere_texture = create_sky_sphere_texture(2048, 10000); // Textura grande con muchas estrellas
    const sky_sphere_material = new THREE.MeshBasicMaterial({
        map: sky_sphere_texture,
        side: THREE.BackSide // Mostrar textura en el interior
    });
    const sky_sphere = new THREE.Mesh(sky_sphere_geometry, sky_sphere_material);
    scene.add(sky_sphere);

    // Generar la galaxia inicial
    regenerate();

    // Listener para redimensionar ventana
    window.addEventListener('resize', on_window_resize);

    // Listeners para controles de UI (igual que antes)
    setup_ui_listeners();

    // Iniciar bucle de animación
    animate();
}

/**
 * Configura los listeners para los controles de la UI.
 */
function setup_ui_listeners() {
    if (num_stars_slider && num_stars_value_span) {
        num_stars_slider.addEventListener('input', (e) => {
            current_num_stars = parseInt(e.target.value);
            num_stars_value_span.textContent = current_num_stars;
        });
    }
    if (num_arms_slider && num_arms_value_span) {
        num_arms_slider.addEventListener('input', (e) => {
            current_num_arms = parseInt(e.target.value);
            num_arms_value_span.textContent = current_num_arms;
        });
    }
    if (arm_spread_slider && arm_spread_value_span) {
        arm_spread_slider.addEventListener('input', (e) => {
            current_arm_spread = parseFloat(e.target.value);
            arm_spread_value_span.textContent = current_arm_spread.toFixed(2);
        });
    }
    if (rotation_factor_slider && rotation_factor_value_span) {
        rotation_factor_slider.addEventListener('input', (e) => {
            current_rotation_factor = parseFloat(e.target.value);
            rotation_factor_value_span.textContent = current_rotation_factor.toFixed(1);
        });
    }
    if (core_concentration_slider && core_concentration_value_span) {
        core_concentration_slider.addEventListener('input', (e) => {
            current_core_concentration = parseFloat(e.target.value);
            core_concentration_value_span.textContent = current_core_concentration.toFixed(1);
        });
    }
    if (haze_factor_slider && haze_factor_value_span) {
        haze_factor_slider.addEventListener('input', (e) => {
            const haze_percentage = parseInt(e.target.value);
            current_haze_factor = haze_percentage / 100.0;
            haze_factor_value_span.textContent = haze_percentage;
        });
    }
    if (regenerate_button) {
        regenerate_button.addEventListener('click', regenerate);
    }
    if (capture_button) {
        capture_button.addEventListener('click', capture_canvas_3d);
    }
}

/**
 * Maneja el redimensionamiento de la ventana.
 */
function on_window_resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Bucle de animación principal.
 */
function animate() {
    requestAnimationFrame(animate);

    // Actualizar controles orbitales (para damping)
    controls.update();

    // (Opcional) Rotación automática de la galaxia si se desea
    // if (star_points) {
    //     star_points.rotation.y += 0.0005; // Rotación lenta sobre el eje Y
    // }

    // Renderizar la escena
    renderer.render(scene, camera);
}

/**
 * Regenera la galaxia con los parámetros actuales y actualiza la geometría de Three.js.
 */
function regenerate() {
    console.log(`Regenerando galaxia 3D con config:`, { /* ... config ... */ });

    // Generar datos de estrellas (esperando que galaxy.js devuelva { positions: Float32Array, colors: Float32Array })
    const galaxy_data = generate_galaxy(
        current_num_stars,
        current_num_arms,
        current_arm_spread,
        current_rotation_factor,
        current_core_concentration,
        current_haze_factor
    );

    if (!galaxy_data || !galaxy_data.positions || !galaxy_data.colors) {
        console.error("generate_galaxy no devolvió los datos esperados (positions, colors).");
        return;
    }

    // Actualizar atributos de la geometría existente
    // Es más eficiente actualizar que crear nueva geometría cada vez
    geometry.setAttribute('position', new THREE.BufferAttribute(galaxy_data.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(galaxy_data.colors, 3));

    // Indicar a Three.js que los atributos necesitan actualización
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    // Calcular bounding sphere para optimizaciones de frustum culling
    geometry.computeBoundingSphere();

    console.log(`Geometría de estrellas actualizada con ${galaxy_data.positions.length / 3} estrellas.`);

    // --- Añadir/Actualizar Nebulosas ---
    add_nebulas(galaxy_data.positions); // Pasar posiciones de estrellas para ubicar nebulosas cerca
}


/**
 * Captura el contenido actual del canvas WebGL y lo descarga como imagen PNG.
 */
function capture_canvas_3d() {
    try {
        const data_url = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data_url;
        link.download = `galaxia_3d_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Captura de pantalla 3D guardada.");
    } catch (e) {
        console.error("Error al capturar el canvas:", e);
        // Puede fallar si el origen del canvas está "tainted" (ej. texturas de otros dominios sin CORS)
        // o si preserveDrawingBuffer no es true.
    }
}

/**
 * Crea una textura simple de gradiente radial para las estrellas.
 * @returns {THREE.CanvasTexture} Textura para el PointsMaterial.
 */
function create_star_texture() {
    const canvas = document.createElement('canvas');
    const size = 64; // Tamaño de la textura
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');   // Centro blanco brillante
    gradient.addColorStop(0.2, 'rgba(255, 255, 220, 0.8)'); // Halo amarillento suave
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)'); // Más difuso
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Borde transparente

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

/**
 * Crea una textura simple de gradiente radial para las nebulosas.
 * @returns {THREE.CanvasTexture} Textura para el SpriteMaterial.
 */
function create_nebula_texture() {
    const canvas = document.createElement('canvas');
    const size = 128; // Tamaño de la textura
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); // Centro más brillante
    gradient.addColorStop(0.3, 'rgba(200, 200, 255, 0.3)'); // Tono azulado/violáceo
    gradient.addColorStop(1, 'rgba(150, 150, 255, 0)'); // Borde transparente

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

/**
 * Añade sprites de nebulosas a la escena, ubicándolos cerca de las estrellas.
 * @param {Float32Array} star_positions - Array de posiciones de las estrellas (para referencia).
 * @param {number} num_nebulas - Número de nebulosas a crear.
 * @param {number} base_scale - Tamaño base de las nebulosas.
 */
function add_nebulas(star_positions, num_nebulas = 50, base_scale = 100) {
    // Limpiar nebulosas anteriores
    while (nebula_group.children.length > 0) {
        nebula_group.remove(nebula_group.children[0]);
    }

    const num_stars_available = star_positions.length / 3;
    if (num_stars_available === 0) return; // No hay estrellas de referencia

    const nebula_colors = [
        new THREE.Color(0.8, 0.2, 0.8), // Magenta/Púrpura
        new THREE.Color(0.2, 0.4, 1.0), // Azul
        new THREE.Color(1.0, 0.3, 0.3), // Rojo/Rosa
    ];

    for (let i = 0; i < num_nebulas; i++) {
        const nebula_sprite = new THREE.Sprite(nebula_material.clone()); // Clonar material para poder cambiar color

        // Elegir una estrella aleatoria como punto de anclaje
        const random_star_index = Math.floor(Math.random() * num_stars_available);
        const p_idx = random_star_index * 3;

        // Posición ligeramente desplazada de la estrella ancla
        const pos_x = star_positions[p_idx] + (Math.random() - 0.5) * 50;
        const pos_y = star_positions[p_idx + 1] + (Math.random() - 0.5) * 50;
        const pos_z = star_positions[p_idx + 2] + (Math.random() - 0.5) * 20; // Menos desplazamiento Z

        nebula_sprite.position.set(pos_x, pos_y, pos_z);

        // Tamaño y color aleatorios
        const scale_variation = base_scale * (0.5 + Math.random() * 1.0);
        nebula_sprite.scale.set(scale_variation, scale_variation, 1.0); // Escala Z no afecta a Sprites
        nebula_sprite.material.color = nebula_colors[Math.floor(Math.random() * nebula_colors.length)];
        nebula_sprite.material.opacity = 0.1 + Math.random() * 0.15; // Opacidad variable

        nebula_group.add(nebula_sprite);
    }
    console.log(`Añadidas ${num_nebulas} nebulosas.`);
}

/**
 * Crea una textura con puntos blancos aleatorios sobre fondo negro para la Sky Sphere.
 * @param {number} texture_size - Tamaño de la textura (ancho y alto).
 * @param {number} num_bg_stars - Número de estrellas de fondo a dibujar.
 * @returns {THREE.CanvasTexture} Textura para el material de la Sky Sphere.
 */
function create_sky_sphere_texture(texture_size = 2048, num_bg_stars = 10000) {
    const canvas = document.createElement('canvas');
    canvas.width = texture_size;
    canvas.height = texture_size;
    const context = canvas.getContext('2d');

    // Fondo negro
    context.fillStyle = 'black';
    context.fillRect(0, 0, texture_size, texture_size);

    // Estrellas de fondo (puntos blancos)
    context.fillStyle = 'white';
    for (let i = 0; i < num_bg_stars; i++) {
        const x = Math.random() * texture_size;
        const y = Math.random() * texture_size;
        const radius = Math.random() * 1.2; // Tamaños pequeños y variables
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true; // Asegurarse de que la textura se actualice
    return texture;
}


// --- Iniciar la aplicación ---
init_three();