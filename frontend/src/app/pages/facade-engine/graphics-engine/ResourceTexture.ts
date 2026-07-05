import { Resource } from "./Resource";

export class ResourceTexture extends Resource {

  private texture!: WebGLTexture;
  private isSpriteTexture = false;

  constructor(
    nombre: string,
    private source: string | HTMLCanvasElement
  ) {
    super(nombre);
  }

  async load(gl: WebGL2RenderingContext): Promise<void> {

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (typeof this.source === "string") {
      const img = new Image();
      img.src = this.source;
      await img.decode();

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.source
      );
    }

    gl.generateMipmap(gl.TEXTURE_2D);

    this.cargado = true;
  }

  getTexture(): WebGLTexture {
    return this.texture;
  }

  dispose(gl: WebGL2RenderingContext): void {
    gl.deleteTexture(this.texture);
  }

  // Vacío para la textura
  public override computeBoundingSphere(): void{}
}