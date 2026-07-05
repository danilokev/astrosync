import { Resource } from "./Resource";
import { mat4, vec3 } from "gl-matrix";
import { ResourceShader } from "./ResourceShader";
import { ResourceTexture } from "./ResourceTexture";
import { MaterialData } from "./MaterialData";


type UniformValue =
  | { type: "1f"; value: number }
  | { type: "3fv"; value: Float32Array }
  | { type: "mat4"; value: Float32Array };

export class ResourceMaterial extends Resource{
    private source: string; // fichero a leer
    private shader: ResourceShader | null = null; // shader a usar
    private albedoTexture: ResourceTexture | null = null; // Textura que indica color
    private normalTexture: ResourceTexture | null = null; // Textura de relieve
    private materialData: MaterialData | null = null;
    private additionalUniforms: Record<string, UniformValue> = {};


    /* private shaderName: string = "";

    //*************************
    // Parámetros del material
    //*************************
    // base
    private albedo: vec3 = vec3.fromValues(1.0, 1.0, 1.0); // Color básico: por defecto blanco
    
    private albedoTextureName: string = "";

    // lighting (Phong)
    private specular: vec3 = vec3.fromValues(1.0, 1.0, 1.0); // Color del reflejo especular: por defecto blanco (material no metálico)
    private shininess: number = 32.0; // Anchura del brillo especular: pequeño -> superficie pulida, grande -> superficie rugosa

    // surface
    private opacity: number = 1; // Transparencia: por defecto totalmente opaco 
    private alphaCutoff: number = 0; // Eliminar píxeles transparentes

    // maps

    private normalTextureName: string = "";

    //*************************
    // Render
    //*************************
    private transparent: boolean = false; // flag para determinar transparencia
    private depthWrite: boolean = true; // 
    private cull: boolean = true; // encender/apagar backface culling
    private blending: boolean = true; // mezclar (importante para materiales transparentes)*/
 

    // Constructor
    constructor(nombre: string, path: string, /*shader: ResourceShader*/) {
        super(nombre);

        this.source = path;
        // this.shader = shader;
    }

    // Cargar material
    public async load(gl: WebGL2RenderingContext): Promise<void> {
        // Leer JSON del disco
        const response = await fetch(this.source);
        const data = await response.json();

        // Rellenamos los campos
        this.materialData = {
            shaderName: data.shader,
            albedo: data.params.albedo,
            // albedoTextureName: data.textures.albedo,
            specular: data.params.specular,
            shininess: data.params.shininess,
            opacity: data.params.opacity,
            emissive: data.params.emissive,
            alphaCutoff: data.params.alphaCutoff,
            // normalTextureName: data.textures.normal,
            transparent: data.render_state.transparent,
            depthWrite: data.render_state.depthWrite,
            cull: data.render_state.cull,
            blending: data.render_state.blending,
        }

        this.cargado = true;
    }

    // Visualizar
    public draw(gl: WebGL2RenderingContext, program: WebGLProgram): void {
        if (!this.cargado) return;

        // =====================================================
        // CONFIGURACIÓN DE RENDER SEGÚN MATERIAL
        // =====================================================

        // ---- Transparencia
        if (this.materialData?.transparent) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.disable(gl.BLEND);
        }

        // ---- Escritura en depth buffer
        if (this.materialData?.depthWrite !== undefined) {
            gl.depthMask(this.materialData.depthWrite);
        }

        // ---- Culling
        if (this.materialData?.cull) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        } else {
            gl.disable(gl.CULL_FACE);
        }

        // Datos del comportamiento del material
        if(this.materialData){
            gl.uniform3fv(
                gl.getUniformLocation(program, "material.albedo"),
                this.materialData.albedo ?? [1,1,1]
            );
            gl.uniform3fv(
                gl.getUniformLocation(program, "material.specular"),
                this.materialData.specular ?? [1,1,1]
            );

            gl.uniform1f(
                gl.getUniformLocation(program, "material.shininess"),
                this.materialData.shininess ?? 32
            );

            gl.uniform3fv(
                gl.getUniformLocation(program, "material.emissive"),
                this.materialData.emissive ?? [0,0,0]
            );

            gl.uniform1f(
                gl.getUniformLocation(program, "material.opacity"),
                this.materialData.opacity ?? 1.0
            );
        }
    }

    // Destruir
    public dispose(gl: WebGL2RenderingContext): void {
        if (this.shader) {
            this.shader.dispose(gl);
            this.shader = null;
        }

        this.materialData = null;

        /*this.uniforms = {};
        this.resourceData = null;*/

        this.cargado = false;
    }

    /*public setTextures(albedo: ResourceTexture | null, normal: ResourceTexture | null): void{
        if (albedo) this.albedoTexture = albedo;
        if (normal) this.normalTexture = normal;
    }

    public getShaderName(): string | undefined{
        return this.materialData?.shaderName;
    }

    public getAlbedoTextureName(): string | undefined{
        return this.materialData?.albedoTextureName;
    }

    public getNormalTextureName(): string | undefined{
        return this.materialData?.normalTextureName;
    }

    // Establecer uniforms adicionales
    public setAdditionalUniform(name: string, uniform: UniformValue): void {
        this.additionalUniforms[name] = uniform;
    }

    // Obtener uniforms adicionales
    public getAdditionalUniform(): Readonly<Record<string, UniformValue>>{
        return this.additionalUniforms;
    }*/

    // Modificar parámetros del material
    public setData(data: Partial<MaterialData>): void {
        if (!this.materialData) {
            this.materialData = { ...data } as MaterialData;
            return;
        }

        for (const key in data) {
            if (key in this.materialData) {
                (this.materialData as any)[key] = data[key as keyof MaterialData];
            }
        }
    }

    // Obtener parámetros del material
    public getData(): MaterialData | null{
        return this.materialData;
    }

    // Crear instancias del mismo material
    public clone(name: string): ResourceMaterial {
        const mat = new ResourceMaterial(name, this.source);

        // unique material params
        mat.materialData = structuredClone(this.materialData);
        mat.cargado = true;

        return mat;
    }

    // Vacío para el material
    public override computeBoundingSphere(): void {}
}