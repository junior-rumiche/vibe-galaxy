/**
 * @file Módulo para la generación de datos 3D de galaxias para Three.js.
 * @author Roo
 */

import * as THREE from 'three'; // Necesario para THREE.Color

/**
 * Genera datos de posición y color para estrellas de una galaxia espiral 3D.
 * @param {number} num_stars - Número total de estrellas a generar.
 * @param {number} arms - Número de brazos espirales principales.
 * @param {number} arm_spread - Factor de dispersión inicial de los brazos.
 * @param {number} rotation_factor - Cuánto giran los brazos.
 * @param {number} core_concentration - Factor de concentración en el núcleo.
 * @param {number} haze_factor - Proporción de estrellas de "neblina".
 * @param {number} galaxy_radius - Radio máximo de la galaxia en unidades 3D.
 * @param {number} galaxy_thickness - Grosor máximo del disco de la galaxia.
 * @returns {{positions: Float32Array, colors: Float32Array}} Objeto con arrays para BufferGeometry.
 */
export function generate_galaxy(
    num_stars = 2000,
    arms = 3,
    arm_spread = 0.1,
    rotation_factor = 3.0,
    core_concentration = 3.0,
    haze_factor = 0.1,
    galaxy_radius = 200, // Radio fijo para la escena 3D
    galaxy_thickness = 15 // Grosor del disco
) {
    const positions = new Float32Array(num_stars * 3); // x, y, z por estrella
    const colors = new Float32Array(num_stars * 3); // r, g, b por estrella

    const base_colors_hex = ['#FFFFFF', '#FFF0F5', '#FFE4E1', '#ADD8E6', '#E6E6FA'];
    const base_colors_rgb = base_colors_hex.map(hex => new THREE.Color(hex)); // Convertir a THREE.Color

    const num_haze_stars = Math.floor(num_stars * haze_factor);
    const num_arm_stars = num_stars - num_haze_stars;

    let star_index = 0; // Índice para llenar los arrays

    // --- Generar estrellas de los brazos ---
    for (let i = 0; i < num_arm_stars; i++) {
        const random_dist = Math.pow(Math.random(), core_concentration);
        const distance = random_dist * galaxy_radius; // Distancia en el plano XY

        const arm_index = i % arms;
        const base_angle = (arm_index / arms) * Math.PI * 2;
        const rotation = (distance / galaxy_radius) * rotation_factor * Math.PI;
        const current_spread = arm_spread * (1 + distance / galaxy_radius * 2);
        const random_offset = (Math.random() - 0.5) * current_spread * Math.PI;
        const angle = base_angle + rotation + random_offset;

        // Coordenadas XY
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance; // Usar Y como el plano principal

        // Coordenada Z (grosor del disco) - más delgado en los bordes
        const z_factor = (Math.random() - 0.5) * (1 - distance / galaxy_radius); // Menos dispersión Z lejos del centro
        const z = z_factor * galaxy_thickness;

        // Guardar posición
        const p_idx = star_index * 3;
        positions[p_idx] = x;
        positions[p_idx + 1] = y; // Galaxia en plano XY
        positions[p_idx + 2] = z;

        // Guardar color (con variación de brillo)
        const brightness_factor = 0.6 + (1 - distance / galaxy_radius) * 0.4; // Más brillantes cerca del centro (ajustado)
        const color_index = Math.floor(Math.random() * base_colors_rgb.length);
        const base_color = base_colors_rgb[color_index];

        colors[p_idx] = base_color.r * brightness_factor;
        colors[p_idx + 1] = base_color.g * brightness_factor;
        colors[p_idx + 2] = base_color.b * brightness_factor;

        star_index++;
    }

    // --- Generar estrellas de "neblina" (halo esférico) ---
    for (let i = 0; i < num_haze_stars; i++) {
        // Distribución más esférica y menos concentrada
        const dist_xy = Math.pow(Math.random(), 1.5) * galaxy_radius * 1.2; // Puede extenderse un poco más
        const angle_xy = Math.random() * Math.PI * 2;
        const dist_z = (Math.random() - 0.5) * galaxy_thickness * 2.5; // Mayor dispersión Z

        const x = Math.cos(angle_xy) * dist_xy;
        const y = Math.sin(angle_xy) * dist_xy;
        const z = dist_z;

        // Guardar posición
        const p_idx = star_index * 3;
        positions[p_idx] = x;
        positions[p_idx + 1] = y;
        positions[p_idx + 2] = z;

        // Guardar color (más tenue)
        const brightness_factor = 0.4 + Math.random() * 0.3; // Generalmente más tenues
        const color_index = Math.floor(Math.random() * base_colors_rgb.length);
        const base_color = base_colors_rgb[color_index];

        colors[p_idx] = base_color.r * brightness_factor;
        colors[p_idx + 1] = base_color.g * brightness_factor;
        colors[p_idx + 2] = base_color.b * brightness_factor;

        star_index++;
    }

    return { positions, colors };
}