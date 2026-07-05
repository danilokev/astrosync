import { Resource } from "./Resource";

export class ResourceShader extends Resource {
  private program!: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation>();

  constructor(nombre: string, private vs: string, private fs: string) {
    super(nombre);
  }

  async load(gl: WebGL2RenderingContext): Promise<void> {

    const vShader = this.compile(gl, gl.VERTEX_SHADER, this.vs);
    const fShader = this.compile(gl, gl.FRAGMENT_SHADER, this.fs);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);

    this.cargado = true;
  }

  getProgram() {
    return this.program;
  }

  dispose(gl: WebGL2RenderingContext): void {
    gl.deleteProgram(this.program);
  }

  private compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  }

  getUniform(gl: WebGL2RenderingContext, name: string) {
    if (!this.uniforms.has(name)) {
      const uniform = gl.getUniformLocation(this.program, name)
      if(uniform){
        this.uniforms.set(
          name,
          uniform
        );
      }
    }
    return this.uniforms.get(name);
  }

  public override computeBoundingSphere(): void{

  }
}