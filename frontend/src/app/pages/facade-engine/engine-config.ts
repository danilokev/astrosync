import * as Astronomy from 'astronomy-engine';

export const ENGINE_CONFIG = {
  // Motor gráfico a usar
  THREE_JS: 'TreeJS',
  WeblGL: 'WebGL',
  // Parámetros de la visualización
  CELESTIAL_SPHERE_RADIUS: 1000,       // radio de la esfera celeste
  SKYBOX_SIZE_DIFFERENCE: 80,          // diferencia entre el radio de esfera celeste y el radio del skybox
  HORIZON_RADIUS_DIFFERENCE: 40,       // diferencia entre el radio de esfera celeste y el radio de la línea del horizonte
  LIGHT_POSITION: [0,0,0],             // posición del Sol para visualizar las fases de la Luna

  // Datos sobre el radio cogidos desde https://ssd.jpl.nasa.gov/planets/phys_par.html
  BODIES: [
    {
      _id: '69b3d8f84754f62acf8da8e8',
      distance: 80,
      body: Astronomy.Body.Mercury,
      name: 'Mercurio',
      color: 0xaaaaaa,
      modelPath: 'assets/models/mercury_edited.glb',
      size: 0.2,//6
      radius_km: 2439.7,
      magnitude: -0.60
    },
    {
      _id: '69b3d90c4754f62acf8da8ea',
      distance: 80,
      body: Astronomy.Body.Venus,
      name: 'Venus',
      color: 0xffddaa,
      modelPath: 'assets/models/venus.glb',
      size: 0.24,//8
      radius_km: 6051.8,
      magnitude: -4.47
    },
    {
      _id: '69b3d91a4754f62acf8da8ec',
      distance: 80,
      body: Astronomy.Body.Mars,
      name: 'Marte',
      color: 0xff5500,
      modelPath: 'assets/models/mars.glb',
      size: 0.34,//0.12
      radius_km: 3389.5,
      magnitude: -1.52
    },
    {
      _id: '69b3d92e4754f62acf8da8ee',
      distance: 80,
      body: Astronomy.Body.Jupiter,
      name: 'Jupiter',
      color: 0xffaa55,
      modelPath: 'assets/models/jupiter.glb',
      size: 0.5,//11
      radius_km: 69911,
      magnitude: -9.40
    },
    {
      _id: '69b3d9404754f62acf8da8f0',
      distance: 80,
      body: Astronomy.Body.Saturn,
      name: 'Saturno',
      color: 0xffcc88,
      modelPath: 'assets/models/saturno.glb',
      size: 1,//0.08
      radius_km: 58232,
      magnitude: -8.88
    },
    {
      _id: '69b3d94e4754f62acf8da8f2',
      distance: 80,
      body: Astronomy.Body.Uranus,
      name: 'Urano',
      color: 0x55ffff,
      modelPath: 'assets/models/uranus.glb',
      size: 0.2,//11
      radius_km: 2536,
      magnitude: -7.19
    },
    {
      _id: '69b3d95a4754f62acf8da8f4',
      distance: 80,
      body: Astronomy.Body.Neptune,
      name: 'Neptuno',
      color: 0x5555ff,
      modelPath: 'assets/models/neptune.glb',
      size: 0.2,//11
      radius_km: 24622,
      magnitude: -6.87
    },
    {
      _id: '69b3d9774754f62acf8da8f8',
      distance: 80,
      body: Astronomy.Body.Moon,
      name: 'Luna',
      color: 0xffffff,
      modelPath: 'assets/models/the_moon.glb',
      size: 0.8,//30
      radius_km: 1737.1,
      magnitude: -7.7 // -2.5 to -12.9
    },
    {
      _id: '69b3d98b4754f62acf8da8fa',
      distance: 120,
      body: Astronomy.Body.Sun,
      name: 'Sol',
      color: 0xffff00,
      modelPath: 'assets/models/sun.glb',
      size: 1,//4
      radius_km: 696340,
      magnitude: -26.74
    },
    {
      _id: '69b3d96a4754f62acf8da8f6',
      distance: 80,
      body: Astronomy.Body.Pluto,
      name: 'Plutón',
      color: 0xffff00,
      modelPath: 'assets/models/pluto_1.glb',
      size: 0.15,//0.05
      radius_km: 1188.3,
      magnitude: -1.0
    },
  ],

  CORRECTION_FACTOR: 0.05, // para escalado de planetas (el correcto es 0.05)

  

  // Rutas para cargar recursos
  //   PLANET_MODELS: 'assets/models/',
  PLANET_MATERIAL_PATH: 'assets/materials/basic.json'
};
