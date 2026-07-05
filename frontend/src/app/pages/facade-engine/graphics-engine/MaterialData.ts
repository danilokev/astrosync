import { vec3 } from "gl-matrix";

export type MaterialData = {
    shaderName: string;
    /*************************
     * Base
     **************************/
    albedo?: [number, number, number];
    // albedoTextureName?: string;

    /*************************
     * Lighting (Phong)
     **************************/
    specular?: [number, number, number];
    shininess?: number;
    
    emissive?: [number, number, number]; // Material emisivo

    /*************************
     * Surface
     **************************/
    opacity?: number;
    alphaCutoff?: number;

    /*************************
     * Maps
     **************************/
    // normalTextureName?: string;

    /*************************
     * Render state
     **************************/
    transparent?: boolean;
    depthWrite?: boolean;
    cull?: boolean;
    blending?: boolean;
}