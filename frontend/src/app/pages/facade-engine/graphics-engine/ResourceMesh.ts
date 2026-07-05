import { Resource } from "./Resource";
import { mat4, vec3 } from "gl-matrix";


export class ResourceMesh extends Resource {

  private vao!: WebGLVertexArrayObject;
  private vbo!: WebGLBuffer;
  private ebo!: WebGLBuffer;

  private indexCount: number = 0;

  constructor(
    nombre: string,
    private vertices: Float32Array,
    private indices: Uint16Array | Uint32Array,
    private uvs?: Float32Array,
    private normals: Float32Array | null = null,
    /*private material?: {
        roughness?: number,
        metallic?: number,
        specular?: number,
        ambient?: number
    },*/
  ) {
    super(nombre);
  }

  async load(gl: WebGL2RenderingContext): Promise<void> {

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
  
    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  
    if (this.uvs && this.normals) {
      const vertexCount = this.vertices.length / 3;
      const interleaved = new Float32Array(vertexCount * 8); // 3 pos + 2 uv + 3 normal

      for (let i = 0, j = 0, k = 0; i < this.vertices.length; i += 3, j += 2) {
          // posición
          interleaved[k++] = this.vertices[i];
          interleaved[k++] = this.vertices[i + 1];
          interleaved[k++] = this.vertices[i + 2];

          // uv
          interleaved[k++] = this.uvs[j];
          interleaved[k++] = this.uvs[j + 1];

          // normal
          interleaved[k++] = this.normals[i];
          interleaved[k++] = this.normals[i + 1];
          interleaved[k++] = this.normals[i + 2];
      }

      gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

      // attributes
      gl.enableVertexAttribArray(0); // position
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);

      gl.enableVertexAttribArray(1); // UV
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 12);

      gl.enableVertexAttribArray(2); // normals
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 20);

  }
    else if (this.uvs) {
  
      // Intercalar posición + UV
      const vertexCount = this.vertices.length / 3;
      const interleaved = new Float32Array(vertexCount * 5);
  
      for (let i = 0, j = 0, k = 0; i < this.vertices.length; i += 3, j += 2) {
  
        // posición
        interleaved[k++] = this.vertices[i];
        interleaved[k++] = this.vertices[i + 1];
        interleaved[k++] = this.vertices[i + 2];
  
        // uv
        interleaved[k++] = this.uvs[j];
        interleaved[k++] = this.uvs[j + 1];
      }
  
      gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
  
      // atributo posición
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(
        0,
        3,
        gl.FLOAT,
        false,
        20,   // stride = 5 floats * 4 bytes
        0
      );
  
      // atributo UV
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(
        1,
        2,
        gl.FLOAT,
        false,
        20,
        12    // offset = 3 floats * 4 bytes
      );
  
    }
   else {
  
      // Solo posición (fallback)
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
  
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(
        0,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }
  
    // EBO
    this.ebo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  
    this.indexCount = this.indices.length;
  
    gl.bindVertexArray(null);
  
    this.cargado = true;
  }

  // Visualizar
  // Reescribir para usar la matriz de transformación mt para pasarla al shader
  draw(gl: WebGL2RenderingContext, mt: mat4) {

    if (!this.cargado) return;

    gl.bindVertexArray(this.vao);

    const indexType =
      this.indices instanceof Uint32Array
        ? gl.UNSIGNED_INT
        : gl.UNSIGNED_SHORT;

    gl.drawElements(
      gl.TRIANGLES,
      this.indexCount,
      indexType,
      0
    );

    gl.bindVertexArray(null);
  }
 /*draw(gl: WebGL2RenderingContext, mt: mat4, shaderProgram: WebGLProgram) {
    if (!this.cargado) return;

    gl.bindVertexArray(this.vao);

    // Material
    if(this.material) {
        const roughLoc = gl.getUniformLocation(shaderProgram, "uRoughness");
        if(roughLoc) gl.uniform1f(roughLoc, this.material.roughness ?? 0.5);

        const specLoc = gl.getUniformLocation(shaderProgram, "uSpecular");
        if(specLoc) gl.uniform1f(specLoc, this.material.specular ?? 1.0);

        const metalLoc = gl.getUniformLocation(shaderProgram, "uMetallic");
        if(metalLoc) gl.uniform1f(metalLoc, this.material.metallic ?? 0.0);
    }

    // Modelo
    const uModel = gl.getUniformLocation(shaderProgram, "uModel");
    if(uModel) gl.uniformMatrix4fv(uModel, false, mt as Float32Array);

    const indexType = this.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.drawElements(gl.TRIANGLES, this.indexCount, indexType, 0);

    gl.bindVertexArray(null);
}*/


  dispose(gl: WebGL2RenderingContext): void {

    gl.deleteBuffer(this.vbo);
    gl.deleteBuffer(this.ebo);
    gl.deleteVertexArray(this.vao);

    this.cargado = false;
  }

  public getNormals(): Float32Array | null{
    return this.normals;
  }

  // Cálculo de bounding box para el frustum culling
  public override computeBoundingSphere(): void {
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < this.vertices.length; i += 3) {
      const x = this.vertices[i];
      const y = this.vertices[i + 1];
      const z = this.vertices[i + 2];

      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);

      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
      max[2] = Math.max(max[2], z);
    }

    const center = [
      (min[0] + max[0]) * 0.5,
      (min[1] + max[1]) * 0.5,
      (min[2] + max[2]) * 0.5
    ];

    let radius = 0;
    for (let i = 0; i < this.vertices.length; i += 3) {
      const dx = this.vertices[i] - center[0];
      const dy = this.vertices[i + 1] - center[1];
      const dz = this.vertices[i + 2] - center[2];

      radius = Math.max(radius, Math.sqrt(dx*dx + dy*dy + dz*dz));
    }

    this.boundingCenter = center;
    this.boundingRadius = radius;
  }
}