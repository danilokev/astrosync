import { mat4, vec3 } from 'gl-matrix';
import { Entity } from './Entity';
import { bottom, left, right } from '@popperjs/core';
import { Mesh } from './Mesh';
import { TNode } from './TNode';
import { Light } from 'three';
import { RenderableEntity } from './RenderableEntity';
import { ResourceLineSegment } from './ResourceLineSegment';
import { ResourceLineLoop } from './ResourceLineLoop';
// import { Plane } from 'three';

type Plane = {
  a: number;
  b: number;
  c: number;
  d: number;
};

export class Camera extends Entity {
  private projectionMatrix: mat4 = mat4.create();
  private viewMatrix: mat4 = mat4.create();

  private position: vec3 = vec3.fromValues(0, 0, 5);
  private target: vec3 = vec3.fromValues(0, 0, 0);
  private up: vec3 = vec3.fromValues(0, 1, 0);

  private cameraTarget = vec3.fromValues(0, 0, 0); // Punto al que mira la cámara
  private cameraDistance = 4; // Distancia inicial al objetivo
  private cameraYaw = 0; // Rotación horizontal (radianes)
  private cameraPitch = 0; // Rotación vertical (radianes)

  private flyToFinalized = true;
  private flyToData = {
    targetFinal: vec3.fromValues(0, 0, 0),
    distanceFinal: 4,
    yawFinal: 0,
    pitchFinal: 0,
    targetInitial: vec3.fromValues(0, 0, 0),
    distanceInitial: 4,
    yawInitial: 0,
    pitchInitial: 0,
    t: 0,
    duration: 0,
    onFinish: undefined as (() => void) | undefined
  };

  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private rotationSpeed = 0.005;
  private zoomSpeed = 1.05; // Factor de zoom por scroll
  private minDistance = 0.5; // Zoom máximo cercano
  private maxDistance = 1000; // Zoom máximo lejano

  private fov = 75;
  private aspect = 1.5;
  private near = 0.1;
  private far = 1000;

  private minFov = 20;
  private maxFov = 80;

  private frustumPlanes: Plane[] = [];

  // Constructor
  public constructor() {
    super();
  }

  // =============================
  // CONFIGURACIÓN
  // =============================

  public setPosition(x: number, y: number, z: number): void {
    vec3.set(this.position, x, y, z);
    this.updateViewMatrix();
  }

  public lookAt(x: number, y: number, z: number): void {
    vec3.set(this.target, x, y, z);
    this.updateViewMatrix();
  }

  public setPerspective(
    fovDeg: number,
    aspect: number,
    near: number,
    far: number,
  ): void {
    this.fov = fovDeg;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    const fovRad = (fovDeg * Math.PI) / 180;
    mat4.perspective(this.projectionMatrix, fovRad, aspect, near, far);

    this.updateFrustum();
  }

  // =============================
  // MATRICES
  // =============================

  public updateViewMatrix(): void {
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    this.updateFrustum();
  }

  public getViewMatrix(): mat4 {
    return this.viewMatrix;
  }

  public getProjectionMatrix(): mat4 {
    return this.projectionMatrix;
  }

  public getPosition(): vec3 {
    return this.position;
  }

  public updateCameraPosition() {
    const x =
      this.cameraTarget[0] +
      this.cameraDistance *
        Math.cos(this.cameraPitch) *
        Math.sin(this.cameraYaw);
    const y =
      this.cameraTarget[1] + this.cameraDistance * Math.sin(this.cameraPitch);
    const z =
      this.cameraTarget[2] +
      this.cameraDistance *
        Math.cos(this.cameraPitch) *
        Math.cos(this.cameraYaw);

    this.setPosition(x, y, z);
    this.lookAt(
      this.cameraTarget[0],
      this.cameraTarget[1],
      this.cameraTarget[2],
    );
  }

  //Controles rotación y zoom
  public initCameraControls(canvas: HTMLCanvasElement) {
    canvas.style.touchAction = 'none';
    // Inicia dragging
    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });

    // Rotación con mouse
    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastMousePos.x;
      const deltaY = e.clientY - this.lastMousePos.y;
      this.lastMousePos = { x: e.clientX, y: e.clientY };

      this.cameraYaw -= deltaX * this.rotationSpeed;
      this.cameraPitch += deltaY * this.rotationSpeed;

      // Limitar pitch para no voltear cámara
      const maxPitch = Math.PI / 2 - 0.01;
      this.cameraPitch = Math.max(
        Math.min(this.cameraPitch, maxPitch),
        -maxPitch,
      );

      this.updateCameraPosition();
    });

    // Zoom con rueda
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomIn = e.deltaY < 0; // deltaY < 0 → rueda hacia arriba → acercar
      // this.zoomCamera(zoomIn);
      this.zoomFOV(zoomIn);
    });
  }

  //Control zoom
  private zoomCamera(zoomIn: boolean) {
    if (zoomIn) {
      this.cameraDistance /= this.zoomSpeed; // Acercar
    } else {
      this.cameraDistance *= this.zoomSpeed; // Alejar
    }

    // Limitar distancia
    this.cameraDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.cameraDistance),
    );

    // Actualizar posición real de la cámara
    this.updateCameraPosition();
  }

  // Control zoom using FOV
  private zoomFOV(zoomIn: boolean) {
    const zoomStep = this.zoomSpeed;

    if (zoomIn) {
      this.fov /= zoomStep;
    } else {
      this.fov *= zoomStep;
    }

    //
    this.fov = Math.max(this.minFov, Math.min(this.maxFov, this.fov));

    //
    this.setPerspective(this.fov, this.aspect, this.near, this.far);
  }

  // No dibuja nada
  public override draw(gl: WebGL2RenderingContext, mt: mat4): void {
    // if(!this.flyToFinalized){
    //   this.updateFlyAnimation();
    // }
  }

  // Obtener fov
  public getFov(): Readonly<number> {
    return this.fov;
  }

  // Obtener frustum
  public extractFrustumPlanes(m: mat4): Plane[] {
    const planes: Plane[] = [];

    // Left
    planes.push(
      this.normalize({
        a: m[3] + m[0],
        b: m[7] + m[4],
        c: m[11] + m[8],
        d: m[15] + m[12],
      }),
    );

    // Right
    planes.push(
      this.normalize({
        a: m[3] - m[0],
        b: m[7] - m[4],
        c: m[11] - m[8],
        d: m[15] - m[12],
      }),
    );

    // Bottom
    planes.push(
      this.normalize({
        a: m[3] + m[1],
        b: m[7] + m[5],
        c: m[11] + m[9],
        d: m[15] + m[13],
      }),
    );

    // Top
    planes.push(
      this.normalize({
        a: m[3] - m[1],
        b: m[7] - m[5],
        c: m[11] - m[9],
        d: m[15] - m[13],
      }),
    );

    // Near
    planes.push(
      this.normalize({
        a: m[3] + m[2],
        b: m[7] + m[6],
        c: m[11] + m[10],
        d: m[15] + m[14],
      }),
    );

    // Far
    planes.push(
      this.normalize({
        a: m[3] - m[2],
        b: m[7] - m[6],
        c: m[11] - m[10],
        d: m[15] - m[14],
      }),
    );

    return planes;
  }

  // Normalizar planos
  public normalize(p: Plane): Plane {
    const len = Math.hypot(p.a, p.b, p.c);

    return {
      a: p.a / len,
      b: p.b / len,
      c: p.c / len,
      d: p.d / len,
    };
  }

  // Actualizar frustum
  public updateFrustum(): void {
    const vp = mat4.create();
    mat4.multiply(vp, this.projectionMatrix, this.viewMatrix);

    this.frustumPlanes = this.extractFrustumPlanes(vp);
  }

  // Comprobar si el objeto está visible dentro del frustum
  public inFrustum(node: TNode): boolean {
    const worldCenter = vec3.create();

    const entity = node.getEntity();

    if (!entity) return false;
    if (!(entity instanceof RenderableEntity)) return true;
    if (
      entity.getResource() instanceof ResourceLineSegment ||
      entity.getResource() instanceof ResourceLineLoop
    )
      return true;

    // Centro en coordenadas del mundo
    vec3.transformMat4(
      worldCenter,
      entity.getResource().getBoundingCenter(),
      node.getWorldMatrix(),
    );

    // Radio escalado
    const scale = node.getScale();
    const maxScale = Math.max(scale[0], scale[1], scale[2]);

    const worldRadius = entity.getResource().getBoundingRadius() * maxScale;
    /*const m = node.getWorldMatrix();

    //
    const sx = Math.hypot(m[0], m[1], m[2]);
    const sy = Math.hypot(m[4], m[5], m[6]);
    const sz = Math.hypot(m[8], m[9], m[10]);

    const maxScale = Math.max(sx, sy, sz);

    const worldRadius = entity.getResource().getBoundingRadius() * maxScale;*/

    for (const p of this.frustumPlanes) {
      const d =
        p.a * worldCenter[0] +
        p.b * worldCenter[1] +
        p.c * worldCenter[2] +
        p.d;

      if (d < -worldRadius) {
        return false;
      }
    }

    /*for (let i = 0; i < this.frustumPlanes.length; i++) {

      if (i === 4) continue; // no incluimos plano near

      const p = this.frustumPlanes[i];

      const d =
        p.a * worldCenter[0] +
        p.b * worldCenter[1] +
        p.c * worldCenter[2] +
        p.d;

      if (d < -worldRadius) {
        return false;
      }
    }*/

    return true;
  }

  public setTarget(x: number, y: number, z: number) {
    this.target = vec3.fromValues(x, y, z);
  }

  public getTarget() {
    return this.target;
  }

  // Función para volar hacia el objeto
  public flyTo(position: vec3, duration: number = 1, distance: number = 0.00001, rotate: boolean = true, onFinish?: () => void) {
    this.flyToData.onFinish = onFinish;
    const pos = vec3.clone(this.getPosition());

    vec3.copy(this.flyToData.targetInitial, this.cameraTarget);
    this.flyToData.distanceInitial = this.cameraDistance;
    this.flyToData.yawInitial = this.cameraYaw;
    this.flyToData.pitchInitial = this.cameraPitch;

    vec3.copy(this.flyToData.targetFinal, position);
    this.flyToData.distanceFinal = distance;

    if (rotate) {
      const dir = vec3.create();

      vec3.subtract(dir, this.position, position);

      vec3.normalize(dir, dir);

      this.flyToData.yawFinal =
        Math.atan2(dir[0], dir[2]);

      this.flyToData.pitchFinal =
        Math.asin(dir[1]);

      const maxPitch = Math.PI / 2 - 0.01;

      this.flyToData.pitchFinal = Math.max(
        -maxPitch,
        Math.min(maxPitch, this.flyToData.pitchFinal)
      );
    } else {
      // rotation stays unchanged
      this.flyToData.yawFinal = this.cameraYaw;
      this.flyToData.pitchFinal = this.cameraPitch;
    }

    this.flyToData.t = 0;
    this.flyToData.duration = duration;

    this.flyToFinalized = false;
  }

  // Cálculo de interpolación
  public updateFlyAnimation(deltaTime: number) {
    if (this.flyToFinalized) return;

    this.flyToData.t += deltaTime / this.flyToData.duration;

    const t = Math.min(this.flyToData.t, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    vec3.lerp(
      this.cameraTarget,
      this.flyToData.targetInitial,
      this.flyToData.targetFinal,
      ease
    );

    this.cameraDistance =
      this.flyToData.distanceInitial +
      (this.flyToData.distanceFinal - this.flyToData.distanceInitial) * ease;

    this.cameraYaw = this.lerpAngle(
      this.flyToData.yawInitial,
      this.flyToData.yawFinal,
      ease
    );

    this.cameraPitch = this.lerpAngle(
      this.flyToData.pitchInitial,
      this.flyToData.pitchFinal,
      ease
    );

    this.updateCameraPosition();

    if (t >= 1) {
      this.flyToFinalized = true;

      if (this.flyToData.onFinish) {
        this.flyToData.onFinish();
        this.flyToData.onFinish = undefined;
      }
    }
  }

  // Auxilar
  private lerpAngle(a: number, b: number, t: number) {
    const TWO_PI = Math.PI * 2;

    let delta = (b - a) % TWO_PI;

    if (delta > Math.PI) delta -= TWO_PI;
    if (delta < -Math.PI) delta += TWO_PI;

    return a + delta * t;
  }

  public getFlyToData(): Readonly<any>{
    return this.flyToData;
  }

  public setYaw(yaw: number): void{
    this.cameraYaw = yaw;
  }

  public setPitch(pitch: number): void{
    this.cameraPitch = pitch;
  }
}
