import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Motor } from '../graphics-engine/Motor';
import { FacadeEngineServiceTAG } from '../facade-engine-TAG.service';
import { ResourceShader } from '../graphics-engine/ResourceShader';
import { ResourcePoints } from '../graphics-engine/ResourcePoints';
import { Points } from '../graphics-engine/Points';
import { TNode } from '../graphics-engine/TNode';
import { vec3 } from 'gl-matrix';

// ─────────────────────────────────────────────────────────────────────────────
// Estructura de partícula — Capítulo 56 LearnOpenGL:
// struct Particle { vec2 Position, Velocity; vec4 Color; float Life; }
// Adaptada a 3D para nebulosa volumétrica
// ─────────────────────────────────────────────────────────────────────────────
interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  color:    [number, number, number];
  life:     number;
  size:     number;
  // Base position para movimiento oscilatorio — la partícula orbita alrededor
  basePos:  [number, number, number];
  phase:    number;  // fase individual de oscilación
  freq:     number;  // frecuencia individual
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertex Shader 
//   "uniform vec2 offset; uniform vec4 color;" → aquí como atributos
//   "float scale = 10.0f;" → factor de escala del tamaño
//   "gl_Position = projection * vec4((vertex.xy * scale) + offset, 0.0, 1.0)"
// ─────────────────────────────────────────────────────────────────────────────
const VS_NEBULA = `#version 300 es
precision highp float;

layout(location = 0) in vec3  aPosition;
layout(location = 1) in vec3  aColor;
layout(location = 2) in float aSize;

uniform mat4  uModel;
uniform mat4  uView;
uniform mat4  uProjection;
uniform float uTime;

out vec3  vColor;
out float vAlpha;
out float vIsStar;

void main() {
  vColor = aColor;

  // Detectar si es estrella por tamaño pequeño y posición lejana
  float dist = length(aPosition);
  vIsStar = dist > 500.0 ? 1.0 : 0.0;

  if (vIsStar > 0.5) {
    // Estrellas: parpadeo individual basado en posición (hash único por estrella)
    float hash = fract(sin(dot(aPosition.xy, vec2(127.1, 311.7))) * 43758.5);
    float hash2 = fract(sin(dot(aPosition.yz, vec2(269.5, 183.3))) * 47653.2);
    // Parpadeo: combinación de dos frecuencias distintas por estrella
    float twinkle = 0.55 + 0.25 * sin(uTime * (1.2 + hash * 2.5) + hash * 6.28)
                        + 0.20 * sin(uTime * (0.7 + hash2 * 1.8) + hash2 * 6.28);
    vAlpha = twinkle * (0.5 + 0.5 * hash); // brillo base variable por estrella
    // Tamaño pulsante para estrellas brillantes
    float sizePulse = 1.0 + 0.35 * sin(uTime * (1.5 + hash * 2.0) + hash2 * 6.28);
    vec4 mvPos = uView * uModel * vec4(aPosition, 1.0);
    gl_PointSize = clamp(aSize * sizePulse * (300.0 / -mvPos.z), 0.5, 6.0);
    gl_Position  = uProjection * mvPos;
  } else {
    // Nebulosa: pulsante suave
    vAlpha = 0.18 + 0.28 * (aColor.g * 0.55 + aColor.b * 0.30 + aColor.r * 0.08);
    float pulse = 1.0 + 0.12 * sin(uTime * 1.1 + aPosition.x * 0.9 + aPosition.z * 0.7);
    vec4 mvPos = uView * uModel * vec4(aPosition, 1.0);
    gl_PointSize = clamp(aSize * pulse * (300.0 / -mvPos.z), 0.5, 80.0);
    gl_Position  = uProjection * mvPos;
  }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Fragment Shader — del PDF:
//   "color = texture(sprite, TexCoords) * ParticleColor"
// Sin textura: sprite circular procedural (más limpio para WebGL2 puro)
// ─────────────────────────────────────────────────────────────────────────────
const FS_NEBULA = `#version 300 es
precision highp float;

in vec3  vColor;
in float vAlpha;
in float vIsStar;

out vec4 fragColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;

  float s;
  if (vIsStar > 0.5) {
    // Estrellas: núcleo brillante + halo suave
    float core  = pow(1.0 - smoothstep(0.0, 0.4, d), 2.5); // punto central duro
    float halo  = pow(1.0 - smoothstep(0.0, 1.0, d), 1.0) * 0.35; // halo difuso
    s = core + halo;
    // Brillo extra en el centro absoluto
    s += pow(1.0 - smoothstep(0.0, 0.15, d), 4.0) * 0.6;
  } else {
    // Nebulosa: borde muy suave
    s = pow(1.0 - smoothstep(0.0, 1.0, d), 1.4);
  }

  fragColor = vec4(vColor, vAlpha * s);
  if (fragColor.a < 0.002) discard;
}
`;

@Component({
  selector: 'app-nebula-webgl',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nebula-container">
      <!-- Canvas WebGL2 propio — no comparte contexto con el planetario -->
      <canvas #nebulaCanvas class="nebula-canvas"></canvas>

      <!-- HUD — misma tipografía que las demás animaciones -->
      <div class="nebula-hud">
        <div class="nebula-title">
          <h1>Nebulosa</h1>
          <p>Sistema de partículas WebGL2 · Motor propio AstroSync</p>
        </div>
        <div class="nebula-info">
          <span>{{ particleCount | number }} partículas activas</span>
        </div>
      </div>

      <!-- Botones de modo de cámara -->
      <div class="cam-btns">
        <button
          class="cam-btn"
          [class.active]="cameraMode === 'auto'"
          (click)="setCameraMode('auto')"
          title="Movimiento automático">
          AUTO
        </button>
        <button
          class="cam-btn"
          [class.active]="cameraMode === 'free'"
          (click)="setCameraMode('free')"
          title="Cámara libre — arrastra para rotar">
          LIBRE
        </button>
      </div>

      <!-- Botón info -->
      <button class="info-btn" (click)="toggleInfo()">i</button>

      <!-- Panel info -->
      <div class="info-panel" [class.open]="infoOpen">
        <div class="info-head">
          <span class="info-title">Nebulosa</span>
          <button class="info-x" (click)="toggleInfo()">✕</button>
        </div>
        <div class="info-body">
          <p class="info-p">
            Una nebulosa es una región del medio interestelar constituida por gases
            —principalmente hidrógeno y helio— y polvo cósmico. Son los lugares
            donde nacen las estrellas por condensación gravitacional.
          </p>
          <p class="info-p">
            Esta animación usa el sistema de partículas descrito en el capítulo 56
            de <em>LearnOpenGL</em> (Joey de Vries, 2020): pool fijo de partículas,
            <code>firstUnusedParticle()</code>, <code>respawnParticle()</code>
            y <code>GL_ONE</code> (additive blending) para el efecto glow.
          </p>
          <p class="info-p">
            Implementado con el motor WebGL2 propio de AstroSync:
            <code>Motor</code>, <code>ResourcePoints</code>,
            <code>ResourceShader</code> y <code>Points</code>.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nebula-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000000;
      overflow: hidden;
    }
    .nebula-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .nebula-hud {
      position: absolute;
      top: 22px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      pointer-events: none;
      z-index: 10;
    }
    .nebula-hud h1 {
      font-family: 'Montserrat', sans-serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 6px;
      text-transform: uppercase;
      color: rgba(160,210,255,0.92);
      text-shadow: 0 0 24px rgba(100,170,255,0.4);
      margin: 0;
    }
    .nebula-hud p {
      font-family: 'Roboto', sans-serif;
      font-size: 13px;
      letter-spacing: 3px;
      margin-top: 10px;
      color: rgba(188,122,255,0.7);
    }
    .nebula-info {
      margin-top: 8px;
      font-family: 'Roboto', sans-serif;
      font-size: 11px;
      color: rgba(160,210,255,0.45);
      letter-spacing: 2px;
    }
    .info-btn {
      position: absolute;
      bottom: 22px;
      left: 20px;
      z-index: 20;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(14,18,50,0.85);
      border: 1px solid rgba(188,122,255,0.35);
      color: rgba(188,122,255,0.95);
      font-size: 20px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Montserrat', sans-serif;
      transition: all 0.2s;
    }
    .info-btn:hover {
      background: rgba(30,20,80,0.95);
      border-color: rgba(188,122,255,0.7);
      color: #fff;
    }
    .info-panel {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 320px;
      background: rgba(10,13,32,0.96);
      border-right: 1px solid rgba(188,122,255,0.14);
      backdrop-filter: blur(14px);
      z-index: 30;
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .info-panel.open { transform: translateX(0); }
    .info-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid rgba(188,122,255,0.1);
    }
    .info-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(210,175,255,0.95);
    }
    .info-x {
      background: none;
      border: none;
      color: rgba(188,122,255,0.45);
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .info-x:hover { color: #fff; background: rgba(188,122,255,0.12); }
    .info-body {
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-p {
      font-family: 'Roboto', sans-serif;
      font-size: 15px;
      color: rgba(200,185,240,0.72);
      line-height: 1.8;
      margin: 0;
    }
    code {
      font-family: 'Courier New', monospace;
      color: rgba(188,122,255,0.9);
      font-size: 13px;
    }
    .cam-btns {
      position: absolute;
      bottom: 22px;
      right: 20px;
      display: flex;
      gap: 6px;
      z-index: 20;
    }
    .cam-btn {
      background: rgba(14,18,50,0.82);
      border: 1px solid rgba(188,122,255,0.2);
      color: rgba(188,122,255,0.85);
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 2px;
      padding: 7px 16px;
      cursor: pointer;
      text-transform: uppercase;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .cam-btn:hover {
      background: rgba(30,20,70,0.92);
      color: #fff;
      border-color: rgba(188,122,255,0.55);
    }
    .cam-btn.active {
      background: rgba(30,20,70,0.92);
      color: #fff;
      border-color: rgba(188,122,255,0.7);
      box-shadow: 0 0 10px rgba(188,122,255,0.2);
    }
  `]
})
export class NebulaWebglComponent implements AfterViewInit, OnDestroy {

  @ViewChild('nebulaCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  infoOpen = false;
  particleCount = 0;

  // ── Motor y recursos ────────────────────────────────────────────────────────
  private gl!:      WebGL2RenderingContext;
  private motor!:   Motor;
  private shader!:  ResourceShader;
  private points!:  Points;
  private node!:    TNode;
  private resource!: ResourcePoints;

  // ── Loop ─────────────────────────────────────────────────────────────────────
  private animId = 0;
  private lastTime = 0;
  private elapsed  = 0;
  cameraMode: 'auto' | 'free' = 'auto';

  // ─────────────────────────────────────────────────────────────────────────────
  // Sistema de partículas — Capítulo 56 LearnOpenGL
  // ─────────────────────────────────────────────────────────────────────────────

  // "unsigned int nr_particles = 500;" — del PDF
  private readonly NR_PARTICLES     = 17500;
  // "unsigned int nr_new_particles = 2;" — del PDF
  private readonly NR_NEW_PER_FRAME = 4;

  private particles:         Particle[] = [];
  // "unsigned int lastUsedParticle = 0;" — del PDF
  private lastUsedParticle = 0;

  // Buffers CPU → GPU
  private posArr:  Float32Array;
  private colArr:  Float32Array;
  private sizeArr: Float32Array;

  // Capas de la nebulosa (cada una actúa como emisor independiente)
  private readonly LAYERS = [
    // Verde esmeralda — núcleo denso
    { cx: 0,   cy: 0,   cz: 0,   r: 80,  hMin:0.30, hMax:0.38, lMin:0.28, lMax:0.45, sMin:3,  sMax:14, life:0.08, isStar:false },
    // Cian/turquesa — capa media
    { cx: 20,  cy: 8,   cz:-12,  r: 130, hMin:0.48, hMax:0.58, lMin:0.24, lMax:0.42, sMin:4,  sMax:18, life:0.07, isStar:false },
    // Lila/violeta — exterior
    { cx:-18,  cy:-6,   cz: 14,  r: 160, hMin:0.70, hMax:0.82, lMin:0.22, lMax:0.40, sMin:5,  sMax:20, life:0.06, isStar:false },
    // Velo difuso — fondo, muy grande y tenue
    { cx: 5,   cy: 5,   cz: -5,  r: 230, hMin:0.32, hMax:0.56, lMin:0.18, lMax:0.32, sMin:8,  sMax:30, life:0.05, isStar:false },
    // Estrellas de fondo — distribución esférica lejana (más cantidad)
    { cx: 0,   cy: 0,   cz: 0,   r:2000, hMin:0.55, hMax:0.75, lMin:0.60, lMax:0.95, sMin:1,  sMax:4,  life:0.001, isStar:true },
  ];

  constructor(private facadeService: FacadeEngineServiceTAG) {
    // Pre-alocar arrays del tamaño del pool
    // NR_PARTICLES se usa en initPool y buildBuffers — arrays pre-alocados
    this.posArr  = new Float32Array(17500 * 3);
    this.colArr  = new Float32Array(17500 * 3);
    this.sizeArr = new Float32Array(17500);
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initEngine();
    this.startLoop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.motor?.liberarTodo();
  }

  toggleInfo(): void { this.infoOpen = !this.infoOpen; }

  setCameraMode(mode: 'auto' | 'free'): void {
    this.cameraMode = mode;
    // Al volver a automático, los controles de orbit quedan deshabilitados
    // Al pasar a libre, la cámara queda donde está — no se resetea
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INIT ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  private async initEngine(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;

    // Ajustar canvas al contenedor
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Obtener contexto WebGL2
    const gl = canvas.getContext('webgl2');
    if (!gl) { console.error('WebGL2 no soportado'); return; }
    this.gl = gl;

    // Habilitar gl_PointSize en shaders (necesario en WebGL2)
    // (activado por defecto en WebGL2, pero explícito para claridad)

    // Crear motor con el contexto
    this.motor = new Motor(gl, this.facadeService);

    // Configurar cámara con perspectiva y controles orbit
    const cam = this.motor.getCamera() as any;
    cam.setPerspective(70, canvas.width / canvas.height, 0.1, 8000);
    cam['cameraDistance'] = 380;
    cam['cameraPitch']    = 0.15;
    cam['cameraYaw']      = 0;
    cam.updateCameraPosition();
    // Registrar controles orbit solo si estamos en modo libre
    // Sobreescribimos el canvas con nuestro propio mousedown que comprueba el modo
    canvas.addEventListener('mousedown', (e) => {
      if (this.cameraMode === 'free') {
        cam['isDragging'] = true;
        cam['lastMousePos'] = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.addEventListener('mouseup', () => { cam['isDragging'] = false; });
    canvas.addEventListener('mouseleave', () => { cam['isDragging'] = false; });
    canvas.addEventListener('mousemove', (e) => {
      if (this.cameraMode !== 'free' || !cam['isDragging']) return;
      const dx = e.clientX - cam['lastMousePos'].x;
      const dy = e.clientY - cam['lastMousePos'].y;
      cam['lastMousePos'] = { x: e.clientX, y: e.clientY };
      cam['cameraYaw']   += dx * cam['rotationSpeed'];
      cam['cameraPitch'] += dy * cam['rotationSpeed'];
      const max = Math.PI / 2 - 0.01;
      cam['cameraPitch'] = Math.max(-max, Math.min(max, cam['cameraPitch']));
      cam.updateCameraPosition();
    });
    canvas.addEventListener('wheel', (e) => {
      if (this.cameraMode !== 'free') return;
      e.preventDefault();
      cam['zoomFOV'] ? cam['zoomFOV'](e.deltaY < 0) : null;
      // Fallback: zoom por distancia
      if (e.deltaY > 0) cam['cameraDistance'] = Math.min(cam['cameraDistance'] * 1.05, 1000);
      else              cam['cameraDistance'] = Math.max(cam['cameraDistance'] / 1.05, 50);
      cam.updateCameraPosition();
    }, { passive: false });

    // Resize observer
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      cam.setPerspective(70, canvas.width / canvas.height, 0.1, 8000);
    });
    ro.observe(canvas);

    // ── Inicializar pool — "for (i=0; i<nr_particles; ++i) particles.push_back(Particle())"
    for (let i = 0; i < this.NR_PARTICLES; i++) {
      this.particles.push({ position:[0,0,0], velocity:[0,0,0], color:[0,0,0], life:0, size:1, basePos:[0,0,0], phase:Math.random()*Math.PI*2, freq:0.1+Math.random()*0.3 });
    }

    // Llenar pool inicial para que aparezca completa desde el frame 0
    this.initPool();
    this.buildBuffers();

    // ── Crear shader con el motor
    this.shader = await this.motor.crearShader('nebula_shader', VS_NEBULA, FS_NEBULA);

    // ── Crear Points con el motor — crearPoints() instancia ResourcePoints internamente
    this.points = await this.motor.crearPoints(
      'nebula_points',
      this.posArr,
      this.colArr,
      this.sizeArr,
      this.shader,
    );

    // ── Obtener ResourcePoints para updatePositions() cada frame
    this.resource = this.motor.getResourceManager().obtener<ResourcePoints>('nebula_points');

    // ── Añadir nodo a la escena
    this.node = this.motor.crearNodo(
      this.motor.getRoot(),
      this.points,
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 1, 1),
      vec3.fromValues(0, 0, 0),
    );

    // Configurar GL
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // GL_ONE — del PDF capítulo 56
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // negro puro
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Llenar el pool inicial — nebulosa completa desde el primer frame
  // ─────────────────────────────────────────────────────────────────────────────
  private initPool(): void {
    let idx = 0;
    // Distribución: nebulosa 15000 partículas, estrellas 2000
    const counts = [3250, 3250, 3250, 3250, 3500];
    this.LAYERS.forEach((layer, li) => {
      const n = counts[li] ?? Math.floor(this.NR_PARTICLES / this.LAYERS.length);
      for (let i = 0; i < n && idx < this.NR_PARTICLES; i++, idx++) {
        this.respawnToLayer(this.particles[idx], layer);
        // Estrellas: life fija alta; nebulosa: aleatoria para fade escalonado
        this.particles[idx].life = (layer as any).isStar ? 0.9 + Math.random()*0.1 : Math.random();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // firstUnusedParticle() — del PDF capítulo 56:
  // "search from last used particle, often returns almost instantly"
  // ─────────────────────────────────────────────────────────────────────────────
  private firstUnusedParticle(): number {
    for (let i = this.lastUsedParticle; i < this.NR_PARTICLES; i++) {
      if (this.particles[i].life <= 0.0) {
        this.lastUsedParticle = i;
        return i;
      }
    }
    for (let i = 0; i < this.lastUsedParticle; i++) {
      if (this.particles[i].life <= 0.0) {
        this.lastUsedParticle = i;
        return i;
      }
    }
    // "override first particle if all others are alive" — del PDF
    this.lastUsedParticle = 0;
    return 0;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // respawnParticle() — del PDF capítulo 56:
  // "particle.Position = object.Position + random + offset"
  // "particle.Color    = vec4(rColor, rColor, rColor, 1.0f)"
  // "particle.Life     = 1.0f"
  // "particle.Velocity = object.Velocity * 0.1f"
  // ─────────────────────────────────────────────────────────────────────────────
  private respawnParticle(p: Particle): void {
    const layer = this.LAYERS[Math.floor(Math.random() * this.LAYERS.length)];
    this.respawnToLayer(p, layer);
  }

  private respawnToLayer(p: Particle, layer: typeof this.LAYERS[0]): void {
    // Posición aleatoria dentro del radio de la capa (distribución esférica)
    const r     = Math.pow(Math.random(), 0.5) * layer.r;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);

    p.position[0] = layer.cx + r * Math.sin(phi) * Math.cos(theta);
    p.position[1] = layer.cy + r * Math.sin(phi) * Math.sin(theta) * 0.55;
    p.position[2] = layer.cz + r * Math.cos(phi);

    // Velocidad lenta — nebulosa "respira" suavemente
    // "particle.Velocity = object.Velocity * 0.1f" — del PDF
    // Estrellas estáticas — no se mueven
    const vScale = (layer as any).isStar ? 0.0 : 0.08;
    p.velocity[0] = (Math.random() - 0.5) * vScale;
    p.velocity[1] = (Math.random() - 0.5) * vScale;
    p.velocity[2] = (Math.random() - 0.5) * vScale;

    // Color HSL → RGB dentro del rango de la capa
    // "float rColor = 0.5f + ((rand() % 100) / 100.0f)" — del PDF
    const hue = layer.hMin + Math.random() * (layer.hMax - layer.hMin);
    const lum = layer.lMin + Math.random() * (layer.lMax - layer.lMin);
    // Estrellas: color blanco-azulado con saturación baja
    const sat = (layer as any).isStar ? 0.15 + Math.random() * 0.20 : 0.88;
    const [r2, g2, b2] = this.hslToRgb(hue, sat, lum);
    p.color[0] = r2;
    p.color[1] = g2;
    p.color[2] = b2;

    // "particle.Life = 1.0f" — del PDF
    // Estrellas: life muy larga (prácticamente no mueren)
    p.life = (layer as any).isStar ? 0.8 + Math.random() * 0.2 : 1.0;
    p.size = layer.sMin + Math.random() * (layer.sMax - layer.sMin);
    // Guardar posición base para movimiento oscilatorio
    p.basePos[0] = p.position[0];
    p.basePos[1] = p.position[1];
    p.basePos[2] = p.position[2];
    p.phase = Math.random() * Math.PI * 2;
    p.freq  = 0.08 + Math.random() * 0.25;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE — núcleo del sistema, del PDF capítulo 56:
  // "p.Life -= dt"
  // "p.Position -= p.Velocity * dt"
  // "p.Color.a  -= dt * 2.5f"
  // ─────────────────────────────────────────────────────────────────────────────
  private update(dt: number): void {
    // 1. Spawnear NR_NEW_PER_FRAME partículas nuevas — del PDF
    for (let i = 0; i < this.NR_NEW_PER_FRAME; i++) {
      const slot = this.firstUnusedParticle();
      this.respawnParticle(this.particles[slot]);
    }

    // 2. Actualizar todas las partículas — del PDF
    let alive = 0;
    for (let i = 0; i < this.NR_PARTICLES; i++) {
      const p = this.particles[i];

      // "p.Life -= dt" — del PDF (vida larga para nebulosa estática)
      const layer = this.LAYERS[i % this.LAYERS.length];
      // Estrellas: no pierden life — son permanentes
      if (!(layer as any).isStar) {
        p.life -= dt * layer.life;
      }

      if (p.life > 0.0) {
        // Movimiento oscilatorio suave alrededor de basePos
        // La partícula oscila en las 3 dimensiones con fases distintas
        // Amplitud pequeña — solo da sensación de vida, no desplaza la nebulosa
        if (!(layer as any).isStar) {
          const amp = 2.5; // amplitud de oscilación en unidades
          const t2 = this.elapsed;
          p.position[0] = p.basePos[0] + Math.sin(t2 * p.freq           + p.phase)         * amp;
          p.position[1] = p.basePos[1] + Math.sin(t2 * p.freq * 0.7     + p.phase + 1.047) * amp * 0.8;
          p.position[2] = p.basePos[2] + Math.sin(t2 * p.freq * 1.3     + p.phase + 2.094) * amp * 0.9;
        }
        alive++;
      }
    }
    this.particleCount = alive;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Reconstruir buffers CPU desde el pool — se llama cada frame
  // ─────────────────────────────────────────────────────────────────────────────
  private buildBuffers(): void {
    for (let i = 0; i < this.NR_PARTICLES; i++) {
      const p = this.particles[i];
      const a = Math.max(0, p.life); // alpha derivado de life

      this.posArr[i*3]   = p.position[0];
      this.posArr[i*3+1] = p.position[1];
      this.posArr[i*3+2] = p.position[2];

      // Color modulado por life para el fade out
      // "p.Color.a -= dt * 2.5f" — del PDF, aquí integrado en el color
      this.colArr[i*3]   = p.color[0] * a;
      this.colArr[i*3+1] = p.color[1] * a;
      this.colArr[i*3+2] = p.color[2] * a;

      // Ocultar partículas muertas (size 0)
      this.sizeArr[i] = p.life > 0 ? p.size : 0.0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOOP PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────────
  private startLoop(): void {
    this.lastTime = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;
      this.elapsed += dt;

      // 1. Actualizar sistema de partículas (lógica del PDF cap.56)
      this.update(dt);

      // 2. Reconstruir buffers CPU
      this.buildBuffers();

      // 3. Subir posiciones a la GPU — updatePositions() de ResourcePoints
      if (this.resource) {
        this.resource.updatePositions(this.gl, this.posArr);
      }

      // 4. Pasar uTime al shader para el efecto pulsante
      if (this.shader) {
        const prog = this.shader.getProgram();
        this.gl.useProgram(prog);
        const uTime = this.shader.getUniform(this.gl, 'uTime');
        if (uTime) this.gl.uniform1f(uTime, this.elapsed);
      }

      // 5. Animar cámara solo en modo automático
      if (this.cameraMode === 'auto') {
        const cam = this.motor.getCamera() as any;
        cam['cameraYaw']      += 0.0008 * dt * 60;
        cam['cameraPitch']     = 0.12 + Math.sin(this.elapsed * 0.12) * 0.18;
        cam['cameraDistance']  = 360 + Math.sin(this.elapsed * 0.07) * 80;
        cam.updateCameraPosition();
      }

      // 6. Dibujar — Motor.dibujar() ya llama gl.clear() + Scene.draw() internamente
      this.motor.dibujar();

      this.animId = requestAnimationFrame(loop);
    };

    this.animId = requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HSL → RGB
  // ─────────────────────────────────────────────────────────────────────────────
  private hslToRgb(h: number, s: number, l: number): [number,number,number] {
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l*(1+s) : l+s-l*s;
      const p = 2*l-q;
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p+(q-p)*6*t;
        if (t < 1/2) return q;
        if (t < 2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      r = hue2rgb(p, q, h+1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h-1/3);
    }
    return [r, g, b];
  }
}