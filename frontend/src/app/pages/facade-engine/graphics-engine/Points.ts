import { Entity } from './Entity';
import { ResourcePoints } from './ResourcePoints';
import { ResourceShader } from './ResourceShader';
import { mat4 } from 'gl-matrix';
import { Camera } from './Camera';
import { Resource } from './Resource';
import { RenderableEntity } from './RenderableEntity';

export class Points extends RenderableEntity {
  constructor(
    private resource: ResourcePoints,
    private shader: ResourceShader,
  ) {
    super();
  }

  draw(gl: WebGL2RenderingContext, modelMatrix: mat4, camera: Camera): void {
    if (!this.shader) return;
    const program = this.shader.getProgram();
    if (!program) return; // <-- Protege si shader aún no cargado

    gl.useProgram(program);

    // 🔥 ACTIVAR BLENDING SOLO PARA ESTRELLAS
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // (opcional pero recomendable)
    gl.depthMask(false);

    // MODEL
    const modelLoc = gl.getUniformLocation(program, 'uModel');
    if (modelLoc)
      gl.uniformMatrix4fv(modelLoc, false, modelMatrix as Float32List);

    // VIEW
    const viewLoc = gl.getUniformLocation(program, 'uView');
    if (viewLoc)
      gl.uniformMatrix4fv(
        viewLoc,
        false,
        camera.getViewMatrix() as Float32List,
      );

    // PROJECTION
    const projLoc = gl.getUniformLocation(program, 'uProjection');
    if (projLoc)
      gl.uniformMatrix4fv(
        projLoc,
        false,
        camera.getProjectionMatrix() as Float32List,
      );

    // SCALE (para tamaño de estrellas)
    const scaleLoc = gl.getUniformLocation(program, 'uScale');
    if (scaleLoc) gl.uniform1f(scaleLoc, window.innerHeight / 2);

    // FOV
    const fovLoc = gl.getUniformLocation(program, 'uFov');
    if (fovLoc) gl.uniform1f(fovLoc, camera.getFov());

    this.resource.draw(gl, modelMatrix);

    // 🔄 RESTAURAR ESTADO
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  public getResource(): Readonly<Resource> {
    return this.resource;
  }
}
