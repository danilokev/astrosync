import { mat4, vec3 } from "gl-matrix";
import { Entity } from "./Entity";

export class Light extends Entity{
    private ambient: vec3 = vec3.fromValues(0,0,0);
    private diffuse: vec3 = vec3.fromValues(0.5,0.5,0.5);
    private specular: vec3 = vec3.fromValues(1,1,1);
    private direction: vec3 = vec3.fromValues(0,0,0);
    private shader: WebGLProgram | null = null;

    // Constructor
    public constructor(
        ambient?: vec3,
        diffuse?: vec3,
        specular?: vec3,
        direction?: vec3
    ){
        super();
        
        if (ambient)  vec3.copy(this.ambient, ambient);
        if (diffuse)  vec3.copy(this.diffuse, diffuse);
        if (specular) vec3.copy(this.specular, specular);
        if (direction) vec3.normalize(this.direction, direction);
    }

    // Destructor
    public destructor(): void{

    }

    // Dibujar
    public override draw(gl: WebGL2RenderingContext): void {
        if (!this.shader) return;

        gl.useProgram(this.shader);

        const ambientLoc   = gl.getUniformLocation(this.shader, "light.ambient");
        const diffuseLoc   = gl.getUniformLocation(this.shader, "light.diffuse");
        const specularLoc  = gl.getUniformLocation(this.shader, "light.specular");
        const directionLoc = gl.getUniformLocation(this.shader, "light.direction");

        if (ambientLoc)   gl.uniform3fv(ambientLoc, this.ambient as Float32Array);
        if (diffuseLoc)   gl.uniform3fv(diffuseLoc, this.diffuse as Float32Array);
        if (specularLoc)  gl.uniform3fv(specularLoc, this.specular as Float32Array);
        if (directionLoc) gl.uniform3fv(directionLoc, this.direction as Float32Array);
    }

    // ========================
    // SETTERS
    // ========================
    // Establecer dirección
    setDirection(dir: vec3) {
        vec3.normalize(this.direction, dir);
    }

    // Establecer componente ambient
    setAmbient(color: vec3) {
        vec3.copy(this.ambient, color);
    }

    // Establecer componente diffuse
    setDiffuse(color: vec3) {
        vec3.copy(this.diffuse, color);
    }

    // Establecer componente specular
    setSpecular(color: vec3) {
        vec3.copy(this.specular, color);
    }

    // Establecer shader
    setShader(program: WebGLProgram) {
        this.shader = program;
    }

    // ========================
    // GETTERS
    // ========================
    // Obtener el componente ambient
    public getAmbient(): vec3{
        return vec3.clone(this.ambient);
    }

    // Obtener el componente diffuse
    public getDiffuse(): vec3{
        return vec3.clone(this.diffuse);
    }

    // Obtener el componente specular
    public getSpecular(): vec3{
        return vec3.clone(this.specular);
    }

    // Obtener la dirección
    public getDirection(): vec3{
        return vec3.clone(this.direction);
    }

    // Obtener shader
    getShader() {
        return this.shader;
    }
}