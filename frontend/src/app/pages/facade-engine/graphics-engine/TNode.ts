import { mat4, mat3, vec3, quat } from 'gl-matrix';
import { Entity } from './Entity';
import { Camera } from './Camera';
import { Light } from './Light';
import { PointLight } from './PointLight';
import { Mesh } from './Mesh';
import { Animation } from './Animation';


// Nodo del árbol
export class TNode {
  private parent: TNode | undefined | null = null;
  private children: TNode[] = [];
  public userData: any = {};
  private entity: Entity | null = null; // Clase abstracta que será impelentada por las clases Malla, Cámara, Luz, ...

  private translationVec: vec3 = vec3.fromValues(0, 0, 0);
  private rotationVec: vec3 = vec3.fromValues(0, 0, 0);
  private visible: boolean = true;
  private scaleVec: vec3 = vec3.fromValues(1, 1, 1);
  // private transformMatrix: mat4 = mat4.create();

  private localMatrix: mat4 = mat4.create();
  private worldMatrix: mat4 = mat4.create();

  private queue: number = 1000;

  private animation: Animation | null = null;

  // Constructor
  public constructor(public readonly id: number) {}

  // Añadir hijo
  public addChild(child: TNode): void {
    child.parent = this;
    this.children.push(child);
  }

  // Destructor ?
  public destroy(): void {
    this.children = [];
    this.parent = null;
    this.entity = null; // añadir destroy en Entity y corregir
    this.translationVec = [0, 0, 0];
    this.rotationVec = [0, 0, 0];
    this.scaleVec = [1, 1, 1];
    mat4.identity(this.localMatrix);
    mat4.identity(this.worldMatrix);
  }

  // Eliminar hijo
  public deleteChild(child: TNode): void {
    const index = this.children.indexOf(child);
    if (index === -1) return;

    this.children.splice(index, 1);
    child.destroy();
  }

  // Eliminar todos los hijos
  public deleteChildren(): void {
    this.children.forEach((child) => child.destroy());
    this.children = [];
  }

  // Obtener el id
  public getId(): number {
    return this.id;
  }

  // Obtener nodo padre
  public getParent(): TNode | undefined | null {
    return this.parent;
  }

  // Obtener array con hijos
  public getChildren(): TNode[] {
    return this.children;
  }

  // Obtener entidad
  public getEntity(): Entity | null {
    return this.entity;
  }

  // Establecer entidad
  public setEntity(entity: Entity): boolean {
    this.entity = entity;
    return true;
  }

  // Establecer traslación (local)
  public setTranslation(translation: vec3): void {
    this.translationVec = translation;
    this.updateWorldMatrix();
  }

  // Establecer rotación (local)
  public setRotation(rotation: vec3): void {
    this.rotationVec = rotation;
    this.updateWorldMatrix();
  }

  // Establecer escalado (local)
  public setScale(scale: vec3): void {
    this.scaleVec = scale;
    this.updateWorldMatrix();
  }

  // Trasladar
  public translate(vec: vec3): mat4 {
    vec3.add(this.translationVec, this.translationVec, vec);
    this.updateWorldMatrix();
    // return this.localMatrix;
    return this.worldMatrix;
  }

  // Rotar
  public rotate(vec: vec3): mat4 {
    // en grados
    vec3.add(this.rotationVec, this.rotationVec, vec);
    this.updateWorldMatrix();
    // return this.localMatrix;
    return this.worldMatrix;
  }

  // Escalar
  public scale(vec: vec3): mat4 {
    vec3.multiply(this.scaleVec, this.scaleVec, vec);
    this.updateWorldMatrix();
    // return this.localMatrix;
    return this.worldMatrix;
  }

  // Obtener translation
  public getTranslation(): vec3 {
    return this.translationVec;
  }

  // Obtener rotación
  public getRotation(): vec3 {
    return this.rotationVec;
  }

  // Obtener escalado
  public getScale(): vec3 {
    return this.scaleVec;
  }

  // Establecer matriz de transformación
  /*public setTransformMatrix(mat: mat4): void{
        this.transformMatrix = mat;
    }

    // Obtener matriz de transformación
    public getTransformMatrix(): mat4{
        return this.transformMatrix;
    }*/

  // Establecer matriz de transformación local
  public setLocalMatrix(mat: mat4): void {
    this.localMatrix = mat;
  }

  // Obtener matriz de transformación local
  public getLocalMatrix(): mat4 {
    return this.localMatrix;
  }

  // Establecer matriz de transformación global
  public setWorldMatrix(mat: mat4): void {
    this.worldMatrix = mat;
  }

  // Obtener matriz de transformación global
  public getWorldMatrix(): mat4 {
    return this.worldMatrix;
  }

  // Visualizar la entidad
  public draw(
    gl: WebGL2RenderingContext,
    camera: TNode,
    light: TNode,
    pointLight?: PointLight | null,
  ): void {
    const camEntity = camera?.getEntity();
    const lightEntity = light?.getEntity();

    // Aplicar animcación
    if (this.animation && this.entity instanceof Mesh) {
      this.entity = this.animation.getCurrentMesh();

      // Actualizar
      this.animation.update();
    }

    // Convertimos null a undefined para Mesh
    const pointLightForMesh = pointLight ?? undefined;
    if (camEntity instanceof Camera && lightEntity instanceof Light) {
      this.entity?.draw(
        gl,
        this.worldMatrix,
        camEntity,
        lightEntity,
        pointLightForMesh,
      );
    } else if (camEntity instanceof Camera) {
      //  LineLoop, Points, Sprites — entidades que solo necesitan la cámara
      this.entity?.draw(gl, this.worldMatrix, camEntity);
    } else {
      this.entity?.draw(gl, this.worldMatrix);
    }
    // this.entity?.draw(gl, this.worldMatrix, camera?.getEntity(), light?.getEntity());
  }

  // Actualizar matriz de transformación local
  // T * R * S
  public updateLocalMatrix(): mat4 {
    const T = mat4.create();
    const R = mat4.create();
    const S = mat4.create();
    const aux = mat4.create();

    // Creación de matrices a multiplicar
    // Traslación
    mat4.fromTranslation(T, this.translationVec);

    // Rotación
    mat4.rotateX(R, R, (this.rotationVec[0] * Math.PI) / 180); // conversión a radianes
    mat4.rotateY(R, R, (this.rotationVec[1] * Math.PI) / 180);
    mat4.rotateZ(R, R, (this.rotationVec[2] * Math.PI) / 180);

    // Escalado
    mat4.fromScaling(S, this.scaleVec);

    // Multiplicación
    mat4.multiply(aux, T, R);
    mat4.multiply(this.localMatrix, aux, S);

    return this.localMatrix;
  }

  // Actualizar matriz de transformación global
  /*public updateWorldMatrix(): mat4{
        const W = this.parent?.getWorldMatrix();

        if(W) mat4.multiply(this.worldMatrix, W, this.localMatrix);
        else mat4.copy(this.worldMatrix, this.localMatrix);

        return this.worldMatrix;
    }*/

  // Actualizar matriz de transformación global recursivamente
  public updateWorldMatrix(): void {
    this.updateLocalMatrix();
    const W = this.parent?.getWorldMatrix();

    if (W) mat4.multiply(this.worldMatrix, W, this.localMatrix);
    else mat4.copy(this.worldMatrix, this.localMatrix);

    // Actualizar los hijos
    for (const child of this.children) {
      child.updateWorldMatrix();
    }
  }

  // Orientación hacia un punto
  public lookAt(target: vec3): void {
    /*const pos = this.translationVec;

        const position = vec3.fromValues(pos[0], pos[1], pos[2]);*/

    const forward = vec3.create();
    vec3.subtract(forward, target, this.translationVec); // vector hacia el punto
    vec3.normalize(forward, forward);

    const up = vec3.fromValues(0, 1, 0); // Up del mundo
    const right = vec3.create();
    vec3.cross(right, up, forward);
    vec3.normalize(right, right);

    const newUp = vec3.create();
    vec3.cross(newUp, forward, right);

    const rotMat = mat4.fromValues(
      right[0],
      right[1],
      right[2],
      0,
      newUp[0],
      newUp[1],
      newUp[2],
      0,
      forward[0],
      forward[1],
      forward[2],
      0,
      0,
      0,
      0,
      1,
    );

    // Creamos matrix 3x3 de la 4x4
    const rotMat3 = mat3.create();
    mat3.fromMat4(rotMat3, rotMat);

    // Creamos cuaternio
    const q = quat.create();
    quat.fromMat3(q, rotMat3);

    // Obtenermos vector en grados
    const euler = this.quatToEulerDeg(q);

    // Actualizamos rotación
    this.setRotation(euler);
  }

  // Obtener ángulos del cuaternio (en radianes)
  public quatToEuler(q: quat): vec3 {
    const [x, y, z, w] = q;
    const ysqr = y * y;

    // roll (x-axis rotation)
    const t0 = 2.0 * (w * x + y * z);
    const t1 = 1.0 - 2.0 * (x * x + ysqr);
    const roll = Math.atan2(t0, t1);

    // pitch (y-axis rotation)
    let t2 = 2.0 * (w * y - z * x);
    t2 = t2 > 1 ? 1 : t2;
    t2 = t2 < -1 ? -1 : t2;
    const pitch = Math.asin(t2);

    // yaw (z-axis rotation)
    const t3 = 2.0 * (w * z + x * y);
    const t4 = 1.0 - 2.0 * (ysqr + z * z);
    const yaw = Math.atan2(t3, t4);

    return vec3.fromValues(roll, pitch, yaw);
  }

  // Obtener álgulos del cuaternio (en grados)
  public quatToEulerDeg(q: quat): vec3 {
    const [rollRad, pitchRad, yawRad] = this.quatToEuler(q);
    const rad2deg = 180 / Math.PI;

    const roll = rollRad * rad2deg;
    const pitch = pitchRad * rad2deg;
    const yaw = yawRad * rad2deg;

    return vec3.fromValues(roll, pitch, yaw);
  }

  setVisible(v: boolean) {
    this.visible = v;
    
    // Actualizar los hijos
    for (const child of this.children) {
      child.setVisible(v);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  // Orden de renderizado
  public setQueue(queue: number): void {
    this.queue = queue;
  }

  public getQueue(): Readonly<number> {
    return this.queue;
  }

  public setAnimation(animation: Animation): void {
    this.animation = animation;
  }
}
