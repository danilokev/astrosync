import { Resource } from "./Resource";
import { mat4 } from "gl-matrix";

export class ResourceLineLoop extends Resource {

  private vao!: WebGLVertexArrayObject;
  private count: number = 0;

  constructor(
    nombre: string,
    private positions: Float32Array
  ) {
    super(nombre);
  }

  async load(gl: WebGL2RenderingContext): Promise<void> {
    this.count = this.positions.length / 3;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // POSITIONS
    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    this.cargado = true;
  }

  draw(gl: WebGL2RenderingContext, mt: mat4) {
    if (!this.cargado) return;

    gl.disable(gl.CULL_FACE);

    gl.bindVertexArray(this.vao);

    gl.drawArrays(gl.LINE_LOOP, 0, this.count);

    gl.bindVertexArray(null);

    gl.enable(gl.CULL_FACE);
  }

  dispose(gl: WebGL2RenderingContext): void {
    gl.deleteVertexArray(this.vao);
    this.cargado = false;
  }

  public override computeBoundingSphere(): void{
    // ???
  }
}