import { Injectable, ElementRef } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { mat4, vec3 } from 'gl-matrix';
import { Motor } from './graphics-engine/Motor';
import { constellationsReverse } from '../../../assets/data/NamesDiccionary';
import { ResourceShader } from './graphics-engine/ResourceShader';
import { ResourceSprite } from './graphics-engine/ResourceSprite';
import { ConstellationstateService } from '../../services/constellationstate.service';
import { TNode } from './graphics-engine/TNode';
import { LineLoop } from './graphics-engine/LineLoop';
import { Sprite } from './graphics-engine/Sprite';
import { IEngine } from './engine.interface';
import * as Astronomy from 'astronomy-engine';
import { BehaviorSubject, throwError } from 'rxjs';
import { Camera } from './graphics-engine/Camera';
import { ENGINE_CONFIG } from './engine-config';
import { EngineService } from './facade-engine.service';
import { ResourceLineSegment } from './graphics-engine/ResourceLineSegment';
import { ResourcePoints } from './graphics-engine/ResourcePoints';
import { SphereGeometry } from './graphics-engine/Geometry/SphereGeometry';
import { ResourceLoader } from '@angular/compiler';
import { ResourceTexture } from './graphics-engine/ResourceTexture';
import { Mesh } from './graphics-engine/Mesh';
import { ResourceMesh } from './graphics-engine/ResourceMesh';
import { ResourceMaterial } from './graphics-engine/ResourceMaterial';
import { constellations } from '../../../assets/data/NamesDiccionary';

@Injectable({
  providedIn: 'root',
})
export class FacadeEngineServiceTAG implements IEngine {
  private vsPlanet!: string;
  private fsPlanet!: string;
  private vsMoon!: string;
  private fsMoon!: string;

  private cuerpoCelesT: any;

  private gl!: WebGL2RenderingContext;
  private motor!: Motor;
  private starShader!: ResourceShader;
  private planetShader!: ResourceShader;
  private moonShader!: ResourceShader;
  private spriteShader!: ResourceShader;
  private constellationShader!: ResourceShader;
  private compassSprites: Sprite[] = [];
  private constellationLines: any[] = [];
  private constellationSprites: Sprite[] = [];
  private constellationLineNodes: TNode[] = [];
  private constellationArtNodes: TNode[] = [];
  public hideLineLoop: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public hideSaturnSol: BehaviorSubject<boolean> = new BehaviorSubject(true);

  // Evento para Angular
  public onObjectHover = new EventEmitter<any>();

  private lastHovered: any = null;

  private constellationArtMeta: {
    node: TNode;
    hrList: number[];
  }[] = [];
  private constellationsCreated = false;
  private starsCreated = false;
  private starsNode!: TNode;
  private starMap = new Map<
    number,
    {
      position: [number, number, number];
      data: any;
    }
  >();
  // private constellationVisible = false;
  private showLines: boolean = false;
  private showArt: boolean = false;
  private CELESTIAL_SPHERE_RADIUS: number = 1000; //5
  private horizonLine!: LineLoop; // <-- Aquí la declaramos
  private lineShader!: ResourceShader;
  private linesegmentShader!: ResourceShader;
  // Guardamos los planetas para manipularlos después
  // public planets: { node: any; shader: ResourceShader; name: string }[] = [];
  public planets = new Map<string, { node: any; shader: ResourceShader }>();

  private camera!: Camera;

  private sceneCreated: boolean = false;

  private horizonNode!: TNode;

  private compassNodes: TNode[] = [];

  private isFocused: boolean = false;

  private lightPosition: { x: number; y: number; z: number } = {
    x: 0,
    y: 0,
    z: 0,
  };

  private mouseDown = false;
  private mouseMoved = false;
  private mouseDownPos = { x: 0, y: 0 };

  private previousCameraState: any = null;

  // Referencia al ResourcePoints de las estrellas (para updatePositions)
  private starsResource!: ResourcePoints;

  // Caché de estrellas en el mismo orden que el buffer
  private cachedStars: any[] = [];

  // Metadatos de constelaciones: qué HRs forman cada segmento y su resource
  private constellationMeta: {
    constellation: string;
    hrPairs: [number, number][];
    resource: ResourceLineSegment;
  }[] = [];

  private landscape: any = null;
  private landscapeChanged = false;
  private landscapeShader!: ResourceShader;
  private basicMaterial!: ResourceMaterial;

  private lineChanged: boolean = false;
  private artChanged: boolean = false;

  constructor(
    private constellationState: ConstellationstateService,
    private cambioZoom: EngineService,
  ) {
    cambioZoom.dataSubject.subscribe((x) => {
      if (x) {
        this.restoreCameraState();
      }
    });
  }

  private saveCameraState(cuerpoAnt: any) {
    if (this.cuerpoCelesT !== cuerpoAnt) {
      const cam = this.motor.getCamera();

      this.previousCameraState = {
        target: vec3.clone(cam['cameraTarget']),
        distance: cam['cameraDistance'],
        yaw: cam['cameraYaw'],
        pitch: cam['cameraPitch'],
      };
      this.cuerpoCelesT = cuerpoAnt;
    }
  }

  private initHoverDetection(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousemove', (e) => {
      if (this.isFocused) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const ray = this.screenToWorldRay(x, y);
      this.handleHover(ray.origin, ray.direction);
    });
  }

  private handleHover(origin: vec3, dir: vec3): void {
    // Planetas
    for (const [name, obj] of this.planets) {
      const pos = obj.node.getTranslation();
      const radius = obj.node.getScale()[0];
      const hit = this.raySphereIntersection(origin, dir, pos, radius);

      if (hit) {
        if (this.lastHovered !== name) {
          this.lastHovered = name;
          this.onObjectHover.emit({
            name,
            object: { userData: { ...obj.node.userData } },
            point: this.worldToScreen(pos),
          });
        }
        return;
      }
    }

    // Estrellas
    const starHit = this.raycastStars(origin, dir);
    if (starHit) {
      const starName = starHit.proper || `STAR`;
      if (this.lastHovered !== starName) {
        this.lastHovered = starName;
        this.onObjectHover.emit({
          name: starName,
          object: { userData: { ...starHit } },
          point: this.worldToScreen(starHit.position),
        });
      }
      return;
    }

    //Constelaciones
    const constellationHit = this.raycastConstellations(origin, dir);
    if (constellationHit) {
      const abbrev = constellationHit.userData.constellation;
      const fullName = constellations[abbrev] || abbrev;

      if (this.lastHovered !== fullName) {
        this.lastHovered = fullName;
        // Centro de la constelación para worldToScreen
        const positions = constellationHit.userData.positions as number[];
        let cx = 0,
          cy = 0,
          cz = 0;
        const count = positions.length / 3;
        for (let i = 0; i < positions.length; i += 3) {
          cx += positions[i];
          cy += positions[i + 1];
          cz += positions[i + 2];
        }
        const center = vec3.fromValues(cx / count, cy / count, cz / count);
        this.onObjectHover.emit({
          name: fullName,
          object: { userData: constellationHit.userData },
          point: this.worldToScreen(center),
        });
      }
      return;
    }

    // Sin hover
    if (this.lastHovered !== null) {
      this.lastHovered = null;
      this.onObjectHover.emit(null);
    }
  }

  public worldToScreen(pos: vec3): { x: number; y: number } {
    const view = this.motor.getCamera().getViewMatrix();
    const proj = this.motor.getCamera().getProjectionMatrix();

    // View-Projection
    const vp = mat4.create();
    mat4.multiply(vp, proj, view);

    // Transformar punto al clip space
    const clip = vec3.transformMat4(vec3.create(), pos, vp);

    // NDC → pantalla
    const x = (clip[0] * 0.5 + 0.5) * window.innerWidth;
    const y = (-clip[1] * 0.5 + 0.5) * window.innerHeight;

    return { x, y };
  }

  private restoreCameraState() {
    if (!this.previousCameraState) return;
    this.isFocused = false;
    const cam = this.motor.getCamera();
    
    /*vec3.copy(cam['cameraPitch'], this.previousCameraState.pitch);
    cam['cameraYaw'] = this.previousCameraState.yaw;*/

    cam.setYaw(cam.getFlyToData()['yawFinal']);
    cam.setPitch(cam.getFlyToData()['pitchFinal']);

    cam.updateCameraPosition();

    cam.flyTo(
      this.previousCameraState.target,
      1,
      0.00001,
      false,
      () => {
        // Restaurar todas las estrellas
        if (this.starsResource) {
          this.starsResource.resetDrawRange();
        }
        this.showAll();
      }
    );
    // this.showAll();
  }

  async init(canvas: ElementRef<HTMLCanvasElement>) {
    canvas.nativeElement.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.mouseMoved = false;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    canvas.nativeElement.addEventListener('mousemove', (e) => {
      if (!this.mouseDown) return;

      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;

      // 🔥 umbral de movimiento (clave)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.mouseMoved = true;
      }
    });

    canvas.nativeElement.addEventListener('mouseup', (e) => {
      this.mouseDown = false;

      // 👉 SOLO si NO se movió → es click real
      if (!this.mouseMoved) {
        this.handleClick(e, canvasEl);
      }
    });

    const canvasEl = canvas.nativeElement;

    // Obtener contexto WebGL
    const gl = canvasEl.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 no soportado');
    this.gl = gl;

    //Crear motor
    this.motor = new Motor(gl, this);

    this.constellationState.showConstellations$.subscribe((show) => {
      if (show) {
        this.showLines = true;
        this.showConstellations();
      } else {
        this.showLines = false;
        this.hideConstellations();
      }
    });

    this.constellationState.showConstellationsArt$.subscribe((show) => {
      if (show) {
        this.showConstellationsArt();
        this.showArt = true;
      } else {
        this.showArt = false;
        this.hideConstellationsArt();
      }
    });

    this.constellationState.showSkybox$.subscribe((enabled) => {
      if (this.landscape) {
        this.landscape.setVisible(enabled);
        this.landscapeChanged = this.landscape.isVisible();
      }
    });

    //Habilitar opciones básicas
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Backface culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);

    // Configurar cámara
    this.setupCamera(canvasEl);

    //Crear shader de estrellas
    await this.createStarShader();

    // ================================================
    //    Comentado de momento para probar
    //    porque no se visualiza correctamente
    //    y hay un montón de errores en la consola
    // ================================================

    await this.createLineSegmentShader(); // <-- Crear shader de líneas
    await this.createLineShader(); // <-- Crear shader de líneas
    await this.createSpriteShader();

    // Crear línea de horizonte
    await this.addHorizonLine(); // <-- La agregamos aquí
    await this.addCompassLabels();

    // ================================================

    // Leer shaders directamente
    this.vsPlanet = await (
      await fetch('assets/shaders/PlanetVertexShader.glsl')
    ).text();
    this.fsPlanet = await (
      await fetch('assets/shaders/PlanetFragmentShader.glsl')
    ).text();

    // Creamos shader común para planetas
    this.planetShader = await this.motor.crearShader(
      'planet_shader',
      this.vsPlanet,
      this.fsPlanet,
    );

    // Creamos material para planetas
    this.basicMaterial = await this.motor.crearMaterial(
      'planet_material',
      ENGINE_CONFIG.PLANET_MATERIAL_PATH,
      /*this.planetShader,*/
    );

    // Creamos shader para skybox
    const vsLandscape = await (
      await fetch('assets/shaders/LandscapeVertexShader.glsl')
    ).text();
    const fsLandscape = await (
      await fetch('assets/shaders/LandscapeFragmentShader.glsl')
    ).text();

    this.landscapeShader = await this.motor.crearShader(
      'landscape_shader',
      vsLandscape,
      fsLandscape,
    );

    /*this.landscapeShader = await this.createShader(
      'landscape_shader',
      'assets/shaders/PlanetVertexShader.glsl',
      'assets/shaders/PlanetFragmentShader.glsl'
    );*/

    // Añadimos skybox
    await this.addSkybox();

    /*await this.createPlanet(
      'm',
      'assets/models/the_moon.glb',
      [0, 0, 0],
      [0.1, 0.1, 0.1],
      [0, 0, 0],
      this.planetShader
    );*/
    /*await this.createPlanet(
      'tierra_noche',
      'assets/models/Tierra_Nocturna.glb',
      [270, 0, 180],
      [0.001, 0.001, 0.001],
      [0, 1, 0],
      this.planetShader
    );*/

    /*Prueba de estrellas,cuando se tenga una mejor cámara,ajustar CELESTIAL_SPHERE_RADIUS a la cantidad necesaria */
    //await this.testStars();

    // Prueba Luna
    this.vsMoon = await (
      await fetch('assets/shaders/MoonVertexShader.glsl')
    ).text();
    this.fsMoon = await (
      await fetch('assets/shaders/MoonFragmentShader.glsl')
    ).text();
    // Creamos shader
    this.moonShader = await this.motor.crearShader(
      'moon_shader',
      this.vsMoon,
      this.fsMoon,
    );

    this.initHoverDetection(canvasEl);
    // Cargamos modelo
    /*this.createPlanet(
      'saturn',
      'assets/models/the_moon.glb',
      [270, 0, 180],
      [1, 1, 1],
      [0, 1, 0],
      this.planetShader
    );*/

    /*// Crear shader para landscape
    this.vsLandscape = await (
      await fetch('assets/shaders/LandscapeVertexShader.glsl')
    ).text();
    this.fsLandscape = await (
      await fetch('assets/shaders/LandscapeFragmentShader.glsl')
    ).text();

    // Creamos shader común para planetas
    this.landscapeShader = await this.motor.crearShader(
      'landscape_shader',
      this.vsLandscape,
      this.fsLandscape,
    );*/
  }

  private setupCamera(canvas: HTMLCanvasElement) {
    /*  mat4.lookAt(
      this.view,
      this.cameraPosition,
      [0,0,0],
      [0,1,0]
    );

    mat4.perspective(
      this.projection,
      45 * Math.PI / 180,
      canvas.width / canvas.height,
      0.1,
      200
    );*/

    //Crear la cámara
    //this.camera = new Camera();

    // Posición inicial de la cámara
    this.motor.getCamera().setPosition(0, 0, 4); // Ajusta según la escala de tus modelos
    this.motor.getCamera().lookAt(0, 0, 0);

    //Redimensionar canvas y actualizar perspectiva
    this.resizeCanvas(canvas);

    this.motor.getCamera().initCameraControls(canvas);
    this.motor.getCamera().updateCameraPosition(); // Posición inicial

    //Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', () => this.resizeCanvas(canvas));
  }

  private handleClick(event: MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const ray = this.screenToWorldRay(x, y);

    const planetHit = this.raycast(ray.origin, ray.direction);

    if (planetHit) {
      this.focusObject(planetHit);
      this.onObjectClick.emit({
        name: planetHit.name,
        object: {
          userData: {
            _id: planetHit.userData?._id,
            ...planetHit.userData,
          },
        },
      });
      return;
    }

    // 🔹 2. Si no hay planeta → estrellas
    const starHit = this.raycastStars(ray.origin, ray.direction);

    if (starHit) {
      this.focusStar(starHit.position);
      this.onObjectClick.emit({
        name: starHit.proper || `HR ${starHit.hr}`,
        object: {
          userData: {
            ...starHit,
          },
        },
      });
      return;
    }

    const constellationHit = this.raycastConstellations(
      ray.origin,
      ray.direction,
    );

    if (constellationHit) {
      this.focusConstellation(constellationHit);
      this.onObjectClick.emit({
        name: constellationHit.userData?.name,
        object: {
          userData: constellationHit.userData,
        },
      });

      return;
    }
  }

  private raycast(origin: vec3, dir: vec3) {
    let closest: any = null;
    let minDist = Infinity;

    for (const [name, obj] of this.planets) {
      const pos = obj.node.getTranslation(); // necesitas este método
      const radius = obj.node.getScale()[0]; // aproximación

      const hit = this.raySphereIntersection(origin, dir, pos, radius);

      if (hit && hit < minDist) {
        minDist = hit;
        closest = obj.node;
      }
    }

    return closest;
  }

  private focusStar(position: vec3) {
    this.isFocused = true;

    // Buscar índice en cachedStars
    let foundIndex = -1;
    for (let i = 0; i < this.cachedStars.length; i++) {
      const star = this.cachedStars[i];
      const starData = this.starMap.get(star.hr);
      if (!starData) continue;

      const sp = starData.position;
      if (
        Math.abs(sp[0] - position[0]) < 0.01 &&
        Math.abs(sp[1] - position[1]) < 0.01 &&
        Math.abs(sp[2] - position[2]) < 0.01
      ) {
        foundIndex = i;
        break;
      }
    }

    this.saveCameraState(foundIndex);

    const camera = this.motor.getCamera();

    /*vec3.copy(camera['cameraTarget'], position);
    camera['cameraDistance'] = 15;

    const pos = camera.getPosition();
    const dir = vec3.create();
    vec3.subtract(dir, pos, position);
    vec3.normalize(dir, dir);

    camera['cameraYaw'] = Math.atan2(dir[0], dir[2]);
    camera['cameraPitch'] = Math.asin(dir[1]);*/
    // camera.updateCameraPosition();
    camera.flyTo(position, 1, 15, true, ()=> {
      // Limitar el draw call a solo esa estrella
      if (foundIndex !== -1 && this.starsResource) {
        this.starsResource.setDrawRange(foundIndex, 1);
      }

      this.hideAllExcept('star');
    });
  }

  private raycastStars(origin: vec3, dir: vec3) {
    let closestStar: any = null;
    let minDist = Infinity;

    for (const [hr, starObj] of this.starMap) {
      const pos = vec3.fromValues(
        starObj.position[0],
        starObj.position[1],
        starObj.position[2],
      );

      const dist = this.distancePointToRay(pos, origin, dir);

      // 🔥 umbral clave (ajústalo)
      if (dist < 5 && dist < minDist) {
        minDist = dist;
        closestStar = { hr, position: pos, ...starObj.data };
      }
    }

    return closestStar;
  }

  private distancePointToRay(
    point: vec3,
    rayOrigin: vec3,
    rayDir: vec3,
  ): number {
    const v = vec3.create();
    vec3.subtract(v, point, rayOrigin);

    const t = vec3.dot(v, rayDir);

    const closestPoint = vec3.create();
    vec3.scaleAndAdd(closestPoint, rayOrigin, rayDir, t);

    return vec3.distance(point, closestPoint);
  }

  private raySphereIntersection(
    origin: vec3,
    dir: vec3,
    center: vec3,
    radius: number,
  ): number | null {
    const L = vec3.create();
    vec3.subtract(L, center, origin);

    const tca = vec3.dot(L, dir);
    const d2 = vec3.dot(L, L) - tca * tca;

    if (d2 > radius * radius) return null;

    const thc = Math.sqrt(radius * radius - d2);
    const t0 = tca - thc;

    return t0 > 0 ? t0 : null;
  }

  private screenToWorldRay(x: number, y: number) {
    const invVP = mat4.create();

    const view = this.motor.getCamera().getViewMatrix();
    const proj = this.motor.getCamera().getProjectionMatrix();

    const vp = mat4.create();
    mat4.multiply(vp, proj, view);
    mat4.invert(invVP, vp);

    const nearPoint = vec3.fromValues(x, y, -1);
    const farPoint = vec3.fromValues(x, y, 1);

    const nearWorld = vec3.transformMat4(vec3.create(), nearPoint, invVP);
    const farWorld = vec3.transformMat4(vec3.create(), farPoint, invVP);

    const dir = vec3.create();
    vec3.subtract(dir, farWorld, nearWorld);
    vec3.normalize(dir, dir);

    return {
      origin: nearWorld,
      direction: dir,
    };
  }

  private async createPlanet(
    nombre: string,
    file: string,
    rot: vec3,
    scale: vec3,
    trans: vec3,
    shader: ResourceShader,
    _id?: string,
  ) {
    const root = this.motor.getRoot();
    // Crear shader independiente para este planeta
    // Usamos los mismos VS/FS, pero es un ResourceShader separado
    /*const shader = await this.motor.crearShader(
      nombre + '_shader', // nombre único
      this.vsPlanet,
      this.fsPlanet,
    );*/
    const material = this.basicMaterial.clone(nombre + '_material');
    if (nombre === 'Saturno') material.setData({ cull: false });

    // Cargar GLB usando los parámetros
    const node = await this.motor.cargarGLB(
      nombre,
      file,
      shader,
      material,
      root,
    );

    node.userData = {
      _id: _id,
      name: nombre,
    };
    // Aplicar rotación y escala pasadas
    node.setTranslation(trans);
    node.setScale(scale);
    node.setRotation(rot);

    this.planets.set(nombre, { node, shader });

    return node; // devuelvo la referencia para manipularla luego
  }

  start() {
    let lastTime = performance.now();
    const render = (time: number) => {
      const deltaTime = (time - lastTime) / 1000; // segundos
      lastTime = time;

      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.motor.getCamera().updateFlyAnimation(deltaTime);

      // Actualizar uniforms de planetas
      for (const [name, p] of this.planets) {
        if (
          p.node.getEntity().getResource() &&
          p.node.getEntity().getResource().isLoaded() &&
          p.shader &&
          p.shader.isLoaded()
        ) {
        }
      }

      this.gl.depthMask(true);
      this.gl.enable(this.gl.DEPTH_TEST);

      this.motor.dibujar();

      requestAnimationFrame(render);
    };

    // render();
    requestAnimationFrame(render);
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;

    //Tamaño CSS del canvas
    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);

    //Ajustar buffer WebGL solo si es necesario
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    //Ajustar viewport
    this.gl.viewport(0, 0, canvas.width, canvas.height);

    //Actualizar la perspectiva de la cámara
    if (this.motor.getCamera()) {
      const aspect = canvas.width / canvas.height;

      this.motor.getCamera().setPerspective(
        75, // FOV en grados
        aspect, // aspect ratio real del canvas
        0.1, // near
        // 10, // far
        ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS * 2, // far
      );
    }
  }

  public async showStars(stars: any[], lat: number, lon: number, date: Date) {
    const observer = new Astronomy.Observer(lat, lon, 0);
    const time = Astronomy.MakeTime(date);
    const rot = Astronomy.Rotation_EQJ_HOR(time, observer);

    const radius = ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS;

    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    this.cachedStars = [];

    for (const star of stars) {
      if (star.proper === 'Sol') continue;

      const ra = (star.ra * Math.PI) / 12;
      const dec = (star.dec * Math.PI) / 180;
      const cosDec = Math.cos(dec);

      const vec = new Astronomy.Vector(
        cosDec * Math.cos(ra),
        cosDec * Math.sin(ra),
        Math.sin(dec),
        time,
      );

      const vr = Astronomy.RotateVector(rot, vec);

      const x = vr.y * radius;
      const y = vr.z * radius;
      const z = vr.x * radius;

      // GUARDAR POSICIÓN POR HR
      if (star.hr) {
        this.starMap.set(star.hr, {
          position: [x, y, z],
          data: star,
        });
      }

      positions.push(x, y, z);
      this.cachedStars.push(star);

      const starColor = this.ciToRGB(star.ci);
      colors.push(starColor[0], starColor[1], starColor[2]);

      const baseSize = 4;
      const maxSize = 17;
      const size = Math.max(
        baseSize,
        Math.min(maxSize, maxSize - star.mag * 2),
      );
      sizes.push(size);
    }

    const points = await this.motor.crearPoints(
      'stars_debug',
      new Float32Array(positions),
      new Float32Array(colors),
      new Float32Array(sizes),
      this.starShader,
    );

    this.starsResource = points.getResource() as ResourcePoints;
    const root = this.motor.getRoot();

    // Desactivar depth write temporalmente para que se vean siempre
    this.gl.depthMask(false);

    this.starsNode = this.motor.crearNodo(
      root,
      points,
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    );

    this.gl.depthMask(true);
  }

  private getStarPositionByHR(hr: number): [number, number, number] | null {
    const star = this.starMap.get(hr);
    return star ? star.position : null;
  }

  public ciToRGB(ci: number): [number, number, number] {
    if (ci < 0) return [0.6, 0.7, 1.0];
    if (ci < 0.3) return [0.7, 0.8, 1.0];
    if (ci < 0.6) return [1.0, 1.0, 1.0];
    if (ci < 1.0) return [1.0, 1.0, 0.6];
    if (ci < 1.5) return [1.0, 0.8, 0.6];

    return [1.0, 0.6, 0.6];
  }

  private async createStarShader() {
    const vs = await (
      await fetch('assets/shaders/StarVertexShader.glsl')
    ).text();
    const fs = await (
      await fetch('assets/shaders/StarFragmentShader.glsl')
    ).text();

    this.starShader = await this.motor.crearShader('stars', vs, fs);
  }

  private async createShader(
    name: string,
    vsPath: string,
    fsPath: string,
  ): Promise<ResourceShader> {
    const vs = await (await fetch(vsPath)).text();
    const fs = await (await fetch(fsPath)).text();

    const shader = await this.motor.crearShader(name, vs, fs);

    return shader;
  }

  // 1️⃣ Crear shader para sprites (una vez, al iniciar)
  private async createSpriteShader() {
    const vs = await (
      await fetch('assets/shaders/SpriteVertexShader.glsl')
    ).text();
    const fs = await (
      await fetch('assets/shaders/SpriteFragmentShader.glsl')
    ).text();
    const vsCon = await (
      await fetch('assets/shaders/ConstellationVertexShader.glsl')
    ).text();

    this.spriteShader = await this.motor.crearShader('sprite_shader', vs, fs);
    this.constellationShader = await this.motor.crearShader('constellationShader', vsCon, fs);
  }

  /*Prueba estrellas (Comentarla en caso de conectarse con facade-component.ts) */
  /*public async testStars(): Promise<void> {

  const fakeStars = [
    { ra: 5, dec: 45, mag: 5, ci: 0.3, proper: "Test1" },
    { ra: 10, dec: -10, mag: 10, ci: 1.0, proper: "Test2" },
    { ra: 15, dec: 20, mag: 0, ci: -0.2, proper: "Test3" }
  ];

  const lat = 40.42;
  const lon = -3.7;
  const date = new Date();


  await this.showStars(fakeStars, lat, lon, date);
}
*/

  public updateCelestialPositions(date: Date, lat: number, lon: number): void {
    if (!this.motor) return;
    if (this.cachedStars.length === 0) return;
    if (this.isFocused) return;

    const observer = new Astronomy.Observer(lat, lon, 0);
    const time = Astronomy.MakeTime(date);
    const rot = Astronomy.Rotation_EQJ_HOR(time, observer);
    const radius = ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS;

    // ── 1. ESTRELLAS ──────────────────────────────────────────
    const newPositions = new Float32Array(this.cachedStars.length * 3);

    for (let i = 0; i < this.cachedStars.length; i++) {
      const star = this.cachedStars[i];

      const ra = (star.ra * Math.PI) / 12;
      const dec = (star.dec * Math.PI) / 180;
      const cosDec = Math.cos(dec);

      const vec = new Astronomy.Vector(
        cosDec * Math.cos(ra),
        cosDec * Math.sin(ra),
        Math.sin(dec),
        time,
      );
      const vr = Astronomy.RotateVector(rot, vec);

      const x = vr.y * radius;
      const y = vr.z * radius;
      const z = vr.x * radius;

      newPositions[i * 3] = x;
      newPositions[i * 3 + 1] = y;
      newPositions[i * 3 + 2] = z;

      // Actualizar starMap para que raycast siga funcionando
      if (star.hr) {
        this.starMap.set(star.hr, { position: [x, y, z], data: star });
      }
    }

    // Subir a GPU
    if (this.starsResource) {
      this.starsResource.updatePositions(this.gl, newPositions);
    }

    // ── 2. PLANETAS, LUNA Y SOL ───────────────────────────────
    for (const b of ENGINE_CONFIG.BODIES) {
      const eq = Astronomy.Equator(b.body, time, observer, true, true);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');

      const alt = (hor.altitude * Math.PI) / 180;
      const az = (hor.azimuth * Math.PI) / 180;

      const x = radius * Math.cos(alt) * Math.sin(az);
      const y = radius * Math.sin(alt);
      const z = radius * Math.cos(alt) * Math.cos(az);

      if (b.name === 'Sun') {
        this.lightPosition = { x: -x, y, z };
        this.motor.getPointLight().setPosition(vec3.fromValues(-x, y, z));
      }

      const planet = this.planets.get(b.name);
      if (planet) {
        planet.node.setTranslation(vec3.fromValues(-x, y, z));
        if (b.name === 'Moon') this.showMoon();
      }
    }

    // ── 3. CONSTELACIONES ─────────────────────────────────────
    for (const meta of this.constellationMeta) {
      const segPositions: number[] = [];

      for (const [hr1, hr2] of meta.hrPairs) {
        const p1 = this.starMap.get(hr1);
        const p2 = this.starMap.get(hr2);
        if (!p1 || !p2) continue;

        segPositions.push(
          p1.position[0],
          p1.position[1],
          p1.position[2],
          p2.position[0],
          p2.position[1],
          p2.position[2],
        );
      }

      if (segPositions.length > 0) {
        meta.resource.updatePositions(this.gl, new Float32Array(segPositions));
      }
    }

    // ── 4. SPRITES DE CONSTELACIONES ─────────────────────
    for (const meta of this.constellationArtMeta) {
      let cx = 0,
        cy = 0,
        cz = 0;
      let count = 0;

      for (const hr of meta.hrList) {
        const star = this.starMap.get(hr);
        if (!star) continue;

        cx += star.position[0];
        cy += star.position[1];
        cz += star.position[2];
        count++;
      }

      if (count === 0) continue;

      cx /= count;
      cy /= count;
      cz /= count;

      meta.node.setTranslation(vec3.fromValues(cx, cy, cz));

      (meta.node.getEntity() as Sprite).setPosition([cx, cy, cz]);
    }
  }

  // ==================================================
  // Visualización de estrellas y planetas
  // ==================================================

  /**************************************************************
   * Métodos a implementar
   */

  private async createLineShader() {
    const vs = await (
      await fetch('assets/shaders/LineVertexShader.glsl')
    ).text();
    const fs = await (
      await fetch('assets/shaders/LineFragmentShader.glsl')
    ).text();

    this.lineShader = await this.motor.crearShader('line_shader', vs, fs);
  }

  private async createLineSegmentShader() {
    const vs = await (
      await fetch('assets/shaders/LineVertexShader.glsl')
    ).text();
    const fs = await (
      await fetch('assets/shaders/LineSegmentFragmentShader.glsl')
    ).text();

    this.linesegmentShader = await this.motor.crearShader(
      'line_segment_shader',
      vs,
      fs,
    );
  }
  public removeFavoriteMarker(id: string): void {}
  public createFavoriteMarker(
    id: string,
    lat: number,
    lon: number,
    visible = true,
    offset: number,
  ): void {}
  public clearFavoriteMarkers(): void {}
  public createUserLocationMarker(
    lat: number,
    lon: number,
    visible = true,
    offset: number,
  ): void {}
  public setUserLocationMarkerVisible(
    visible: boolean,
    lat?: number,
    lon?: number,
  ): void {}

  public clearScene(): void {}
  public async createScene(
    canvas: ElementRef<HTMLCanvasElement>,
  ): Promise<void> {
    if (this.sceneCreated) return;

    this.sceneCreated = true;
    await this.init(canvas);
    // await this.loadAllPlanets();
    // this.start();
  }

  public async loadModel(
    name: string,
    distance: number,
    modelPath: string,
    position: [number, number, number],
    scale: number = 1,
    rotation?: [number, number, number],
    visible: boolean = true,
    onLoaded?: () => void,
  ): Promise<void> {}
  public setModelVisible(name: string, visible: boolean): void {}
  public disableObjectClickDetection(): void {}
  public enableEarthClickDetection(): void {}
  public disableEarthClickDetection(): void {}
  public enableObjectClickDetection(): void {}

  public focusObject(obj: any): void {
    this.isFocused = true;
    const camera = this.motor.getCamera();

    // guardar estado ANTES de cambiar
    this.saveCameraState(obj);

    const target = obj.getTranslation();

    /*vec3.copy(camera['cameraTarget'], target);

    const scale = obj.getScale()[0];
    camera['cameraDistance'] = scale * 1.5;

    const pos = camera.getPosition();

    const dir = vec3.create();
    vec3.subtract(dir, pos, target);
    vec3.normalize(dir, dir);

    camera['cameraYaw'] = Math.atan2(dir[0], dir[2]);
    camera['cameraPitch'] = Math.asin(dir[1]);

    camera.updateCameraPosition();*/

    const distance = obj.getScale()[0] * 1.5;

    camera.flyTo(target, 1, distance, true, ()=> {
      this.hideAllExcept('planet', obj);
    });

    // Solo mostrar el planeta seleccionado
    //this.hideAllExcept('planet', obj);
  }

  private azToXYZ(
    azDeg: number,
    radius: number,
    verticalOffset: number = 0,
  ): [number, number, number] {
    const az = (azDeg * Math.PI) / 180;
    const alt = 0; // horizonte

    const x = radius * Math.cos(alt) * Math.sin(az);
    const y = radius * Math.sin(alt) + verticalOffset; // <-- sumar offset
    const z = radius * Math.cos(alt) * Math.cos(az);

    return [-x, y, z];
  }
  public resetZoom(): void {}
  public animate(): void {
    this.start();
  }
  public dispose(): void {
    // Detener render loop
    this.sceneCreated = false;

    // Liberar todos los recursos cargados por el motor
    this.motor.liberarTodo();

    // Limpiar sprites de brújula
    this.compassSprites = [];

    // Limpiar línea de horizonte
    this.horizonLine = undefined!;

    // Limpiar planetas
    this.planets.clear();

    // Nullificar referencias importantes
    this.motor = undefined!;
    this.gl = undefined!;
    this.starShader = undefined!;
    this.planetShader = undefined!;
    this.moonShader = undefined!;
    this.spriteShader = undefined!;
    this.lineShader = undefined!;
    this.linesegmentShader = undefined!;
  }
  public async drawConstellationsFromData(data: string): Promise<void> {
    if (this.constellationsCreated) return; // 🚀 CLAVE

    this.constellationsCreated = true;

    const root = this.motor.getRoot();

    // Limpiar anteriores
    this.constellationLines = [];
    this.constellationSprites = [];

    const lines = data.split('\n');

    for (const rawLine of lines) {
      if (!rawLine.trim() || rawLine.startsWith('#')) continue;

      const tokens = rawLine.trim().split(/\s+/);

      const constellation = tokens[0];
      const size = parseInt(tokens[6]);
      const count = parseInt(tokens[8]);

      if (isNaN(count)) continue;

      const hrNumbers = tokens.slice(9).map((n) => parseInt(n));

      const positions: number[] = [];

      //Construir segmentos
      for (let i = 0; i < hrNumbers.length - 1; i++) {
        const star1 = this.getStarPositionByHR(hrNumbers[i]);
        const star2 = this.getStarPositionByHR(hrNumbers[i + 1]);

        if (!star1 || !star2) continue;

        positions.push(
          star1[0],
          star1[1],
          star1[2],
          star2[0],
          star2[1],
          star2[2],
        );
      }

      if (positions.length === 0) continue;

      //Crear líneas (IMPORTANTE: NO loop)
      const lineEntity = await this.motor.crearLineSegments(
        'const_' + constellation,
        new Float32Array(positions),
        this.linesegmentShader,
      );

      const hrPairs: [number, number][] = [];
      for (let i = 0; i < hrNumbers.length - 1; i++) {
        hrPairs.push([hrNumbers[i], hrNumbers[i + 1]]);
      }

      this.constellationMeta.push({
        constellation,
        hrPairs,
        resource: lineEntity.getResource() as ResourceLineSegment,
      });

      const rotZ = parseFloat(tokens[7]);
      const scale = parseFloat(tokens[2]);

      const tx = parseFloat(tokens[3]);
      const ty = parseFloat(tokens[4]);
      const tz = parseFloat(tokens[5]);

      const node = this.motor.crearNodo(
        root,
        lineEntity,
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      );

      node.userData = {
        type: 'constellation',
        name: constellation,
        constellation: constellation,
        hitRadius: 15,
        positions: positions,
      };

      node.setVisible(this.showLines); // 🔥 CLAVE
      this.constellationLineNodes.push(node);

      if (!['Pup', 'Ser', 'Vel', 'Crux'].includes(constellation)) {
        // Crear sprite (arte)
        await this.createConstellationSprite(
          constellation,
          positions,
          rotZ,
          scale,
          tx,
          ty,
          tz,
          size,
          hrNumbers,
        );
      }
    }
  }

  private distancePointToSegment(p: vec3, a: vec3, b: vec3): number {
    const ab = vec3.create();
    const ap = vec3.create();

    vec3.subtract(ab, b, a);
    vec3.subtract(ap, p, a);

    const t = Math.max(0, Math.min(1, vec3.dot(ap, ab) / vec3.dot(ab, ab)));

    const closest = vec3.create();
    vec3.scaleAndAdd(closest, a, ab, t);

    return vec3.distance(p, closest);
  }

  private focusConstellation(node: any): void {
    this.saveCameraState(node); // 🔥 guardar estado antes de enfocar
    //this.hideAllExcept('constellation', node); // 🔥
    const camera = this.motor.getCamera();

    const positions = node.userData.positions as number[];
    if (!positions || positions.length === 0) return;

    // 1️⃣ calcular centro de la constelación
    let cx = 0,
      cy = 0,
      cz = 0;
    const count = positions.length / 3;

    for (let i = 0; i < positions.length; i += 3) {
      cx += positions[i];
      cy += positions[i + 1];
      cz += positions[i + 2];
    }

    const center = vec3.fromValues(cx / count, cy / count, cz / count);

    // 2️⃣ calcular distancia de cámara (ajústalo si quieres más zoom)
    const distance = 500;

    /*const camPos = camera.getPosition();

    const dir = vec3.create();
    vec3.subtract(dir, camPos, center);
    vec3.normalize(dir, dir);

    const newPos = vec3.create();
    vec3.scaleAndAdd(newPos, center, dir, distance);

    camera.setPosition(newPos[0], newPos[1], newPos[2]);
    camera.lookAt(center[0], center[1], center[2]);*/

    camera.flyTo(center, 1, distance, true, ()=> {
      this.hideAllExcept('constellation', node);
    });
  }

  private raycastConstellations(origin: vec3, dir: vec3) {
    let closest: any = null;
    let minDist = Infinity;

    const threshold = 10; // 🔥 importante: escala real de esfera

    for (const node of this.constellationLineNodes) {
      if (!node.isVisible()) continue;
      const positions = node.userData.positions as number[];
      if (!positions) continue;

      for (let i = 0; i < positions.length - 3; i += 3) {
        const a = vec3.fromValues(
          positions[i],
          positions[i + 1],
          positions[i + 2],
        );

        const b = vec3.fromValues(
          positions[i + 3],
          positions[i + 4],
          positions[i + 5],
        );

        // 🔥 AQUÍ está el cambio importante
        const dist = this.distancePointToSegment(
          this.closestPointOnRayToSegment(origin, dir, a, b),
          a,
          b,
        );

        if (dist < threshold && dist < minDist) {
          minDist = dist;
          closest = node;
        }
      }
    }

    return closest;
  }

  private closestPointOnRayToSegment(
    rayOrigin: vec3,
    rayDir: vec3,
    a: vec3,
    b: vec3,
  ): vec3 {
    // simplificación: proyectamos ambos extremos al rayo y tomamos el mejor
    const p1 = this.projectPointOnRay(a, rayOrigin, rayDir);
    const p2 = this.projectPointOnRay(b, rayOrigin, rayDir);

    const d1 = vec3.distance(a, p1);
    const d2 = vec3.distance(b, p2);

    return d1 < d2 ? p1 : p2;
  }

  private projectPointOnRay(point: vec3, origin: vec3, dir: vec3): vec3 {
    const v = vec3.create();
    vec3.subtract(v, point, origin);

    const t = vec3.dot(v, dir);

    const out = vec3.create();
    vec3.scaleAndAdd(out, origin, dir, t);

    return out;
  }

  public showConstellations(): void {
    for (const node of this.constellationLineNodes) {
      node.setVisible(true);
    }
  }

  public hideConstellations(): void {
    for (const node of this.constellationLineNodes) {
      node.setVisible(false);
    }
  }

private async createConstellationSprite(
  constellation: string,
  positions: number[],
  rotZ: number,
  scale: number,
  tx: number,
  ty: number,
  tz: number,
  imagesize: number,
  hrList: number[]
) {
  // Centro
  let cx = 0, cy = 0, cz = 0;
  const count = positions.length / 3;

  for (let i = 0; i < positions.length; i += 3) {
    cx += positions[i];
    cy += positions[i + 1];
    cz += positions[i + 2];
  }

  cx /= count;
  cy /= count;
  cz /= count;

  // textura
  const texture = await this.motor.cargarTexturaDesdeURL(
    `assets/constellation-art/art-transparent/${constellation}(1).png`,
  );

  const spriteRes = await this.motor.crearSprite(
    'art_' + constellation,
    texture,
    imagesize,
  );

  const sprite = new Sprite(spriteRes, [cx, cy, cz], this.constellationShader);

  const specialConstellations = new Set([
      'And',
      'Ari',
      'Aqr',
      'Crt',
      'Tri',
      'TrA',
      'Oph',
      'Phe',
      'Equ',
      'Cep',
      'Cha',
      'Lup',
      'Scl',
      'Phe',
      'PsA',
      'Lac',
      'Cyg',
      'Cir',
      'Psc',
      'Nor',
      'Oct',
      'Sct',
      'Sco',
      'Dor',
      'Pic',
      'Sgr',
      'Cen',
      'Boo',
      'Sge',
      'UMa',
      'CVn',
      'Mon',
      'Ori',
      'Com',
      'Gem',
      'Lyn',
      'Cam',
      'Dra',
      'UMi',
      'Tau',
      'Aur',
      'Her',
      'Cru',
      'Peg',
      'Eri',
      'For',
    ]);if (specialConstellations.has(constellation)){
        sprite.setRotationZ(rotZ);
    }

  const root = this.motor.getRoot();

  const node = this.motor.crearNodo(
    root,
    sprite,
    [cx, cy, cz],
    [scale, scale, scale],
    [0, 0, 0] // 👈 IMPORTANTE: no uses rotZ aquí
  );

  node.userData = { name: constellation };

  node.setVisible(this.showArt);

  this.constellationArtNodes.push(node);
  this.constellationArtMeta.push({ node, hrList });

}

  public showConstellationsArt(): void {
    for (const node of this.constellationArtNodes) {
      node.setVisible(true);
    }
  }

  public hideConstellationsArt(): void {
    for (const node of this.constellationArtNodes) {
      node.setVisible(false);
    }
  }

  // Visualizar los planetas, Luna y Sol
  public async showPlanet(
    lat: number,
    long: number,
    date: Date,
  ): Promise<void> {
    const observer = new Astronomy.Observer(lat, long, 0);

    const time = Astronomy.MakeTime(date);
    const radius = ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS;
    const scale_factor = ENGINE_CONFIG.CORRECTION_FACTOR;

    for (const b of ENGINE_CONFIG.BODIES) {
      // Coordenadas ecuatoriales
      const eq = Astronomy.Equator(b.body, time, observer, true, true);

      // Coordenadas horizontales
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
      const alt = (hor.altitude * Math.PI) / 180;
      const az = (hor.azimuth * Math.PI) / 180;

      const x = radius * Math.cos(alt) * Math.sin(az);
      const y = radius * Math.sin(alt);
      const z = radius * Math.cos(alt) * Math.cos(az);

      // Guardar la posición del Sol
      if (b.name === 'Sun') {
        this.lightPosition.x = -x;
        this.lightPosition.y = y;
        this.lightPosition.z = z;
        const pos = vec3.fromValues(-x, y, z);

        this.motor.getPointLight().setPosition(pos);
      }

      //
      if (this.planets.has(b.name)) {
        const model = this.planets.get(b.name)!;
        model.node.setTranslation(vec3.fromValues(-x, y, z));
        if (b.name === 'Moon') {
          this.showMoon();
        }
      } else {
        // Cargamos los modelos de los planetas
        if (b.name !== 'Moon') {
          await this.createPlanet(
            b.name,
            b.modelPath,
            [0, 0, 0],
            [
              b.size *
                ENGINE_CONFIG.CORRECTION_FACTOR *
                ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS,
              b.size *
                ENGINE_CONFIG.CORRECTION_FACTOR *
                ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS,
              b.size *
                ENGINE_CONFIG.CORRECTION_FACTOR *
                ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS,
            ],
            [-x, y, z],
            this.planetShader,
            b._id,
          );
        } else {
          await this.createPlanet(
            b.name,
            b.modelPath,
            [0, 0, 0], // Mirar rotación
            [
              b.size *
                ENGINE_CONFIG.CORRECTION_FACTOR *
                ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS,
              b.size *
                ENGINE_CONFIG.CORRECTION_FACTOR *
                ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS,
              b.size *
                ENGINE_CONFIG.CORRECTION_FACTOR *
                ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS,
            ],
            [-x, y, z],
            this.moonShader,
            b._id,
          );
          this.showMoon();
        }
      }
    }
  }

  // Visualizar la Luna
  public async showMoon(): Promise<void> {
    const moon = this.planets.get('Moon')!.node;

    if (!moon) return;

    // Mirar al centro
    moon.lookAt(vec3.fromValues(0, 0, 0));

    // Dirección del Sol en las coordenadas del mundo
    let sun = vec3.fromValues(
      this.lightPosition.x,
      this.lightPosition.y,
      this.lightPosition.z,
    );
    vec3.normalize(sun, sun);

    let sunWorld = vec3.clone(sun);
    vec3.scale(sunWorld, sunWorld, 100000);

    await this.applyMoonShader(moon, sunWorld);
  }
  private async applyMoonShader(mesh: any, sunWorld: vec3) {
    // Calculamos sunDir en coordenadas locales
    const modelMatrix = mesh.getWorldMatrix(); // 4x4
    const invModel = mat4.create();
    mat4.invert(invModel, modelMatrix);

    const sunLocal = vec3.transformMat4(vec3.create(), sunWorld, invModel);
    vec3.normalize(sunLocal, sunLocal);

    mesh.getEntity().setAdditionalUniform('sunDir', {
      type: '3fv',
      value: sunLocal,
    });
  }

  // public addHorizonCircle(): void {}
  public async addHorizonLine(): Promise<void> {
    const radius = ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS;
    const positions: number[] = [];

    for (let i = 0; i <= 360; i++) {
      const az = (i * Math.PI) / 180;

      const x = radius * Math.sin(az);
      const y = 0;
      const z = radius * Math.cos(az);

      positions.push(x, y, z);
    }

    const lineMesh = await this.motor.crearLineLoop(
      'horizon',
      new Float32Array(positions),
      this.lineShader,
    );

    const root = this.motor.getRoot();

    this.horizonNode = this.motor.crearNodo(
      root,
      lineMesh,
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    );

    this.horizonLine = lineMesh;
  }

  private createLabelTexture(text: string, size: number = 256): WebGLTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d', { alpha: true })!;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.55}px Arial`;

    ctx.fillText(text, size / 2, size / 2);

    const tex = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas,
    );

    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );

    return tex;
  }
  public async addCompassLabels(): Promise<void> {
    const radius = ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS;
    const labels = [
      { text: 'N', az: 0 },
      { text: 'E', az: 90 },
      { text: 'S', az: 180 },
      { text: 'W', az: 270 },
    ];

    const root = this.motor.getRoot();

    // Tamaño del quad relativo al radio de la esfera
    const quadSize = radius * 0.05; // Ajusta 0.05 según quieras letras más grandes/pequeñas

    const labelVerticalOffset = -quadSize * 0.5; // mitad del tamaño del quad para centrar
    for (const label of labels) {
      const [x, y, z] = this.azToXYZ(label.az, radius, labelVerticalOffset);

      const texture = this.createLabelTexture(label.text);

      const sprite = await this.motor.crearSprite(
        'compass_' + label.text,
        texture,
        // 100
        ENGINE_CONFIG.CELESTIAL_SPHERE_RADIUS / 10,
      );

      const entity = new Sprite(sprite, [x, y, z], this.spriteShader);

      const node = this.motor.crearNodo(
        root,
        entity,
        [x, y, z],
        [quadSize, quadSize, quadSize],
        [0, 0, 0],
      );

      node.setQueue(100000);

      this.compassNodes.push(node);
      this.compassSprites.push(entity);
    }
  }

  public removeClickMarker(): void {}
  public resizeRenderer(width: number, height: number): void {}

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .trim();
  }
  public async searchAndFocusByName(name: string): Promise<void> {
    if (!name) return;

    const normalized = this.normalize(name);

    // =========================
    // 1. Buscar PLANETAS
    // =========================
    for (const [planetName, planet] of this.planets) {
      if (this.normalize(planetName) === normalized) {
        this.focusObject(planet.node);

        this.onObjectClick.emit({
          name: planetName,
          object: {
            userData: {
              _id: planet.node.userData?._id,
              name: planetName,
            },
          },
        });

        return;
      }
    }

    // =========================
    // 2. Buscar CONSTELACIONES
    // =========================
    for (const node of this.constellationLineNodes) {
      const cname = node.userData?.name;

      const abbr = constellationsReverse[normalized];

      const target = abbr || name;

      if (cname === target) {
        this.focusConstellation(node);

        this.onObjectClick.emit({
          name: cname,
          object: {
            userData: node.userData,
          },
        });

        return;
      }
    }

    // =========================
    //  3. Buscar ESTRELLAS
    // =========================
    for (const [hr, star] of this.starMap) {
      const proper = star.data?.proper;
      const fallbackName = `HR ${hr}`;

      if (
        (proper && this.normalize(proper) === normalized) ||
        this.normalize(fallbackName) === normalized
      ) {
        const pos = vec3.fromValues(
          star.position[0],
          star.position[1],
          star.position[2],
        );

        this.focusStar(pos);

        this.onObjectClick.emit({
          name: proper || fallbackName,
          object: {
            userData: {
              ...star.data,
            },
          },
        });
        return;
      }
    }

    // console.warn('No se encontró coincidencia para:', name);
  }

  public onObjectClick = new EventEmitter<any>();
  public onEarthClick = new EventEmitter<{
    lat: number;
    lon: number;
    pos2D: { x: number; y: number };
  }>();

  async addSkybox() {
    const geometry = new SphereGeometry(
      // this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE,
      1,
      32,
      16,
    );

    const texResource = new ResourceTexture(
      'landscape_tex',
      '../../assets/images/skybox.png',
    );

    await this.motor.getResourceManager().cargar(texResource);
    const GPUTex = this.motor
      .getResourceManager()
      .obtener<ResourceTexture>('landscape_tex');

    const resourceMesh = new ResourceMesh(
      'landscape_mesh',
      geometry.getVertices(),
      geometry.getIndices(),
      geometry.getUVs(),
      geometry.getNormals(),
    );

    await this.motor.getResourceManager().cargar(resourceMesh);
    const resourceGPU = this.motor
      .getResourceManager()
      .obtener<ResourceMesh>('landscape_mesh');

    const mesh = new Mesh(
      resourceGPU,
      this.landscapeShader,
      this.basicMaterial.clone('landscape_material'),
      GPUTex.getTexture(),
    );

    mesh.setMaterialData({ transparent: true, depthWrite: false });

    this.landscape = this.motor.crearNodo(
      this.motor.getRoot(),
      mesh,
      [0, 0, 0],
      [
        -(this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE),
        this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE,
        -(this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE),
      ],
      [0, 0, 0],
    );

    this.landscape.setVisible(false);
    this.landscape.setQueue(99999);
  }

  private hideAllExcept(
    type: 'planet' | 'star' | 'constellation',
    focused?: any,
  ): void {
    if (this.starsNode) {
      this.starsNode.setVisible(type === 'star');
    }

    let isSaturorSun = false;

    for (const [name, p] of this.planets) {
      if (type === 'planet') {
        p.node.setVisible(focused && p.node === focused);
        if ((name === 'Saturno' || name === 'Sol') && p.node === focused) {
          isSaturorSun = true;
        }
      } else {
        p.node.setVisible(false);
      }
    }

    for (const node of this.constellationLineNodes) {
      if (type === 'constellation') {
        node.setVisible(focused && node === focused);
      } else {
        node.setVisible(false);
      }
    }

    for (const node of this.constellationArtNodes) {
      if (type === 'constellation') {
        node.setVisible(focused && node.userData.name === focused.userData.name);
      } else {
        node.setVisible(false);
      }
    }

    this.hideLineLoop.next(true);
    this.hideSaturnSol.next(isSaturorSun);

    if (this.horizonNode) {
      this.horizonNode.setVisible(false);
      const entity = this.horizonNode.getEntity() as LineLoop;
      entity?.setVisible(false);
    }

    // usar compassNodes, no compassSprites
    for (const node of this.compassNodes) {
      node.setVisible(false);
    }

    if (this.landscape) {
      this.landscapeChanged = this.landscape.isVisible();
      this.landscape.setVisible(false);
    }
  }

  private showAll(): void {
    if (this.starsNode) {
      this.starsNode.setVisible(true);
    }

    for (const [name, p] of this.planets) {
      p.node.setVisible(true);
    }

    for (const node of this.constellationLineNodes) {
      node.setVisible(this.showLines);
    }
    for (const node of this.constellationArtNodes) {
      node.setVisible(this.showArt);
    }

    this.hideLineLoop.next(false);
    this.hideSaturnSol.next(true);

    if (this.horizonNode) {
      this.horizonNode.setTranslation(vec3.fromValues(0, 0, 0));
      this.horizonNode.setVisible(true);
      const entity = this.horizonNode.getEntity() as LineLoop;
      entity?.setVisible(true);
    }

    for (const node of this.compassNodes) {
      node.setVisible(true);
    }

    if (this.landscape) {
      // this.landscapeChanged = this.landscape.isVisible();
      this.landscape.setVisible(this.landscapeChanged);
    }
  }
}
