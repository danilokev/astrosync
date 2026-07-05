import { Resource } from "./Resource";
import { ResourceMesh } from "./ResourceMesh";
import { parseGLB } from "./GLBLoader";

export class ResourceModelGLB extends Resource {

    private meshes: ResourceMesh[] = [];

    constructor(nombre: string, private url: string){
        super(nombre);
    }

    async load(gl: WebGL2RenderingContext): Promise<void>{

        const gltf = await parseGLB(this.url);

        for (const primitive of gltf.meshes){

            const malla = new ResourceMesh(
                primitive.name,
                new Float32Array(primitive.positions),
                primitive.indices instanceof Uint32Array
                    ? new Uint32Array(primitive.indices)
                    : new Uint16Array(primitive.indices)
            );

            await malla.load(gl);
            this.meshes.push(malla);
        }

        this.cargado = true;

        // Calculamos boundingSphere
        this.computeBoundingSphere();
    }

    getMeshes(): ResourceMesh[] {
        return this.meshes;
    }

    dispose(gl: WebGL2RenderingContext): void {
        for (const mesh of this.meshes){
            mesh.dispose(gl);
        }
        this.meshes = [];
        this.cargado = false;
    }

    public override computeBoundingSphere(): void{
        for (const mesh of this.meshes) {
            mesh.computeBoundingSphere();
        }
    }
}