import { Entity } from "./Entity";
import { ResourceLineSegment } from "./ResourceLineSegment";
import { ResourceShader } from "./ResourceShader";
import { mat4 } from "gl-matrix";
import { Camera } from "./Camera";
import { Resource } from "./Resource";
import { RenderableEntity } from "./RenderableEntity";

export class LineSegment extends RenderableEntity {

  constructor(
    private resource: ResourceLineSegment,
    private shader: ResourceShader
  ) {
    super();
  }

  draw(gl: WebGL2RenderingContext, modelMatrix: mat4, camera: Camera): void {

    if(!this.shader) return;
    const program = this.shader.getProgram();
    if(!program) return;
    gl.useProgram(program);

    // MODEL
    const modelLoc = gl.getUniformLocation(program, "uModel");
    if (modelLoc)
      gl.uniformMatrix4fv(modelLoc, false, modelMatrix as Float32List);

    // VIEW
    const viewLoc = gl.getUniformLocation(program, "uView");
    if (viewLoc)
      gl.uniformMatrix4fv(
        viewLoc,
        false,
        camera.getViewMatrix() as Float32List
      );

    // PROJECTION
    const projLoc = gl.getUniformLocation(program, "uProjection");
    if (projLoc)
      gl.uniformMatrix4fv(
        projLoc,
        false,
        camera.getProjectionMatrix() as Float32List
      );

    // COLOR
    const colorLoc = gl.getUniformLocation(program, "uColor");
    if (colorLoc)
      gl.uniform3f(colorLoc, 0.27, 0.66, 0.27);

    this.resource.draw(gl, modelMatrix);
  }

  public getResource(): Readonly<Resource> {
    return this.resource;
  }
}
