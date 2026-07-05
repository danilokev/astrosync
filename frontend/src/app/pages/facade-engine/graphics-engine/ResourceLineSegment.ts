import { Resource } from './Resource';
import { mat4 } from 'gl-matrix';

export class ResourceLineSegment extends Resource {
  private vao!: WebGLVertexArrayObject;
  private count: number = 0;
  private posBuffer!: WebGLBuffer;

  constructor(
    nombre: string,
    private positions: Float32Array,
  ) {
    super(nombre);
  }

  async load(gl: WebGL2RenderingContext): Promise<void> {
    this.count = this.positions.length / 3;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // POSITIONS
    this.posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
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

    gl.drawArrays(gl.LINES, 0, this.count);

    gl.bindVertexArray(null);

    gl.enable(gl.CULL_FACE);
  }

  public updatePositions(
    gl: WebGL2RenderingContext,
    newPositions: Float32Array,
  ): void {
    if (!this.cargado || !this.posBuffer) return;
    this.positions = newPositions;
    this.count = newPositions.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, newPositions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  dispose(gl: WebGL2RenderingContext): void {
    gl.deleteVertexArray(this.vao);
    this.cargado = false;
  }

  public override computeBoundingSphere(): void {
    const positions = this.positions;
    const count = positions.length / 3;

    if (count === 0) {
      this.boundingCenter = [0, 0, 0];
      this.boundingRadius = 0;
      return;
    }

    // --- 1. AABB ---
    let minX = positions[0];
    let minY = positions[1];
    let minZ = positions[2];

    let maxX = positions[0];
    let maxY = positions[1];
    let maxZ = positions[2];

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;

      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    // --- 2. Center ---
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    this.boundingCenter = [cx, cy, cz];

    // --- 3. Radius ---
    let maxDistSq = 0;

    for (let i = 0; i < positions.length; i += 3) {
      const dx = positions[i] - cx;
      const dy = positions[i + 1] - cy;
      const dz = positions[i + 2] - cz;

      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > maxDistSq) maxDistSq = distSq;
    }

    this.boundingRadius = Math.sqrt(maxDistSq);
  }
}
