import { vertexShaderSrc, fragmentShaderSrc } from '../graphics/shaders';
import { cubeVertices } from '../graphics/cube';
import { mat4, vec3 } from 'gl-matrix';


export class Engine {
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private vao!: WebGLVertexArrayObject;
  private uMVP!: WebGLUniformLocation;

  // Rotación automática
  private angle = 0;

  // Rotación con ratón
  private yaw = 0;   // horizontal
  private pitch = 0; // vertical
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl2')!;
    if (!this.gl) throw new Error('WebGL2 no soportado');

    this.canvas.width = canvas.clientWidth || 800;
    this.canvas.height = canvas.clientHeight || 600;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.CULL_FACE);

    this.program = this.createProgram();
    this.uMVP = this.gl.getUniformLocation(this.program, 'uMVP')!;

    this.vao = this.createCube();

    this.addMouseEvents();
  }

  start() {
    const loop = () => {
      this.angle += 0.01; // rotación automática opcional
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  private render() {
    const gl = this.gl;
    gl.clearColor(0.2,0.2,0.2,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Modelo
    const model = mat4.create();
    mat4.rotateY(model, model, this.angle);
    mat4.scale(model, model, [2,2,2]);

    // Cámara (orbital)
    const radius = 6;
    const camX = radius * Math.cos(this.pitch) * Math.sin(this.yaw);
    const camY = radius * Math.sin(this.pitch);
    const camZ = radius * Math.cos(this.pitch) * Math.cos(this.yaw);
    const eye = vec3.fromValues(camX, camY, camZ);
    const center = vec3.fromValues(0,0,0);
    const up = vec3.fromValues(0,1,0);

    const view = mat4.create();
    mat4.lookAt(view, eye, center, up);

    // Proyección
    const proj = mat4.create();
    mat4.perspective(proj, Math.PI/3, this.canvas.width/this.canvas.height, 0.1, 100);

    // MVP
    const mvp = mat4.create();
    mat4.multiply(mvp, view, model);
    mat4.multiply(mvp, proj, mvp);

    gl.uniformMatrix4fv(this.uMVP,false,mvp as Float32List);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES,0,36);
  }

  private createCube(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    const vbo = gl.createBuffer()!;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);

    return vao;
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;
    const vs = this.compile(vertexShaderSrc, gl.VERTEX_SHADER);
    const fs = this.compile(fragmentShaderSrc, gl.FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
      console.error('Error linkando programa:', gl.getProgramInfoLog(program));

    return program;
  }

  private compile(src:string,type:number):WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader,src);
    this.gl.compileShader(shader);
    if(!this.gl.getShaderParameter(shader,this.gl.COMPILE_STATUS))
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
    return shader;
  }

  // ------------------------------
  // Manejo del ratón
  // ------------------------------
  private addMouseEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    this.canvas.addEventListener('mouseup', () => this.dragging = false);
    this.canvas.addEventListener('mouseleave', () => this.dragging = false);
    this.canvas.addEventListener('mousemove', (e) => {
      if(!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.yaw   += dx * 0.01;
      this.pitch += dy * 0.01;

      // limitar pitch para no voltear cámara
      const limit = Math.PI/2 - 0.01;
      if(this.pitch > limit) this.pitch = limit;
      if(this.pitch < -limit) this.pitch = -limit;
    });
  }
}
