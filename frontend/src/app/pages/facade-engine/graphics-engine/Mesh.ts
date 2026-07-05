import { Entity } from './Entity';
import { Scene } from './Scene';
import { ResourceMesh } from './ResourceMesh';
import { Camera } from './Camera';
import { Light } from './Light';
import { PointLight } from './PointLight';
import { mat4, vec3 } from 'gl-matrix';
import { ResourceShader } from './ResourceShader';
import { Resource } from './Resource';
import { RenderableEntity } from './RenderableEntity';
import { ResourceMaterial } from './ResourceMaterial';
import { MaterialData } from './MaterialData';


type UniformValue =
  | { type: "1f"; value: number }
  | { type: "3fv"; value: Float32Array }
  | { type: "mat4"; value: Float32Array };

export class Mesh extends RenderableEntity {
  private additionalUniforms: Record<string, UniformValue> = {};
  private isSun: boolean = false;

  // Opciones para el renderizado
  /*public transparent: boolean = false;
  public depthWrite: boolean = true;
  public cull: boolean = true;*/
  // public queue: number = 1000;

  public setAsSun(value: boolean) {
      this.isSun = value;
  }
  // Constructor
  public constructor(
    private meshResource: ResourceMesh, //ref a recurso, guardamos índice en lugar de malla
    private shader: ResourceShader,
    private material: ResourceMaterial,
    public texture?: WebGLTexture   // 🔹 añadir aquí
  ) {
    super();
    // llamar al gestor de recursos comprobando si existe
        // si no, cargar


        // o se puede hacer un método para indicar el recurso setResource()
  }

  // Visualizar la malla
  /*public override draw(gl: WebGL2RenderingContext, mt: mat4): void {

    const program = this.shader.getProgram();
    gl.useProgram(program);

    const uModel = gl.getUniformLocation(program, 'uModel');
    gl.uniformMatrix4fv(uModel, false, mt as Float32Array);

    // 🔹 Bindear la textura del Mesh si existe
    if (this.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        const uTexLoc = gl.getUniformLocation(program, "uTexture");
        gl.uniform1i(uTexLoc, 0);
    }

    this.meshResource.draw(gl, mt);
  }*/
  public override draw(gl: WebGL2RenderingContext, mt: mat4, camera?: Camera | null, light?: Light | null, pointLight?: PointLight | null): void {
    
    if(!camera) return;
    if(!light) return;
    if (!this.shader) return;
    const program = this.shader.getProgram();
    if (!program) return; // <-- Protege si shader aún no cargado
    gl.useProgram(program);

    this.material?.draw(gl, program); // Material
    // =====================================================
    // CONFIGURACIÓN DE RENDER SEGÚN MATERIAL
    // =====================================================

    // ---- Transparencia
    /*if (this.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.disable(gl.BLEND);
    }

    // ---- Escritura en depth buffer
    gl.depthMask(this.depthWrite);

    // ---- Culling
    if (this.cull) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    } else {
      gl.disable(gl.CULL_FACE);
    }*/

    // ---- Transparencia
    /*const materialData = this.material.getData();
    if(materialData){
      if (materialData.transparent) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.disable(gl.BLEND);
      }

      // ---- Escritura en depth buffer
      if(materialData.depthWrite != null) gl.depthMask(materialData.depthWrite);

      // ---- Culling
      if (materialData.cull) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
      } else {
        gl.disable(gl.CULL_FACE);
      }
    }*/
    

    // Enviamos uniforms adicionales
    for (const name in this.additionalUniforms) {
      const uniform = this.additionalUniforms[name];
      const loc = gl.getUniformLocation(program, name);
      if (!loc) continue;

      switch (uniform.type) {
        case "1f":
          gl.uniform1f(loc, uniform.value);
          break;

        case "3fv":
          gl.uniform3fv(loc, uniform.value);
          break;

        case "mat4":
          gl.uniformMatrix4fv(loc, false, uniform.value);
          break;
      }
    }

    const uModel = gl.getUniformLocation(program, 'uModel');
    gl.uniformMatrix4fv(uModel, false, mt as Float32Array);

    // View y Projection de la cámara
    const viewLoc = gl.getUniformLocation(program, 'uView');
    const projLoc = gl.getUniformLocation(program, 'uProjection');
    const viewPosLoc = gl.getUniformLocation(program, 'uViewPos');

    if (viewLoc !== null)
      gl.uniformMatrix4fv(
        viewLoc,
        false,
        camera.getViewMatrix() as Float32List,
      );

    if (projLoc !== null)
      gl.uniformMatrix4fv(
        projLoc,
        false,
        camera.getProjectionMatrix() as Float32List,
      );

    if (viewPosLoc !== null)
      gl.uniform3fv(
        viewPosLoc,
        camera.getPosition() as Float32List,
      );

    // 🔹 Bindear la textura del Mesh si existe
    if (this.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        const uTexLoc = gl.getUniformLocation(program, "uTexture");
        gl.uniform1i(uTexLoc, 0);
    }

    // Actualizar luz

      light.setShader(program);


    if (pointLight && this.isSun) {  // solo si este mesh es el Sol
        pointLight.setShader(program);
        pointLight.draw(gl);
    }
    this.meshResource.draw(gl, mt);
  }

  // Establecer uniforms adicionales
  public setAdditionalUniform(name: string, uniform: UniformValue): void {
    this.additionalUniforms[name] = uniform;
  }

  // Aplicar o no backface culling
  /*public setCull(cull: boolean): void{
    this.cull = cull;
  }

  // Transparencia
  public setTransparent(transparent: boolean): void{
    this.transparent = transparent;
  }

  // Profundidad
  public setDepthWrite(depth: boolean): void{
    this.depthWrite = depth;
  }

  // Orden de renderizado
  public setQueue(queue: number): void{
    this.queue = queue;
  }*/

  // Actualizar datos del material
  public setMaterialData(data: Partial<MaterialData>): void{
    this.material?.setData(data);
  }

  // ==================================
  // GETTERS
  // ==================================
  // Obtener recurso
  public getResource(): Readonly<Resource>{
    return this.meshResource;
  }

  // Obtener shader
  public getShader(): Readonly<ResourceShader>{
    return this.shader;
  }

  // Obtener material
  public getMaterial(): Readonly<ResourceMaterial>{
    return this.material;
  }

  // Obtener textura
  public getTexture(): Readonly<WebGLTexture | undefined>{
    return this.texture;
  }

  // Obtener uniforms adicionales
  public getAdditionalUniform(): Readonly<Record<string, UniformValue>>{
    return this.additionalUniforms;
  }
}
