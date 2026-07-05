import { vec3 } from "gl-matrix";
import { Entity } from "./Entity";

export class PointLight extends Entity {
    private ambient: vec3 = vec3.fromValues(0, 0, 0);
    private diffuse: vec3 = vec3.fromValues(0.5, 0.5, 0.5);
    private specular: vec3 = vec3.fromValues(1, 1, 1);
    private position: vec3 = vec3.fromValues(0, 0, 0);

    // Atenuación
    private constant: number = 1.0;
    private linear: number = 0.09;
    private quadratic: number = 0.032;

    private shader: WebGLProgram | null = null;

    constructor(
        ambient?: vec3,
        diffuse?: vec3,
        specular?: vec3,
        position?: vec3
    ) {
        super();

        if (ambient) vec3.copy(this.ambient, ambient);
        if (diffuse) vec3.copy(this.diffuse, diffuse);
        if (specular) vec3.copy(this.specular, specular);
        if (position) vec3.copy(this.position, position);
    }

    public override draw(gl: WebGL2RenderingContext): void {
        if (!this.shader) return;

        gl.useProgram(this.shader);

        const ambientLoc   = gl.getUniformLocation(this.shader, "light.ambient");
        const diffuseLoc   = gl.getUniformLocation(this.shader, "light.diffuse");
        const specularLoc  = gl.getUniformLocation(this.shader, "light.specular");
        const positionLoc  = gl.getUniformLocation(this.shader, "light.position");

        const constantLoc  = gl.getUniformLocation(this.shader, "light.constant");
        const linearLoc    = gl.getUniformLocation(this.shader, "light.linear");
        const quadraticLoc = gl.getUniformLocation(this.shader, "light.quadratic");

        if (ambientLoc)   gl.uniform3fv(ambientLoc, this.ambient as Float32Array);
        if (diffuseLoc)   gl.uniform3fv(diffuseLoc, this.diffuse as Float32Array);
        if (specularLoc)  gl.uniform3fv(specularLoc, this.specular as Float32Array);
        if (positionLoc)  gl.uniform3fv(positionLoc, this.position as Float32Array);

        if (constantLoc)  gl.uniform1f(constantLoc, this.constant);
        if (linearLoc)    gl.uniform1f(linearLoc, this.linear);
        if (quadraticLoc) gl.uniform1f(quadraticLoc, this.quadratic);
    }

    // ========================
    // SETTERS
    // ========================

    setPosition(pos: vec3) {
        vec3.copy(this.position, pos);
    }

    setAmbient(color: vec3) {
        vec3.copy(this.ambient, color);
    }

    setDiffuse(color: vec3) {
        vec3.copy(this.diffuse, color);
    }

    setSpecular(color: vec3) {
        vec3.copy(this.specular, color);
    }

    setAttenuation(constant: number, linear: number, quadratic: number) {
        this.constant = constant;
        this.linear = linear;
        this.quadratic = quadratic;
    }

    setShader(program: WebGLProgram) {
        this.shader = program;
    }

    // ========================
    // GETTERS
    // ========================

    getPosition(): vec3 {
        return vec3.clone(this.position);
    }

    getAmbient(): vec3 {
        return vec3.clone(this.ambient);
    }

    getDiffuse(): vec3 {
        return vec3.clone(this.diffuse);
    }

    getSpecular(): vec3 {
        return vec3.clone(this.specular);
    }

    getShader() {
        return this.shader;
    }
}