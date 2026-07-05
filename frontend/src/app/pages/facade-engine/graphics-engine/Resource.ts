import { mat4, vec3 } from "gl-matrix";

export abstract class Resource {
  public nombre: string;
  protected cargado: boolean = false;

  // Bounding box en forma de esfera para el frustum culling
  public boundingRadius: number = 1;
  public boundingCenter: vec3 = vec3.create();

  constructor(nombre: string) {
    this.nombre = nombre;
  }

  abstract load(gl: WebGL2RenderingContext): Promise<void>;
  abstract dispose(gl: WebGL2RenderingContext): void;

  public isLoaded(): boolean {
    return this.cargado;
  }

  // Funciones para frustum culling
  abstract computeBoundingSphere(): void;

  public getBoundingCenter(){
    return this.boundingCenter;
  }

  public getBoundingRadius(){
    return this.boundingRadius;
  }
}