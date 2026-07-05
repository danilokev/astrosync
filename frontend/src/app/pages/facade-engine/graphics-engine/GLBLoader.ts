import { WebIO } from '@gltf-transform/core';
import {
    KHRMaterialsTransmission,
    KHRMaterialsClearcoat,
    KHRMaterialsIOR,
    KHRMaterialsSpecular,
    KHRTextureTransform
} from '@gltf-transform/extensions';
import { flatten } from '@gltf-transform/functions';
import { MaterialData } from './MaterialData';


export async function parseGLB(url: string) {
    const io = new WebIO().registerExtensions([
        KHRMaterialsTransmission,
        KHRMaterialsClearcoat,
        KHRMaterialsIOR,
        KHRMaterialsSpecular,
        KHRTextureTransform
    ]);
    const document = await io.read(url);

    // await document.transform(flatten());

    const root = document.getRoot();

    const meshesData: any[] = [];
    const imagesData: any[] = [];

    // TEXTURES
    for (const texture of root.listTextures()) {

        const image = texture.getImage();

        if (image) {
            imagesData.push({
                name: texture.getName() || 'texture',
                image
            });
        }
    }

    // MESHES
    for (const mesh of root.listMeshes()) {

        for (const primitive of mesh.listPrimitives()) {

            const positionAttr = primitive.getAttribute('POSITION');
            const normalAttr = primitive.getAttribute('NORMAL');
            const uvAttr = primitive.getAttribute('TEXCOORD_0');
            const indices = primitive.getIndices();

            const material = primitive.getMaterial();

            let materialData: MaterialData | null = null;

            let textureIndex: number | undefined;

            if (material) {
                const tex = material.getBaseColorTexture();
                if (tex) textureIndex = root.listTextures().indexOf(tex);

                // Obtenemos otros datos del material
                const baseColor = material.getBaseColorFactor(); // [r,g,b,a]
                const emissive = material.getEmissiveFactor();

                const metallic = material.getMetallicFactor();
                const roughness = material.getRoughnessFactor();

                materialData = {
                    shaderName: material.getName() || 'material',

                    // Base
                    albedo: baseColor
                        ? [baseColor[0], baseColor[1], baseColor[2]]
                        : undefined,

                    opacity: baseColor?.[3],
                    
                    // Emission
                    emissive: [
                        emissive[0],
                        emissive[1],
                        emissive[2]
                    ],

                    // Lighting
                    specular: metallic !== undefined
                        ? [metallic, metallic, metallic]
                        : undefined,

                    shininess: roughness !== undefined
                        ? (1 - roughness) * 100
                        : undefined
                };
            }

            meshesData.push({
                name: mesh.getName() || 'mesh',
                positions: positionAttr?.getArray(),
                normals: normalAttr?.getArray(),
                uvs: uvAttr?.getArray(),
                indices: indices?.getArray(),
                textureIndex,
                material: materialData
            });
        }
    }

    return {
        meshes: meshesData,
        images: imagesData
    };
}