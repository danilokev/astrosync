import { Resource } from "./Resource";
import { mat4, vec3 } from "gl-matrix";

export class ResourceSprite extends Resource {

  private vao!: WebGLVertexArrayObject;
  private texture: WebGLTexture;
  private size: number;

  constructor(nombre: string, texture: WebGLTexture, size: number = 1) {
    super(nombre);
    this.texture = texture;
    this.size = size;
  }

  getTexture() {
    return this.texture;
  }

  getSize() {
    return this.size;
  }

  async load(gl: WebGL2RenderingContext): Promise<void> {

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    const vertices = new Float32Array([
      -0.5, -0.5, 0, 0,
       0.5, -0.5, 1, 0,
       0.5,  0.5, 1, 1,
      -0.5,  0.5, 0, 1
    ]);

    const indices = new Uint16Array([0,1,2,0,2,3]);

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    const ebo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    this.cargado = true;

    this.computeBoundingSphere();
  }

  draw(gl: WebGL2RenderingContext) {

    if (!this.cargado) return;

    gl.disable(gl.CULL_FACE);

    gl.bindVertexArray(this.vao);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);

    gl.enable(gl.CULL_FACE);
  }

  dispose(gl: WebGL2RenderingContext): void {
    gl.deleteVertexArray(this.vao);
    this.cargado = false;
  }

  public override computeBoundingSphere(): void {
    const half = this.size * 0.5;

    const radius = Math.sqrt(half * half + half * half);

    this.boundingRadius = radius;

    this.boundingCenter = vec3.fromValues(0, 0, 0);
  }
}