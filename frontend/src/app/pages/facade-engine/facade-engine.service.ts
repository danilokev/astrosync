import {
  ElementRef,
  Injectable,
  NgZone,
  OnDestroy,
  EventEmitter,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as Astronomy from 'astronomy-engine';
import { CelestialService } from '../../services/celestial.service';
import { PlanetsService } from '../../services/planets.service';
import { ConstellationstateService } from '../../services/constellationstate.service';
import { IEngine } from './engine.interface';
import { ENGINE_CONFIG } from './engine-config';
import { constellations } from '../../../assets/data/NamesDiccionary';
import { constellationsReverse } from '../../../assets/data/NamesDiccionary';
import { BehaviorSubject } from 'rxjs';

interface HiddenObjectState {
  obj: THREE.Object3D;
  objVisible: boolean;
  materialsVisible: Map<THREE.Material, boolean>;
}

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy, IEngine {
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private loader = new GLTFLoader();
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private light!: THREE.HemisphereLight;
  private frameId!: number;
  private controls!: OrbitControls;
  private userLocationMarker?: THREE.Sprite;
  private favoriteMarkers: Map<string, THREE.Sprite> = new Map();
  public isAnimated: boolean = false;
  private constellationLines: THREE.LineSegments[] = [];
  private constellationsVisible: boolean = false;
  private constellationsArtVisible: boolean = false;
  private textureLoader = new THREE.TextureLoader();
  private constellationArt: THREE.Object3D[] = [];
  private clickMarker?: THREE.Sprite;
  private equatorRing!: THREE.Mesh;

  // Estado inicial de cámara para "undo zoom"
  private cameraInitialPos: THREE.Vector3 | null = null;
  private cameraInitialTarget: THREE.Vector3 | null = null;

  private starPoints: THREE.Points | null = null;

  // Cache de datos para actualización de posiciones en tiempo real
  private cachedStars: any[] = [];
  private clickableStarObjects: THREE.Object3D[] = [];

  // 1. Crear el BehaviorSubject con un valor inicial opcional
  public dataSubject = new BehaviorSubject<boolean>(false);

  // Metadata de constelaciones para actualización sin recargar datos
  private constellationMeta: {
    constellation: string;
    hrPairs: [number, number][];
    hrIndices: number[];
    rotationZ: number;
    scaleFactor: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
  }[] = [];

  // Luz para la visualización de las fases de la luna
  private moonLight: THREE.DirectionalLight | null = null;
  private lightPosition: { x: number; y: number; z: number } = {
    x: 0,
    y: 0,
    z: 0,
  };
  // private lightTargetPosition: {x: number, y: number, z: number} = {x: 0, y: 0, z: 0};

  // Identificador de la versión de escena para prevenir solapamientos asíncronos
  private sceneVersion: number = 0;

  public saveCameraState(): void {
    if (!this.camera || !this.controls) return;
    this.cameraInitialPos = this.camera.position.clone();
    this.cameraInitialTarget = this.controls.target.clone();
  }

  private hiddenObjects: Map<THREE.Object3D, HiddenObjectState> = new Map();
  private focusedObject: THREE.Object3D | null = null;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private hoveredObject: THREE.Object3D | null = null;

  private landscape: any = null;

  // Evento para Angular
  public onObjectHover = new EventEmitter<any>();

  // Guardar estado original de toda la escena
  private saveSceneState() {
    this.hiddenObjects.clear();
    if (!this.scene) return;

    this.scene.traverse((child) => {
      const materialsVisible = new Map<THREE.Material, boolean>();

      // Mesh
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => materialsVisible.set(m, m.visible));
      }

      // Points
      const points = child as THREE.Points;
      if (points.material && points.material instanceof THREE.PointsMaterial) {
        materialsVisible.set(points.material, points.material.visible);
      }

      this.hiddenObjects.set(child, {
        obj: child,
        objVisible: child.visible,
        materialsVisible,
      });
    });
  }

  // Asegurar que un objeto y sus hijos sean visibles
  private makeVisible(obj: THREE.Object3D) {
    obj.traverse((o) => {
      o.visible = true;

      // Mesh: solo asegurar visibilidad de materiales
      const mesh = o as THREE.Mesh;
      if (mesh.material) {
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => (m.visible = true));
      }

      // Points: solo visible, no tocar color ni tamaño
      const points = o as THREE.Points;
      if (points.material && points.material instanceof THREE.PointsMaterial) {
        points.material.visible = true;
      }
    });
  }

  // Ocultar todo menos el objeto clicado
  private isolateObject(clickedObj: THREE.Object3D) {
    if (!this.scene) return;

    this.focusedObject = clickedObj;
    const targetId = clickedObj.userData['_id'];
    if (!targetId) return;

    const keep = new Set<THREE.Object3D>();

    // Caso 1: si el objeto es un planeta (está en this.models)
    const planetModel = Array.from(this.models.values()).find(
      (model) => model === clickedObj || model.children.includes(clickedObj),
    );
    if (planetModel) {
      // console.log('Es un planeta', targetId);

      // Marcar todos los hijos del planeta para mantener visibles
      planetModel.traverse((o) => keep.add(o));
    }
    // Caso 2: estrellas
    else {
      this.scene.traverse((obj) => {
        const objId = obj.userData['_id'];
        if (objId && objId === targetId) {
          obj.traverse((o) => keep.add(o));
        }
      });
    }

    // Recorrer toda la escena y ocultar/mostrar según corresponda
    this.scene.traverse((child) => {
      if (child === this.scene) return;

      if (keep.has(child)) {
        // Caso estrella
        if (!planetModel) {
          child.visible = true;
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            materials.forEach((m) => (m.visible = true));
          }
        }
        // Caso planeta
        else {
          child.visible = true;
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            materials.forEach((mat) => {
              mat.visible = true;
              mat.needsUpdate = true; // fuerza que la textura se renderice
            });
          }
        }
      } else {
        child.visible = false;
      }
    });
  }

  // Restaurar la escena original
  private restoreScene() {
    this.hiddenObjects.forEach((state) => {
      state.obj.visible = state.objVisible;

      state.materialsVisible.forEach((v, mat) => {
        mat.visible = v;
      });
    });

    this.focusedObject = null;
  }

  public sendCloseZoom(cambio: boolean): void {
    this.dataSubject.next(cambio);
  }

  public resetZoom(): void {
    this.restoreScene();
    if (!this.cameraInitialPos || !this.cameraInitialTarget) return;

    this.camera.position.copy(this.cameraInitialPos);
    this.controls.target.copy(this.cameraInitialTarget);
    this.controls.update();
  }

  //Objetos clickeables
  private clickableObjects: THREE.Object3D[] = [];

  private objectIndex = new Map<string, THREE.Object3D>();

  private objectClickListener?: (event: MouseEvent) => void;
  private mouseDownPos: { x: number; y: number } | null = null;
  private readonly DRAG_THRESHOLD = 5;

  // Radio de esfera celeste
  private CELESTIAL_SPHERE_RADIUS: number = 1000;

  public onObjectClick = new EventEmitter<any>();

  // Mapa de modelos cargados
  private models: Map<string, THREE.Object3D> = new Map();
  private earthClickListener?: (event: MouseEvent) => void;

  // Lista de cuerpos a mostrar
  bodies = ENGINE_CONFIG.BODIES;

  planets!: [];

  constructor(
    private ngZone: NgZone,
    private planetService: PlanetsService,
    private celestialService: CelestialService,
    private constellationState: ConstellationstateService,
  ) {
    this.constellationState.showConstellations$.subscribe((show) => {
      this.constellationsVisible = show; // guardamos estado
      if (show) {
        this.showConstellations();
      } else {
        this.hideConstellations();
      }
    });

    this.constellationState.showConstellationsArt$.subscribe((show) => {
      this.constellationsArtVisible = show;

      if (show) {
        this.showConstellationsArt();
      } else {
        this.hideConstellationsArt();
      }
    });

    this.planetService.getPlanets().subscribe((x) => (this.planets = x));
  }

  public ngOnDestroy(): void {
    if (this.frameId != null) cancelAnimationFrame(this.frameId);
    this.dispose();
  }

  // Limpia la escena para no solapar modelos de un apartado en específico
  clearScene(): void {
    if (!this.scene) return;

    // Incrementa la versión para invalidar cargas asíncronas pendientes
    this.sceneVersion++;

    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];

      if ((obj as any).geometry) {
        (obj as any).geometry.dispose();
      }
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }

      this.scene.remove(obj);
    }

    this.clickableObjects = [];
    this.objectIndex.clear();
    this.models.clear();
    this.clearFavoriteMarkers();
    this.isAnimated = false;

    // Reset cache de actualización de posiciones
    this.starPoints = null;
    this.cachedStars = [];
    this.clickableStarObjects = [];
    this.constellationMeta = [];
    this.constellationLines = [];
    this.constellationArt = [];

    // console.log('Escena y estado limpiados');
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private indexObject(obj: THREE.Object3D): void {
    if (!obj.userData) return;

    // Estrellas
    if (obj.userData['star']) {
      const { proper, name, hip, hd, hr, gl } = obj.userData;

      if (proper) this.objectIndex.set(this.normalize(proper), obj);

      if (name) this.objectIndex.set(this.normalize(name), obj);

      if (hip) this.objectIndex.set(this.normalize(`hip ${hip}`), obj);

      if (hd) this.objectIndex.set(this.normalize(`hd ${hd}`), obj);

      if (hr) this.objectIndex.set(this.normalize(`hr ${hr}`), obj);

      if (gl) this.objectIndex.set(this.normalize(`gl ${gl}`), obj);
    }

    // Planetas / modelos
    else {
      if (obj.name) this.objectIndex.set(this.normalize(obj.name), obj);

      if (obj.userData['_id'])
        this.objectIndex.set(this.normalize(obj.userData['_id']), obj);
    }
  }

  private mouseDownListener?: (e: MouseEvent) => void;

  enableObjectClickDetection() {
    if (!this.canvas || this.objectClickListener) return;

    this.objectClickListener = (event: MouseEvent) =>
      this.handleObjectClick(event);

    this.mouseDownListener = (e: MouseEvent) => {
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    this.canvas.addEventListener('mousedown', this.mouseDownListener);
    this.canvas.addEventListener('click', this.objectClickListener);
    // console.log('Object click detection enabled');
  }

  disableObjectClickDetection() {
    if (!this.canvas) return;

    if (this.objectClickListener) {
      this.canvas.removeEventListener('click', this.objectClickListener);
      this.objectClickListener = undefined;
    }

    if (this.mouseDownListener) {
      this.canvas.removeEventListener('mousedown', this.mouseDownListener);
      this.mouseDownListener = undefined;
    }

    this.mouseDownPos = null;
    // console.log('Object click detection disabled');
  }

  private getLineCenter(line: THREE.LineSegments): THREE.Vector3 {
    const posAttr = line.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const center = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      center.x += posAttr.getX(i);
      center.y += posAttr.getY(i);
      center.z += posAttr.getZ(i);
    }

    center.divideScalar(posAttr.count);

    return center;
  }

  // public focusObject(obj: THREE.Object3D) {
  public focusObject(obj: any, focusPosition?: THREE.Vector3) {
    if (!this.camera || !this.controls) return;

    if (this.focusedObject) {
      this.restoreScene();
    } else {
      this.saveSceneState(); // guardar toda la escena antes del primer foco
    }

    let targetPos: THREE.Vector3;

    if (obj.type === 'LineSegments') {
      targetPos = this.getLineCenter(obj);
    } else {
      targetPos = obj.getWorldPosition(new THREE.Vector3());
    }
    const startPos = this.camera.position.clone();

    // detectar estrella correctamente
    const isStar = obj.userData['star'];

    let distance: number;

    if (isStar) {
      // estrellas → zoom suave
      distance = 80;
    } else if (obj.userData?.['constellation']) {
      distance = 220;
    } else {
      // planetas
      distance = obj.userData['distance'];
    }

    const dir = new THREE.Vector3()
      .subVectors(startPos, targetPos)
      .normalize()
      .multiplyScalar(distance);

    const endPos = targetPos.clone().add(dir);

    let t = 0;
    const animateZoom = () => {
      t += 0.02;
      const p = THREE.MathUtils.smoothstep(t, 0, 1);

      this.camera.position.lerpVectors(startPos, endPos, p);
      this.controls.target.lerpVectors(
        this.controls.target.clone(),
        targetPos,
        p,
      );
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateZoom);
      } else {
        // cuando termina el zoom
        this.isolateObject(obj);
        // console.log(obj);
      }
    };

    animateZoom();
  }

  private handleObjectClick(event: MouseEvent) {
    if (this.mouseDownPos) {
      const dx = event.clientX - this.mouseDownPos.x;
      const dy = event.clientY - this.mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > this.DRAG_THRESHOLD) {
        this.mouseDownPos = null;
        return;
      }
    }

    const rect = this.canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 10;
    raycaster.setFromCamera(mouse, this.camera);

    const hits = raycaster.intersectObjects(this.clickableObjects, true);
    if (hits.length === 0) return;

    const hit = hits[0];
    let object = hit.object;

    // console.log('CLICK:', object.name, object.userData);

    if (object.userData?.['star']) {
      const starPosition = object.position.clone();

      this.onObjectClick.emit({
        name: object.name,
        object,
        point: hit.point,
      });

      this.focusObject(object, starPosition);

      this.mouseDownPos = null;
      return;
    }

    // PLANETA (modelo .glb)
    else if (object.userData?.['_id']) {
      const id = object.userData['_id'];

      // Detectar si el objeto clicado pertenece a un modelo cargado
      for (const model of this.models.values()) {
        if (
          model.userData['_id'] === object.userData['_id'] || // coincide por _id
          model === object || // o es la raíz misma
          model.children.includes(object) // o es un hijo directo
        ) {
          object = model; // reemplazamos por la raíz del modelo
          break;
        }
      }
    }

    // Avisamos al componente Angular
    this.onObjectClick.emit({
      name: object.name,
      object,
      point: hit.point,
    });
    // Lanzamos animación de zoom
    this.focusObject(object);
    this.mouseDownPos = null;
  }

  public onEarthClick = new EventEmitter<{
    lat: number;
    lon: number;
    pos2D: { x: number; y: number };
  }>();

  enableEarthClickDetection() {
    if (!this.canvas) return;

    // Guardamos la referencia para poder removerla luego
    this.earthClickListener = (event: MouseEvent) =>
      this.handleCanvasClick(event);
    this.canvas.addEventListener('click', this.earthClickListener);
    // console.log('Earth click detection enabled');
  }

  disableEarthClickDetection() {
    if (!this.canvas || !this.earthClickListener) return;

    this.canvas.removeEventListener('click', this.earthClickListener);
    this.earthClickListener = undefined;
    // console.log('Earth click detection disabled');
  }

  private handleCanvasClick(event: MouseEvent) {
    if (!this.camera || !this.scene) return;

    const rect = this.canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Usamos 'tierra-dia' primero, si no existe 'tierra-noche'
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    if (!earth) return;

    const hits = raycaster.intersectObject(earth, true);
    if (hits.length === 0) return;

    const point = hits[0].point;

    // Conversión robusta
    const { lat, lon } = this.xyzToLatLon(point, earth);
    const pos2D = this.worldToScreen(point);

    this.createClickMarker(lat, lon, 200);
    this.onEarthClick.emit({ lat, lon, pos2D });
  }

  public removeClickMarker() {
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    if (!earth || !this.clickMarker) return;

    earth.remove(this.clickMarker);
    this.clickMarker = undefined;
  }

  private xyzToLatLon(p: THREE.Vector3, earth: THREE.Object3D) {
    // Convertimos el punto del espacio mundial al espacio local del modelo
    const localPoint = p.clone();
    earth.worldToLocal(localPoint);

    const r = localPoint.length();
    const latOffset = 1.57646;
    let lat = THREE.MathUtils.radToDeg(Math.asin(localPoint.y / r));
    lat -= latOffset;
    const lonOffset = 60.4873385;
    let lon = THREE.MathUtils.radToDeg(Math.atan2(localPoint.x, localPoint.z));
    lon += lonOffset;

    // Normalizamos a -180…180
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;

    // console.log('X', earth.localToWorld(new THREE.Vector3(1, 0, 0)));
    // console.log('Y', earth.localToWorld(new THREE.Vector3(0, 1, 0)));
    // console.log('Z', earth.localToWorld(new THREE.Vector3(0, 0, 1)));

    return { lat, lon };
  }

  private latLonToXYZ(lat: number, lon: number, radius: number): THREE.Vector3 {
    const latOffset = 1.57646;
    const lonOffset = 60.4873385;

    // Invertimos los offsets usados en xyzToLatLon
    lat += latOffset;
    lon -= lonOffset;

    const latRad = THREE.MathUtils.degToRad(lat);
    const lonRad = THREE.MathUtils.degToRad(lon);

    const x = radius * Math.cos(latRad) * Math.sin(lonRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lonRad);

    return new THREE.Vector3(x, y, z);
  }
  public createUserLocationMarker(
    lat: number,
    lon: number,
    visible = true,
    offset: number,
  ) {
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    if (!earth) return;

    if (this.userLocationMarker) earth.remove(this.userLocationMarker);

    // Radio real del modelo
    const bbox = new THREE.Box3().setFromObject(earth);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const earthRadius = size.x / 2;

    const radius = earthRadius * offset;

    // Posición LOCAL correcta
    const localPos = this.latLonToXYZ(lat, lon, radius);

    const texture = new THREE.TextureLoader().load(
      'assets/icon-events/map-pin.png',
    );
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(25, 25, 25);
    sprite.position.copy(localPos);
    sprite.visible = visible;

    earth.add(sprite);
    this.userLocationMarker = sprite;
  }

  public createClickMarker(lat: number, lon: number, offset: number) {
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    if (!earth) return;

    // eliminar el anterior
    if (this.clickMarker) {
      earth.remove(this.clickMarker);
      this.clickMarker = undefined;
    }

    // Radio real
    const bbox = new THREE.Box3().setFromObject(earth);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const earthRadius = (size.x + size.y + size.z) / 6; // promedio de radios

    if (this.isAnimated) {
      offset -= 75;
    }

    const radius = earthRadius * offset;

    // Posición LOCAL correcta
    const localPos = this.latLonToXYZ(lat, lon, radius);

    const texture = new THREE.TextureLoader().load(
      'assets/icon-events/mark.png', // icono distinto
    );

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(22, 22, 22);
    sprite.position.copy(localPos);

    earth.add(sprite);
    this.clickMarker = sprite;
  }

  public createFavoriteMarker(
    id: string,
    lat: number,
    lon: number,
    visible = true,
    offset: number,
  ) {
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    if (!earth) return;

    if (this.favoriteMarkers.has(id)) return; // Evitar duplicados

    if (this.isAnimated) {
      offset -= 75;
    }

    // Radio real del modelo
    const bbox = new THREE.Box3().setFromObject(earth);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const earthRadius = size.x / 2;

    const radius = earthRadius * offset;

    // Posición LOCAL correcta
    const localPos = this.latLonToXYZ(lat, lon, radius);

    const texture = new THREE.TextureLoader().load(
      'assets/icon-events/favorito.png',
    );
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(25, 25, 25);
    sprite.position.copy(localPos);
    sprite.visible = visible;

    earth.add(sprite);
    this.favoriteMarkers.set(id, sprite);
  }

  public removeFavoriteMarker(id: string) {
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    const marker = this.favoriteMarkers.get(id);
    if (earth && marker) {
      earth.remove(marker);
      this.favoriteMarkers.delete(id);
    }
  }

  public clearFavoriteMarkers() {
    const earth =
      this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
    if (!earth) return;

    this.favoriteMarkers.forEach((marker) => earth.remove(marker));
    this.favoriteMarkers.clear();
  }

  public setUserLocationMarkerVisible(
    visible: boolean,
    lat?: number,
    lon?: number,
  ) {
    if (this.userLocationMarker) {
      this.userLocationMarker.visible = visible;
      // console.log('Marker visible =', visible);

      if (visible && lat !== undefined && lon !== undefined) {
        const earth =
          this.models.get('tierra-dia') ?? this.models.get('tierra-noche');
        if (!earth) return;

        this.isAnimated = true;
        // Animar la rotación de la Tierra hacia esa posición
        this.animateEarthRotationToLocation(earth, lat, lon);
      }
    }
  }

  private smoothZoomIn(target: THREE.Vector3) {
    if (!this.camera || !this.controls) return;

    const startPos = this.camera.position.clone();
    const direction = startPos.clone().sub(target).normalize();
    const currentDistance = startPos.distanceTo(target);

    // Nos acercamos un 15%
    const endPos = target
      .clone()
      .add(direction.multiplyScalar(currentDistance * 0.85));

    const duration = 800;
    const startTime = performance.now();

    const animateZoom = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      const eased = t * t * (3 - 2 * t); // suavizado

      this.camera.position.lerpVectors(startPos, endPos, eased);
      this.controls.target.copy(target);
      this.controls.update();

      if (t < 1) requestAnimationFrame(animateZoom);
    };

    requestAnimationFrame(animateZoom);
  }

  private animateEarthRotationToLocation(
    earth: THREE.Object3D,
    lat: number,
    lon: number,
  ) {
    if (!this.camera || !this.controls) return;

    // Radio real del modelo
    const bbox = new THREE.Box3().setFromObject(earth);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const radius = size.x / 2;

    // Punto exacto en la superficie
    const localTarget = this.latLonToXYZ(lat, lon, radius);

    // Convertimos a mundo
    const worldTarget = localTarget.clone();
    earth.localToWorld(worldTarget);

    // Dirección desde centro de la Tierra hacia el punto
    const earthCenter = earth.getWorldPosition(new THREE.Vector3());
    const dirToPoint = worldTarget.clone().sub(earthCenter).normalize();

    // Dirección de la cámara
    const camDir = this.camera
      .getWorldDirection(new THREE.Vector3())
      .normalize();

    // Queremos que el punto mire hacia la cámara
    const qStart = earth.quaternion.clone();
    const qRot = new THREE.Quaternion().setFromUnitVectors(
      dirToPoint,
      camDir.clone().negate(),
    );
    const qEnd = qRot.multiply(qStart);

    // Animación de rotación
    const duration = 1200;
    const startTime = performance.now();

    const animateRotation = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      earth.quaternion.slerpQuaternions(qStart, qEnd, t);

      if (t < 1) {
        requestAnimationFrame(animateRotation);
      } else {
        // Al terminar → pequeño acercamiento
        this.smoothZoomIn(worldTarget);
      }
    };

    requestAnimationFrame(animateRotation);
  }

  public setFavoriteMarkersVisible(visible: boolean) {
    this.favoriteMarkers.forEach((marker) => {
      marker.visible = visible;
    });
  }

  public worldToScreen(pos: THREE.Vector3) {
    const vector = pos.clone().project(this.camera);
    return {
      x: (vector.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
    };
  }
  /**
   * Crea la escena con cámara, luz y controles
   */
  public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    this.canvas = canvas.nativeElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      (this.CELESTIAL_SPHERE_RADIUS + ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE) * 2,
    );
    //this.camera.position.set(0, 2, 5);
    this.camera.position.set(0, 2, 5);

    // Luz
    this.light = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
    this.light.position.set(0, 20, 0);
    this.scene.add(this.light);

    // Controles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.enableZoom = true; // zoom a través de FOV
    this.controls.maxDistance = this.CELESTIAL_SPHERE_RADIUS; // no deja salir fuera de la esfera celeste
    // Opcional: ajustar sensibilidad del pan
    this.controls.panSpeed = 0.5;
    // Opcional: definir las combinaciones de ratón
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE, // click izquierdo = rotar
      MIDDLE: THREE.MOUSE.DOLLY, // rueda = zoom
      RIGHT: THREE.MOUSE.PAN, // click derecho = translación
    };

    this.enableObjectClickDetection();

    this.canvas.addEventListener('mousemove', this.onMouseMove);

    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY * 0.02;
      this.camera.fov = THREE.MathUtils.clamp(this.camera.fov + delta, 10, 80);
      this.camera.updateProjectionMatrix();

      if (this.starPoints) {
        const material = this.starPoints.material as THREE.ShaderMaterial;
        (material.uniforms as { fov: THREE.IUniform<number> }).fov.value =
          this.camera.fov;
      }
    });

    // Escucha resize
    window.addEventListener('resize', this.onWindowResize);

    // Guardar estado inicial de cámara UNA sola vez
    this.saveCameraState();
  }

  public createEquatorRing(): void {
    const radius = this.CELESTIAL_SPHERE_RADIUS - 1;

    const geometry = new THREE.RingGeometry(radius - 8, radius, 256);

    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
    });

    this.equatorRing = new THREE.Mesh(geometry, material);

    // Plano ecuatorial
    this.equatorRing.rotation.x = Math.PI / 2;

    this.equatorRing.renderOrder = 999;

    this.scene.add(this.equatorRing);
  }

  /**
   * Carga un modelo GLTF
   */
  public loadModel(
    name: string,
    distance: number,
    modelPath: string,
    position: [number, number, number],
    scale: number = 1,
    rotation?: [number, number, number],
    visible: boolean = true,
    onLoaded?: () => void,
  ): void {
    // Guardo la versión actual al iniciar la carga
    const currentVersion = this.sceneVersion;

    this.loader.load(
      modelPath,
      (gltf) => {
        // Si la versión ha cambiado, significa que la escena fue limpiada antes de terminar la descarga
        if (this.sceneVersion !== currentVersion) {
          // Libera memoria del modelo descartado
          gltf.scene.traverse((child: THREE.Object3D) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.geometry?.dispose();
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => m.dispose());
              } else {
                mesh.material?.dispose();
              }
            }
          });
          return;
        }

        const model = gltf.scene;

        // Normalizar el modelo
        const box = new THREE.Box3().setFromObject(model);
        const sizeVec = new THREE.Vector3();
        box.getSize(sizeVec);

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);

        // Escalar para que el modelo tenga un tamaño base (ajustable con 'scale')
        const radius = maxDim / 2;
        const normalizedScale = scale / radius;
        model.scale.setScalar(normalizedScale);

        // Centrado
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());

        model.position.set(
          position[0] - center.x,
          position[1] - center.y,
          position[2] - center.z,
        );

        if (rotation) model.rotation.set(rotation[0], rotation[1], rotation[2]);
        model.visible = visible;

        // Guardar _id en todos los hijos del modelo
        const bodyData = this.bodies.find(
          (b) => b.name.toLowerCase() === name.toLowerCase(),
        );
        if (bodyData?._id) {
          model.traverse((child) => {
            child.userData['_id'] = bodyData._id;
            child.userData['distance'] = bodyData.distance;
            child.userData['name'] = bodyData.name;
          });
        }

        this.scene.add(model);
        this.models.set(name, model);
        this.clickableObjects.push(model);
        if (onLoaded) onLoaded();
        this.indexObject(model);
      },
      undefined,
      (error) => console.error('Error al cargar el modelo:', error),
    );
  }

  // Normalizar modelo
  public normalizeModel(model: any, targetSize: number): void {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDim;

    model.scale.setScalar(scale);

    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center);
  }

  /**
   * Mostrar/ocultar modelo por nombre
   */
  public setModelVisible(name: string, visible: boolean): void {
    const model = this.models.get(name);
    if (model) model.visible = visible;
    //else console.warn(`Modelo ${name} no encontrado`);
  }

  /**
   * Animación de la escena
   */
  public animate(): void {
    this.ngZone.runOutsideAngular(() => {
      const renderFrame = () => {
        this.frameId = requestAnimationFrame(renderFrame);
        this.controls.update();
        this.updateHorizonCircle();
        this.updateSkybox();
        this.renderer.render(this.scene, this.camera);
      };
      renderFrame();
    });
  }

  public showStars(stars: any[], lat: number, long: number, date: Date): void {
    if (!this.scene) return;

    // Guardar datos en cache para actualización posterior (filtrar Sol)
    this.cachedStars = stars.filter((s) => s.proper !== 'Sol');

    const observer = new Astronomy.Observer(lat, long, 0);
    const time = Astronomy.MakeTime(date);
    const rot = Astronomy.Rotation_EQJ_HOR(time, observer);

    const radius = this.CELESTIAL_SPHERE_RADIUS;

    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    // 🧹 Limpiar estrellas anteriores
    const starsToRemove = this.clickableObjects.filter(
      (o) => o.userData?.['star'],
    );
    for (const obj of starsToRemove) {
      this.scene.remove(obj);
    }
    this.clickableObjects = this.clickableObjects.filter(
      (obj) => !obj.userData?.['star'],
    );
    this.clickableStarObjects = [];

    // 🔧 Precalculos (evita repetir)
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const fovScale = 1 / Math.tan(fovRad / 2);
    const scale = window.innerHeight / 2;

    for (const star of stars) {
      if (star.proper === 'Sol') continue;

      // --- POSICIÓN ---
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

      positions.push(x, y, z);

      // --- COLOR ---
      const starColor = this.ciToRGB(star.ci);
      const brightness = Math.max(0.2, 1.0 - star.mag / 10);
      starColor.multiplyScalar(brightness);

      colors.push(starColor.r, starColor.g, starColor.b);

      // --- SIZE (shader) ---
      const baseSize = 4;
      const maxSize = 17;
      const size = THREE.MathUtils.clamp(
        maxSize - star.mag * 2,
        baseSize,
        maxSize,
      );

      sizes.push(size);

      // CLICKABLE MESH
      const starPos = new THREE.Vector3(x, y, z);
      const distance = this.camera.position.distanceTo(starPos);

      // mismo cálculo que shader (aproximado)
      const pixelSize = (size * scale * fovScale) / distance;

      // convertir a mundo (aprox suficiente)
      const worldSize = (pixelSize * distance) / window.innerHeight;

      const meshColor = new THREE.Color(
        starColor.r,
        starColor.g,
        starColor.b,
      ).convertSRGBToLinear();

      const clickableStar = new THREE.Mesh(
        new THREE.SphereGeometry(worldSize, 16, 16),
        new THREE.MeshBasicMaterial({
          color: meshColor,
          transparent: true,
          visible: false,
        }),
      );

      clickableStar.position.copy(starPos);

      clickableStar.userData = {
        ...star,
        star: true,
      };

      this.scene.add(clickableStar);
      this.clickableObjects.push(clickableStar);
      this.clickableStarObjects.push(clickableStar);
      this.indexObject(clickableStar);
    }

    // RENDER CON POINTS
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      uniforms: {
        scale: { value: scale },
        fov: { value: this.camera.fov },
      },
      vertexShader: `
      uniform float scale;
      uniform float fov;
      attribute float size;
      varying vec3 vColor;


      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);


        float fovScale = 1.0 / tan(radians(fov) / 2.0);
        gl_PointSize = size * scale * fovScale / -mvPosition.z;


        gl_Position = projectionMatrix * mvPosition;
      }
    `,
      fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
    });

    const points = new THREE.Points(geometry, material);

    this.starPoints = points;

    this.scene.add(points);
  }

  // Color de las estrellas
  public ciToRGB(ci: number): THREE.Color {
    const color = new THREE.Color();

    if (ci < 0)
      color.setRGB(0.6, 0.7, 1.0); // azul
    else if (ci < 0.3)
      color.setRGB(0.7, 0.8, 1.0); // azul claro
    else if (ci < 0.6)
      color.setRGB(1.0, 1.0, 1.0); // blanco
    else if (ci < 1.0)
      color.setRGB(1.0, 1.0, 0.6); // amarillo
    else if (ci < 1.5)
      color.setRGB(1.0, 0.8, 0.6); // naranja
    else color.setRGB(1.0, 0.6, 0.6); // rojo

    return color;
  }

  // Helper para aplicar shader a un mesh de planeta
  private showPlanetMesh(mesh: THREE.Mesh) {
    // Guardar la textura original si existe
    let map: THREE.Texture | null = null;
    if ((mesh.material as THREE.MeshStandardMaterial).map) {
      map = (mesh.material as THREE.MeshStandardMaterial).map!;
    }

    // Crear shader simple que use la textura y luz
    const sunDir = new THREE.Vector3(
      this.lightPosition.x,
      this.lightPosition.y,
      this.lightPosition.z,
    ).normalize();

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: map },
        sunDir: { value: sunDir },
        ambient: { value: 0.7 },
      },
      vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
      fragmentShader: `
      uniform sampler2D map;
      uniform vec3 sunDir;
      uniform float ambient;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vec3 texColor = texture2D(map, vUv).rgb;
        float dotNL = max(dot(normalize(vNormal), normalize(sunDir)), 0.0);
        float intensity = dotNL * 1.2 + ambient;
        vec3 finalColor = texColor * intensity;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    });

    mesh.material = mat;
  }
  // Visualizar planetas, Luna y Sol
  // Nuevo showPlanet que aplica la lógica de la Luna a todos los planetas
  public showPlanet(lat: number, long: number, date: Date): void {
    const observer = new Astronomy.Observer(lat, long, 0);
    const time = Astronomy.MakeTime(date);
    const radius = this.CELESTIAL_SPHERE_RADIUS;

    for (const b of this.bodies) {
      // Coordenadas horizontales
      const eq = Astronomy.Equator(b.body, time, observer, true, true);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
      const alt = (hor.altitude * Math.PI) / 180;
      const az = (hor.azimuth * Math.PI) / 180;
      const x = radius * Math.cos(alt) * Math.sin(az);
      const y = radius * Math.sin(alt);
      const z = radius * Math.cos(alt) * Math.cos(az);

      // Guardar posición del Sol
      if (b.name === 'Sun') {
        this.lightPosition.x = -x;
        this.lightPosition.y = y;
        this.lightPosition.z = z;
      }

      if (this.models.has(b.name)) {
        const model = this.models.get(b.name)!;
        model.position.set(-x, y, z);

        // Aplicar shader a todos los meshes del modelo
        if (b.name === 'Moon') {
          this.showMoon();
        } else {
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              this.showPlanetMesh(child as THREE.Mesh);
            }
          });
        }
      } else {
        // Cargar modelo nuevo
        this.loadModel(
          b.name,
          b.distance,
          b.modelPath,
          [-x, y, z],
          b.size *
            ENGINE_CONFIG.CORRECTION_FACTOR *
            this.CELESTIAL_SPHERE_RADIUS,
          undefined,
          true,
          () => {
            const model = this.models.get(b.name);
            if (!model) return;
            if (b.name === 'Moon') {
              this.showMoon();
            } else {
              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  this.showPlanetMesh(child as THREE.Mesh);
                }
              });
            }
          },
        );
      }
    }
  }

  // Actualiza posiciones de estrellas, planetas y constelaciones
  public updateCelestialPositions(date: Date, lat: number, lon: number): void {
    if (!this.scene) return;
    if (this.cachedStars.length === 0) return;

    const observer = new Astronomy.Observer(lat, lon, 0);
    const time = Astronomy.MakeTime(date);
    const rot = Astronomy.Rotation_EQJ_HOR(time, observer);
    const radius = this.CELESTIAL_SPHERE_RADIUS;

    // ACTUALIZAR POSICIONES DE ESTRELLAS
    const newPositions = new Float32Array(this.cachedStars.length * 3);
    const hrPositionMap = new Map<number, THREE.Vector3>();

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

      if (star.hr) {
        hrPositionMap.set(star.hr, new THREE.Vector3(x, y, z));
      }
    }

    // Actualizar buffer de posiciones de los Points
    if (this.starPoints) {
      const posAttr = this.starPoints.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      if (posAttr && posAttr.array.length === newPositions.length) {
        const arr = posAttr.array as Float32Array;
        arr.set(newPositions);
        posAttr.needsUpdate = true;
      }
    }

    // Actualizar posiciones de meshes clickeables de estrellas
    for (let i = 0; i < this.clickableStarObjects.length; i++) {
      const mesh = this.clickableStarObjects[i];
      const hr = mesh.userData['hr'];
      const newPos = hr ? hrPositionMap.get(hr) : null;

      if (newPos) {
        mesh.position.copy(newPos);
      } else {
        const idx = this.cachedStars.findIndex(
          (s) => s._id === mesh.userData['_id'],
        );
        if (idx >= 0) {
          mesh.position.set(
            newPositions[idx * 3],
            newPositions[idx * 3 + 1],
            newPositions[idx * 3 + 2],
          );
        }
      }
    }

    // ACTUALIZAR POSICIONES DE PLANETAS, LUNA Y SOL
    for (const b of this.bodies) {
      const eq = Astronomy.Equator(b.body, time, observer, true, true);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
      const alt = (hor.altitude * Math.PI) / 180;
      const az = (hor.azimuth * Math.PI) / 180;
      const x = radius * Math.cos(alt) * Math.sin(az);
      const y = radius * Math.sin(alt);
      const z = radius * Math.cos(alt) * Math.cos(az);

      if (b.name === 'Sun') {
        this.lightPosition.x = -x;
        this.lightPosition.y = y;
        this.lightPosition.z = z;
      }

      const model = this.models.get(b.name);
      if (model) {
        model.position.set(-x, y, z);

        if (b.name === 'Moon') {
          this.showMoon();
        }
      }
    }

    for (const meta of this.constellationMeta) {
      const lineObj = this.constellationLines.find(
        (l) => l.userData['constellation'] === meta.constellation,
      );
      if (lineObj) {
        const newPoints: THREE.Vector3[] = [];
        meta.hrPairs.forEach(([hr1, hr2]) => {
          const p1 = hrPositionMap.get(hr1);
          const p2 = hrPositionMap.get(hr2);
          if (p1 && p2) newPoints.push(p1, p2);
        });
        if (newPoints.length > 0) {
          const posAttr = lineObj.geometry.getAttribute(
            'position',
          ) as THREE.BufferAttribute;
          if (posAttr && posAttr.count === newPoints.length) {
            for (let i = 0; i < newPoints.length; i++) {
              posAttr.array[i * 3] = newPoints[i].x;
              posAttr.array[i * 3 + 1] = newPoints[i].y;
              posAttr.array[i * 3 + 2] = newPoints[i].z;
            }
            posAttr.needsUpdate = true;
            lineObj.geometry.computeBoundingSphere();
          } else {
            lineObj.geometry.dispose();
            lineObj.geometry = new THREE.BufferGeometry().setFromPoints(
              newPoints,
            );
          }
        }
      }

      // Actualizar arte
      const artObj = this.constellationArt.find(
        (m) => m.userData['constellation'] === meta.constellation,
      );
      if (!artObj) continue;

      const starPositions: THREE.Vector3[] = [];
      meta.hrIndices.forEach((hr) => {
        const p = hrPositionMap.get(hr);
        if (p) starPositions.push(p);
      });
      if (starPositions.length === 0) continue;

      // Reseteamos transformaciones
      artObj.position.set(0, 0, 0);
      artObj.rotation.set(0, 0, 0);
      artObj.scale.set(1, 1, 1);

      // Centro
      const center = new THREE.Vector3();
      starPositions.forEach((p) => center.add(p));
      center.divideScalar(starPositions.length);

      // Dirección principal
      const dir = new THREE.Vector3();
      for (let i = 0; i < starPositions.length - 1; i++) {
        dir.add(starPositions[i + 1].clone().sub(starPositions[i]));
      }
      dir.normalize();

      // Orientación
      const toCamera = this.camera.position.clone().sub(center).normalize();
      const tangent = dir.clone().normalize();
      const bitangent = new THREE.Vector3()
        .crossVectors(toCamera, tangent)
        .normalize();
      const normal = new THREE.Vector3()
        .crossVectors(tangent, bitangent)
        .normalize();
      const basis = new THREE.Matrix4().makeBasis(tangent, bitangent, normal);

      const specialConstellations = new Set([
        'Aur',
        'Crt',
        'Tri',
        'TrA',
        'Oph',
        'Equ',
        'Cep',
        'Cha',
        'Ind',
        'Scl',
        'Phe',
        'PsA',
        'Nor',
        'Oct',
        'Sct',
        'Sgr',
      ]);
      if (specialConstellations.has(meta.constellation)) {
        artObj.lookAt(new THREE.Vector3(0, 0, 0));
      } else {
        artObj.setRotationFromMatrix(basis);
      }

      artObj.rotateZ(meta.rotationZ);
      let scale =
        Math.max(...starPositions.map((p) => p.distanceTo(center))) *
        meta.scaleFactor;
      if (meta.constellation === 'Oph') scale *= 2;
      artObj.scale.set(scale, scale, scale);
      artObj.position.copy(
        center
          .clone()
          .add(new THREE.Vector3(meta.offsetX, meta.offsetY, meta.offsetZ)),
      );
      artObj.visible = this.constellationsArtVisible;
      artObj.renderOrder = 1;
    }
  }

  showMoon() {
    const moon = this.models.get('Moon');

    if (!moon) return;

    // Mirar al centro
    moon.lookAt(0, 0, 0);

    // Dirección del Sol en las coordenadas del mundo
    const sun = new THREE.Vector3(
      this.lightPosition.x,
      this.lightPosition.y,
      this.lightPosition.z,
    ).normalize();

    const sunWorld = sun.clone().multiplyScalar(100000);

    moon.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Cogemos la textura
        let map: THREE.Texture | null = null;
        if ((mesh.material as THREE.MeshStandardMaterial).map) {
          map = (mesh.material as THREE.MeshStandardMaterial).map!;
        }

        // Si shader no está creado
        if (!(mesh.material instanceof THREE.ShaderMaterial)) {
          const uniforms = {
            sunDir: { value: new THREE.Vector3() },
            map: { value: map },
            ambient: { value: 0.7 },
          };

          const moonMaterial = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: `
            varying vec3 vNormal;
            varying vec2 vUv;
            void main() {
              vNormal = normalize(normal);
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
          `,
            fragmentShader: `
            uniform vec3 sunDir;
            uniform sampler2D map;
            uniform float ambient;

            varying vec3 vNormal;
            varying vec2 vUv;

            void main() {
              vec3 texColor = texture2D(map, vUv).rgb;

              // Águlo entre la normal y la dirección del Sol
              float dotNL = dot(normalize(vNormal), normalize(sunDir));

              // Frontera de sombra
              float mask = smoothstep(-0.2, 0.2, dotNL);
              // float mask = step(0.0, dotNL);  // 1.0 si iluminado, 0.0 si no

              // Intensidad de la luz (un poco  suavizado para el realismo)
              float intensity = max(dotNL, 0.0) * 1.2 + ambient;

              // Color de agujeros reacciona a la luz
              vec3 litColor = texColor * intensity + vec3(0.1) * (1.0 - dotNL);

              // Color final
              vec3 finalColor = mix(texColor * 0.2, litColor, mask);

              gl_FragColor = vec4(finalColor, 1.0);
          }
          `,
          });

          mesh.material = moonMaterial;
        }

        // Convertimos sunDir coordenadas locales (para no depender de lookAt)
        const sunLocal = mesh
          .worldToLocal(
            sunWorld.clone().add(mesh.getWorldPosition(new THREE.Vector3())),
          )
          .normalize();
        (mesh.material as THREE.ShaderMaterial).uniforms['sunDir'].value.copy(
          sunLocal,
        );
      }
    });
  }

  // Función para calcular el diámetro angular de un planeta
  angularDiameter(planet: Astronomy.Body, name: string, time: Date) {
    // Obtener la distancia geocéntrica del planeta en unidades astronómicas
    const illum = Astronomy.Illumination(planet, time);
    const distanceAU = illum.geo_dist; // distancia en AU

    const AU_IN_KM = 149597870.7; // conversión de AU a km
    const distanceKm = distanceAU * AU_IN_KM;

    const item = this.bodies.find((b) => b.name === name);
    const radiusKm = item ? item.radius_km : 0;

    // Radio angular en radianes
    const thetaRad = Math.atan(radiusKm / distanceKm);

    // Diámetro angular en radianes
    const angularDiameterRad = 2 * thetaRad;

    // Convertir a grados
    const angularDiameterDeg = angularDiameterRad * (180 / Math.PI);

    // Convertir a segundos de arco
    const angularDiameterArcsec = angularDiameterDeg * 3600;

    return {
      rad: angularDiameterRad, // radianes
      deg: angularDiameterDeg, // grados
      arcsec: angularDiameterArcsec, // segundos de arco
    };
  }

  private horizonCircle!: THREE.Mesh;

  public addHorizonCircle(): void {
    const radius = this.CELESTIAL_SPHERE_RADIUS;

    const geometry = new THREE.CircleGeometry(radius, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 1,
    });

    this.horizonCircle = new THREE.Mesh(geometry, material);
    this.horizonCircle.rotation.x = -Math.PI / 2; // Plano XZ
    this.horizonCircle.position.y = -3; // A nivel del horizonte

    this.scene.add(this.horizonCircle);

    // Añadimos skybox
    this.addSkybox();
  }

  public updateHorizonCircle(): void {
    if (!this.horizonCircle) return;

    // Dirección de la cámara
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    camDir.normalize();

    const dot = camDir.y; // >0 → arriba, <0 → abajo
    const material = this.horizonCircle.material as THREE.MeshBasicMaterial;
    const maxOpacity = 1;

    const horizonEnabled = this.constellationState.getShowSkybox();
    if (!horizonEnabled) {
      this.horizonCircle.visible = false;
      return;
    }

    this.horizonCircle.visible = true;
  }
  // Línea del horizonte
  public addHorizonLine(): void {
    // const radius = this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE - ENGINE_CONFIG.HORIZON_RADIUS_DIFFERENCE;
    const radius = this.CELESTIAL_SPHERE_RADIUS;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= 360; i++) {
      const az = THREE.MathUtils.degToRad(i);

      const x = radius * Math.sin(az);
      const y = 0; // alt = 0
      const z = radius * Math.cos(az);

      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x44aa44,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });

    const line = new THREE.LineLoop(geometry, material);
    this.scene.add(line);

    this.addCompassLabels();
  }

  // Convertir azimuth a coordenadas 3D
  azToXYZ(azDeg: number, radius: number): THREE.Vector3 {
    const az = THREE.MathUtils.degToRad(azDeg);
    return new THREE.Vector3(-radius * Math.sin(az), 0, radius * Math.cos(az));
  }

  // Puntos cardinales
  public addCompassLabels(): void {
    const radius = this.CELESTIAL_SPHERE_RADIUS;
    const labels = [
      { text: 'N', az: 0 },
      { text: 'E', az: 90 },
      { text: 'S', az: 180 },
      { text: 'W', az: 270 },
    ];

    labels.forEach((label) => {
      const pos = this.azToXYZ(label.az, radius);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: true })!;
      canvas.width = 256;
      canvas.height = 256;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 180px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.01,
        depthTest: false,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(100, 100, 1);
      sprite.position.copy(pos);
      sprite.renderOrder = 10000;

      this.scene.add(sprite);
    });
  }

  getCameraDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    return dir.normalize();
  }

  getEquatorialFromDirection(dir: THREE.Vector3) {
    const x = dir.x;
    const y = dir.y;
    const z = dir.z;

    // Dec = arcsin(z)
    const decRad = Math.asin(z);

    // RA = atan2(x, y)
    let raRad = Math.atan2(x, y);
    if (raRad < 0) raRad += 2 * Math.PI;

    return {
      ra: (raRad * 180) / Math.PI,
      dec: (decRad * 180) / Math.PI,
    };
  }

  getMagByZoom(fov: number): number {
    if (fov > 60) return 4;
    if (fov > 40) return 5;
    if (fov > 25) return 6;
    if (fov > 15) return 8;
    if (fov > 8) return 10;
    return 12;
  }

  /**
   * Ajusta el renderer y la cámara al tamaño de la ventana
   */
  public resizeRenderer(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Listener interno de resize
   */
  private onWindowResize = () => {
    this.resizeRenderer(window.innerWidth, window.innerHeight);
  };

  /**
   * Limpieza de la escena y recursos
   */
  public dispose(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null!;
    }
    this.disableObjectClickDetection();
    this.disableEarthClickDetection();
    this.renderer.dispose();
    this.scene.clear();
    window.removeEventListener('resize', this.onWindowResize);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
  }

  public async searchAndFocusByConstellation(name: string): Promise<void> {
    if (!name) return;
    for (const obj of this.clickableObjects) {
      if (obj.userData['constellation']) {
        if (obj.userData['constellation'] === name) {
          this.simulateClick(obj);
          return;
        }
      }
    }
  }

  public async searchAndFocusByName(name: string): Promise<void> {
    if (!name) return;

    const normalized = this.normalize(name);

    // Índice rápido
    const indexedObj = this.objectIndex.get(normalized);
    if (indexedObj) {
      this.simulateClick(indexedObj);
      return;
    }

    // PLANETAS (PRIMERO)
    for (const obj of this.clickableObjects) {
      const planetName = obj.userData?.['name'];

      if (planetName && this.normalize(planetName) === normalized) {
        this.objectIndex.set(this.normalize(planetName), obj);
        this.simulateClick(obj);
        return;
      }
    }

    // CONSTELACIONES (DESPUÉS)
    for (const obj of this.clickableObjects) {
      const cname = obj.userData['constellation'];

      if (!cname) continue;

      const normalizedInput = this.normalize(name);

      // convertir "Centauro" → "Cen"
      const abbrFromInput = constellationsReverse[normalizedInput];

      // comparar TODO normalizado
      if (
        (abbrFromInput &&
          this.normalize(abbrFromInput) === this.normalize(cname)) || // "Centauro"
        this.normalize(cname) === normalizedInput // "Cen"
      ) {
        this.objectIndex.set(normalizedInput, obj);
        this.simulateClick(obj);
        return;
      }
    }

    // ESTRELLAS (ÚLTIMO)
    for (const obj of this.clickableObjects) {
      if (obj.userData?.['star']) {
        const proper = obj.userData?.['proper'];

        // nombre propio
        if (proper && this.normalize(proper) === normalized) {
          this.objectIndex.set(this.normalize(proper), obj);
          this.simulateClick(obj);
          return;
        }

        // fallback → Wikidata
        if (!proper) {
          try {
            const result = await this.celestialService
              .getCelestialInfo(obj.userData)
              .toPromise();

            const wikiLabel = result?.label;

            if (wikiLabel && this.normalize(wikiLabel) === normalized) {
              this.objectIndex.set(this.normalize(wikiLabel), obj);
              this.simulateClick(obj);
              return;
            }
          } catch (err) {
            //console.error('Error consultando estrella:', err);
          }
        }
      }
    }

    //console.warn('No se encontró coincidencia para:', name);
  }

  onConstellationSelected(fullName: string) {
    const normalized = this.normalize(fullName);

    const abbrev = constellationsReverse[normalized];

    if (!abbrev) {
      //console.warn('No se encontró constelación:', fullName);
      return;
    }

    this.searchAndFocusByName(abbrev);
  }
  private simulateClick(obj: THREE.Object3D) {
    this.onObjectClick.emit({
      name: obj.name,
      object: obj,
      point: obj.position,
    });

    this.focusObject(obj);
  }

  public drawConstellationsFromData(data: string): void {
    if (!this.scene) return;

    // Eliminar líneas y artes anteriores
    this.constellationLines.forEach((line) => this.scene.remove(line));
    this.constellationArt.forEach((art) => this.scene.remove(art));
    this.constellationLines = [];
    this.constellationArt = [];
    this.constellationMeta = [];

    const lines = data.split('\n');

    for (const line of lines) {
      if (!line.trim() || line.startsWith('#')) continue;

      const tokens = line.trim().split(/\s+/);
      const constellation = tokens[0];

      // Rotación, escala y offsets
      const rotationZ = parseFloat(tokens[1]);
      const scaleFactor = parseFloat(tokens[2]);
      const offsetX = parseFloat(tokens[3]);
      const offsetY = parseFloat(tokens[4]);
      const offsetZ = parseFloat(tokens[5]);
      const count = parseInt(tokens[8]);
      if (isNaN(count)) continue;

      const hrNumbers = tokens.slice(9).map((n) => parseInt(n));

      const points: THREE.Vector3[] = [];
      const hrPairs: [number, number][] = [];

      for (let i = 0; i < hrNumbers.length - 1; i++) {
        const hr1 = hrNumbers[i];
        const hr2 = hrNumbers[i + 1];
        const obj1 = this.objectIndex.get(this.normalize(`hr ${hr1}`));
        const obj2 = this.objectIndex.get(this.normalize(`hr ${hr2}`));
        if (!obj1 || !obj2) continue;
        points.push(obj1.position.clone(), obj2.position.clone());
        hrPairs.push([hr1, hr2]);
      }
      if (points.length === 0) continue;

      // Guardar metadata
      this.constellationMeta.push({
        constellation,
        hrPairs,
        hrIndices: hrNumbers,
        rotationZ,
        scaleFactor,
        offsetX,
        offsetY,
        offsetZ,
      });

      // Crear línea
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6,
      });
      const lineSegments = new THREE.LineSegments(geometry, material);
      lineSegments.userData['constellation'] = constellation;
      lineSegments.visible = this.constellationsVisible;
      this.scene.add(lineSegments);
      this.constellationLines.push(lineSegments);

      this.clickableObjects.push(lineSegments);

      // Crear arte solo si tiene imagen
      if (!['Pup', 'Ser', 'Vel', 'Crux'].includes(constellation)) {
        const artMesh = this.createConstellationArt(
          constellation,
          points,
          rotationZ,
          scaleFactor,
          offsetX,
          offsetY,
          offsetZ,
        );
        if (artMesh) {
          this.constellationArt.push(artMesh);
        }
      }
    }
  }

  public showConstellations() {
    this.constellationLines.forEach((line) => {
      line.visible = true;
    });
  }

  public hideConstellations() {
    this.constellationLines.forEach((line) => {
      line.visible = false;
    });
  }

  private createConstellationArt(
    constellation: string,
    starPositions: THREE.Vector3[],
    rotationZ: number,
    scaleFactor: number,
    offsetX: number,
    offsetY: number,
    offsetZ: number,
  ): THREE.Mesh | null {
    if (starPositions.length === 0) return null;

    const texture = this.textureLoader.load(
      `assets/constellation-art/art-transparent/${constellation}(1).png`,
    );
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);

    // Centro
    const center = new THREE.Vector3();
    starPositions.forEach((p) => center.add(p));
    center.divideScalar(starPositions.length);

    // Dirección principal
    const dir = new THREE.Vector3();
    for (let i = 0; i < starPositions.length - 1; i++) {
      dir.add(starPositions[i + 1].clone().sub(starPositions[i]));
    }
    dir.normalize();

    // Orientación
    const toCamera = this.camera.position.clone().sub(center).normalize();
    const tangent = dir.clone().normalize();
    const bitangent = new THREE.Vector3()
      .crossVectors(toCamera, tangent)
      .normalize();
    const normal = new THREE.Vector3()
      .crossVectors(tangent, bitangent)
      .normalize();
    const basis = new THREE.Matrix4().makeBasis(tangent, bitangent, normal);

    const specialConstellations = new Set([
      'Aur',
      'Crt',
      'Tri',
      'TrA',
      'Oph',
      'Equ',
      'Cep',
      'Cha',
      'Ind',
      'Scl',
      'Phe',
      'PsA',
      'Nor',
      'Oct',
      'Sct',
      'Sgr',
    ]);
    if (specialConstellations.has(constellation)) {
      mesh.lookAt(new THREE.Vector3(0, 0, 0));
    } else {
      mesh.setRotationFromMatrix(basis);
    }

    mesh.rotateZ(rotationZ);

    const maxDistance = Math.max(
      ...starPositions.map((p) => p.distanceTo(center)),
    );
    let scale = maxDistance * scaleFactor;
    if (constellation === 'Oph') scale *= 2;
    mesh.scale.set(scale, scale, scale);

    mesh.position.copy(
      center.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ)),
    );
    mesh.userData['constellation'] = constellation;
    mesh.visible = this.constellationsArtVisible;
    mesh.renderOrder = 1;
    this.scene.add(mesh);

    return mesh;
  }

  public showConstellationsArt() {
    this.constellationArt.forEach((a) => (a.visible = true));
  }

  public hideConstellationsArt() {
    this.constellationArt.forEach((a) => (a.visible = false));
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.camera || !this.scene) return;

    const rect = this.canvas.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.params.Points.threshold = 10;

    const hits = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (hits.length === 0) {
      if (this.hoveredObject) {
        this.hoveredObject = null;
        this.onObjectHover.emit(null);
      }
      return;
    }

    let object = hits[0].object as any;

    // console.log(object);

    // Caso estrella
    if (object.userData?.['star']) {
      if (this.hoveredObject !== object) {
        this.hoveredObject = object;

        this.onObjectHover.emit({
          name: object.userData.proper || object.name || 'Star',
          object,
          point: hits[0].point,
        });
      }
      return;
    }

    //Caso planeta
    if (object.userData?.['_id']) {
      // console.log(this.planets);
      for (const planeta of this.planets) {
        if (planeta['_id'] === object.userData['_id']) {
          object = planeta;
          object.name = object.label;
          break;
        }
      }
    }
    //Caso Constelacion
    if (object.userData?.['constellation'] && this.constellationsVisible) {
      if (this.hoveredObject !== object) {
        this.hoveredObject = object;

        const abbrev = object.userData.constellation;
        const fullName = constellations[abbrev] || abbrev;

        this.onObjectHover.emit({
          name: fullName,
          object,
          point: hits[0].point,
        });
      }
      return;
    }

    if (this.hoveredObject !== object) {
      this.hoveredObject = object;

      this.onObjectHover.emit({
        name: object.name || 'Planet',
        object,
        point: hits[0].point,
      });
    }
  };

  // Crear skybox
  addSkybox() {
    // const geometry = new THREE.SphereGeometry(1001, 60, 40);
    const geometry = new THREE.SphereGeometry(
      this.CELESTIAL_SPHERE_RADIUS + ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE,
      32,
      16,
      0,
    );

    // Invertir esfera
    geometry.scale(-1, 1, 1);

    // Creamos gradiente
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;

    const ctx = canvas.getContext('2d')!;

    // Gradiente vertical
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

    gradient.addColorStop(0, '#000118'); // arriba
    gradient.addColorStop(0.5, '#1a0844');
    gradient.addColorStop(1, '#6f3b99'); // horizonte

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    // Material
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
    });

    // Mesh
    const sky = new THREE.Mesh(geometry, material);

    // this.scene.add(sky);

    const geometry2 = new THREE.SphereGeometry(
      // (this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE),
      this.CELESTIAL_SPHERE_RADIUS - ENGINE_CONFIG.SKYBOX_SIZE_DIFFERENCE,
      32,
      16,
      0,
    );

    const texture2 = new THREE.TextureLoader().load(
      '../../assets/images/skybox.png',
    );
    texture2.colorSpace = THREE.SRGBColorSpace;

    // Material
    const material2 = new THREE.MeshBasicMaterial({
      map: texture2,
      transparent: true,
      side: THREE.BackSide,
    });

    // Mesh
    this.landscape = new THREE.Mesh(geometry2, material2);

    this.landscape.renderOrder = 9999;

    this.scene.add(this.landscape);
  }

  // Skybox
  updateSkybox() {
    if (!this.landscape) return;

    const horizonEnabled = this.constellationState.getShowSkybox();
    if (!horizonEnabled) {
      this.landscape.visible = false;
      return;
    }

    this.landscape.visible = true;
  }
}
