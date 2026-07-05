import { mat4 } from "gl-matrix";
import { Entity } from "./Entity";
import { ResourceSprite } from "./ResourceSprite";
import { ResourceShader } from "./ResourceShader";
import { Camera } from "./Camera";
import { Resource } from "./Resource";
import { RenderableEntity } from "./RenderableEntity";

export class Sprite extends RenderableEntity {

  constructor(
    private resource: ResourceSprite,
    private position: [number, number, number],
    private shader: ResourceShader,
    private rotationZ: number = 0
  ) {
    super();
  }

  draw(
    gl: WebGL2RenderingContext,
    modelMatrix: mat4,
    camera: Camera
  ): void {

    if(!this.shader) return;
    const program = this.shader.getProgram();
    if(!program) return;
    gl.useProgram(program);


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

    // POSITION
    const posLoc = gl.getUniformLocation(program, "uSpritePos");
    if (posLoc)
      gl.uniform3fv(posLoc, this.position);

    const rotLoc = gl.getUniformLocation(program, "uRotationZ");
      if (rotLoc) {
        gl.uniform1f(rotLoc, this.rotationZ);
      }

    // SIZE
    const sizeLoc = gl.getUniformLocation(program, "uSize");
    if (sizeLoc)
      gl.uniform1f(sizeLoc, this.resource.getSize());

    // TEXTURE
    const texLoc = gl.getUniformLocation(program, "uTexture");
    if (texLoc)
      gl.uniform1i(texLoc, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.resource.getTexture());

    this.resource.draw(gl);
  }

  public getResource(): Readonly<Resource> {
    return this.resource;
  }

  public setPosition(pos: [number, number, number]) {
    this.position = pos;
  }

  public setRotationZ(r: number) {
    this.rotationZ = r;
  }
}
