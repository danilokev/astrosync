import { Scene } from "./Scene";
import { TNode } from "./TNode";
import { Entity } from "./Entity";
import { Mesh } from "./Mesh";
import { Camera } from "./Camera";
import { Light } from "./Light";
import { ResourceManager } from "./ResourceManager";
import { ResourceMesh } from "./ResourceMesh";
import { ResourceSprite } from "./ResourceSprite";
import { ResourceShader } from "./ResourceShader";
import { ResourceLineLoop } from "./ResourceLineLoop";
import { LineLoop } from "./LineLoop";
import { ResourcePoints } from "./ResourcePoints";
import { Points } from "./Points";
import { parseGLB } from "./GLBLoader";
import { vec3 } from "gl-matrix";
import { PointLight } from "./PointLight";
import { ResourceLineSegment } from "./ResourceLineSegment";
import { LineSegment } from "./LineSegment";
import { ResourceMaterial } from "./ResourceMaterial";
import { FacadeEngineServiceTAG } from "../facade-engine-TAG.service";

export class Motor {
    private scene: Scene;
    private light: Light;
    private sunlight: Light;
    private pointLight: PointLight
    private camera: Camera;
    private resourceManager: ResourceManager;

    constructor(private gl: WebGL2RenderingContext, serviceTag: FacadeEngineServiceTAG) {
        // Creamos la escena
        this.scene = new Scene(serviceTag);

        // Creamos resource manager
        this.resourceManager = new ResourceManager(gl);

        // Creamos la luz
        this.light = new Light(
            vec3.fromValues(0.3,0.3,0.3),
            vec3.fromValues(0.7,0.7,0.7),
            vec3.fromValues(0.3,0.3,0.3),
            vec3.fromValues(-1,-1,-1)
        );

        this.sunlight = new Light(
            vec3.fromValues(0.3,0.3,0.3),
            vec3.fromValues(0.7,0.7,0.7),
            vec3.fromValues(0.3,0.3,0.3),
            vec3.fromValues(1, 0.5, -2)
        );


        this.pointLight = new PointLight(
            vec3.fromValues(0.05, 0.05, 0.05), // ambient
            vec3.fromValues(1.5, 1.5, 1.2),    // diffuse
            vec3.fromValues(1.0, 1.0, 0.9),    // specular
            vec3.fromValues(0, 0, 0)
        );

        // Atenuación tipo sol
        this.pointLight.setAttenuation(1.0, 0.0001, 0.00001);
        this.scene.setPointLight(this.pointLight);

        let lightNode = this.scene.addNode(0, this.light); // Añadimos el nodo para la luz
        this.scene.setLightNode(lightNode); // <-- crucial
        //lightNode.setEntity(this.light); // Indicamos la entidad

        let sunNode = this.scene.addNode(0, this.sunlight);
        this.scene.setSunLightNode(sunNode); // <-- crucial
        this.scene.setActiveLight(lightNode);


        // Creamos la cámara
        this.camera = new Camera();
        let cameraNode = this.scene.addNode(0, this.camera); // Añadimos el nodo para la cámara
        //cameraNode.setEntity(this.camera);  // Indicamos la entidad
    }

    public getPointLight(): PointLight {
        return this.pointLight;
    }

    // =========================
    // ROOT
    // =========================

    public getRoot(): TNode {
        return this.scene.getRoot();
    }

    // =========================
    // SHADER
    // =========================

    public async crearShader(
        nombre: string,
        vs: string,
        fs: string
    ): Promise<ResourceShader> {

        const shader = new ResourceShader(nombre, vs, fs);

        await this.resourceManager.cargar(shader);

        return shader;
    }

    // =========================
    // MATERIAL
    // =========================

    public async crearMaterial(
        nombre: string,
        path: string,
        // shader: ResourceShader
    ): Promise<ResourceMaterial> {

        const material = new ResourceMaterial(nombre, path, /*shader*/);

        await this.resourceManager.cargar(material);

        return material;
    }

    // =========================
    // NODO
    // =========================

    public crearNodo(
        padre: TNode,
        entidad: Entity | null,
        traslacion: vec3,
        escalado: vec3,
        rotacion: vec3
    ): TNode {

        const nodo = this.scene.addNode(padre.getId());

        if (entidad) nodo.setEntity(entidad);

        nodo.setTranslation(traslacion);
        nodo.setScale(escalado);
        nodo.setRotation(rotacion);

        return nodo;
    }

    // =========================
    // TEXTURA
    // =========================

    public async crearTextura(bytes: Uint8Array): Promise<WebGLTexture> {

        const blob = new Blob([bytes]);
        const bitmap = await createImageBitmap(blob);

        const tex = this.gl.createTexture()!;

        this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            bitmap
        );

        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        return tex;
    }

    // =========================
    // MALLA
    // =========================

    public async crearMalla(
        nombre: string,
        vertices: Float32Array,
        indices: Uint16Array | Uint32Array,
        shader: ResourceShader,
        material: ResourceMaterial,
        uvs?: Float32Array,
        normals?: Float32Array,
        texture?: WebGLTexture,
    ): Promise<Mesh> {

        const recurso = new ResourceMesh(
            nombre,
            vertices,
            indices,
            uvs,
            normals
        );

        await this.resourceManager.cargar(recurso);

        const recursoGPU =
            this.resourceManager.obtener<ResourceMesh>(nombre);

        const mesh = new Mesh(recursoGPU, shader, material, texture);



        return mesh;
    }

    // =========================
    // CARGAR GLB
    // =========================

    /*public async cargarGLB(
        nombre: string,
        url: string,
        shader: ResourceShader,
        padre: TNode
    ): Promise<TNode> {

        const glb = await parseGLB(url);

        if (!glb.meshes.length)
            throw new Error("GLB sin meshes");

        const meshData = glb.meshes[0];

        const vertices = new Float32Array(meshData.positions);
        this.normalizeVertices(vertices);

        const indices =
            meshData.indices instanceof Uint32Array
                ? new Uint32Array(meshData.indices)
                : new Uint16Array(meshData.indices);

        const uvs = meshData.uvs
            ? new Float32Array(meshData.uvs)
            : undefined;

        const normals = meshData.normals
            ? new Float32Array(meshData.normals)
            : undefined;

        // ===== TEXTURA =====

        let texture: WebGLTexture | undefined;

        if (glb.images.length) {
            texture = await this.crearTextura(
                glb.images[0].image
            );
        }

        // ===== MESH =====

        const mesh = await this.crearMalla(
            nombre,
            vertices,
            indices,
            shader,
            uvs,
            normals,
            texture
        );

        // ===== NODE =====

        const nodo = this.crearNodo(
            padre,
            mesh,
            [0,0,0],
            [1,1,1],
            [0,0,0]
        );

        return nodo;
    }*/
    public async cargarGLB(
        nombre: string,
        url: string,
        shader: ResourceShader,
        material: ResourceMaterial,
        padre: TNode
    ): Promise<TNode> {

        const glb = await parseGLB(url);

        if (!glb.meshes.length)
            throw new Error("GLB sin meshes");

        // Cargamos textra si hay
        /*let texturePadre: WebGLTexture | undefined;
        if (glb.images.length) {
            texturePadre = await this.crearTextura(glb.images[0].image);
        }*/
        const textures: WebGLTexture[] = [];
        for (const img of glb.images) {
            textures.push(await this.crearTextura(img.image));
        }

        // Cogemos el primero
        const firstMeshData = glb.meshes[0];

        const bounds = this.computeModelBounds(glb.meshes);

        const firstVertices = new Float32Array(firstMeshData.positions);
        const firstNormals = firstMeshData.normals ? new Float32Array(firstMeshData.normals) : undefined;
        //this.normalizeVertices(firstVertices);
        this.normalizeVertices(
            firstVertices,
            firstNormals,
            bounds.centerX,
            bounds.centerY,
            bounds.centerZ,
            bounds.scale
        );

        const firstIndices =
            firstMeshData.indices instanceof Uint32Array
                ? new Uint32Array(firstMeshData.indices)
                : new Uint16Array(firstMeshData.indices);

        const firstUVs = firstMeshData.uvs ? new Float32Array(firstMeshData.uvs) : undefined;

        const firstMeshTexture =
            firstMeshData.textureIndex !== undefined
                ? textures[firstMeshData.textureIndex]
                : undefined;

        // Actualizamos los datos del material
        material.setData(glb.meshes[0].material);

        const firstMesh = await this.crearMalla(
            nombre + "_0",
            firstVertices,
            firstIndices,
            shader,
            material,
            firstUVs,
            firstNormals,
            firstMeshTexture
        );
        if(nombre === 'Sun'){
            firstMesh.setAsSun(true);
        }else{
            firstMesh.setAsSun(false);
        }

        // Creamos el nodo padre con la primera malla
        const nodoPadre = this.crearNodo(
            padre,
            firstMesh,
            [0, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        );
        // Añadimos otras mallas como hijos
        for (let i = 1; i < glb.meshes.length; i++) {
            const meshData = glb.meshes[i];

            const vertices = new Float32Array(meshData.positions);
            const normals = meshData.normals ? new Float32Array(meshData.normals) : undefined;

            //this.normalizeVertices(vertices);
            this.normalizeVertices(
                vertices,
                normals,
                bounds.centerX,
                bounds.centerY,
                bounds.centerZ,
                bounds.scale
            );

            const indices =
                meshData.indices instanceof Uint32Array
                    ? new Uint32Array(meshData.indices)
                    : new Uint16Array(meshData.indices);

            const uvs = meshData.uvs ? new Float32Array(meshData.uvs) : undefined;

            const meshTexture =
            meshData.textureIndex !== undefined
                ? textures[meshData.textureIndex]
                : undefined;

            const mesh = await this.crearMalla(
                nombre + "_" + i,
                vertices,
                indices,
                shader,
                material,
                uvs,
                normals,
                meshTexture
            );

            // Vinculamos al nodo padre
            this.crearNodo(
                nodoPadre,
                mesh,
                [0, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            );
        }

        return nodoPadre;
    }

    // Calcular bounding box del modelo para el posicionamiento local correcto
    public computeModelBounds(meshes: any[]) {

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const mesh of meshes) {

            const vertices = mesh.positions;

            for (let i = 0; i < vertices.length; i += 3) {

                const x = vertices[i];
                const y = vertices[i + 1];
                const z = vertices[i + 2];

                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (z < minZ) minZ = z;

                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                if (z > maxZ) maxZ = z;

            }
        }

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;

        const maxDim = Math.max(sizeX, sizeY, sizeZ);

        const centerX = (minX + maxX) * 0.5;
        const centerY = (minY + maxY) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;

        const scale = 1 / maxDim;

        return { centerX, centerY, centerZ, scale };
    }

    /*public normalizeVertices(
        vertices: Float32Array,
        centerX: number,
        centerY: number,
        centerZ: number,
        scale: number
    ): void {

        for (let i = 0; i < vertices.length; i += 3) {

            vertices[i]     = (vertices[i]     - centerX) * scale;
            vertices[i + 1] = (vertices[i + 1] - centerY) * scale;
            vertices[i + 2] = (vertices[i + 2] - centerZ) * scale;

        }
    }*/
    public normalizeVertices(
        vertices: Float32Array,
        normals: Float32Array | undefined,
        centerX: number,
        centerY: number,
        centerZ: number,
        scale: number
    ): void {

        const angleY = 0;
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);

        for (let i = 0; i < vertices.length; i += 3) {
            let x = vertices[i] - centerX;
            let y = vertices[i + 1] - centerY;
            let z = vertices[i + 2] - centerZ;

            let vx = x;
            let vy = z;
            let vz = -y;

            const x2 = vx * cosY + vz * sinY;
            const z2 = -vx * sinY + vz * cosY;

            vertices[i]     = x2 * scale;
            vertices[i + 1] = vy * scale;
            vertices[i + 2] = z2 * scale;
        }

        if (normals) {
            for (let i = 0; i < normals.length; i += 3) {
                let nx = normals[i];
                let ny = normals[i + 1];
                let nz = normals[i + 2];

                let nX = nx;
                let nY = nz;
                let nZ = -ny;

                const nx2 = nX * cosY + nZ * sinY;
                const nz2 = -nX * sinY + nZ * cosY;

                normals[i]     = nx2;
                normals[i + 1] = nY;
                normals[i + 2] = nz2;
            }
        }
    }

    // =========================
    // DIBUJAR
    // =========================

    public dibujar(): void {

        this.gl.clear(
            this.gl.COLOR_BUFFER_BIT |
            this.gl.DEPTH_BUFFER_BIT
        );

        this.scene.draw(this.gl);
        // this.light.draw(this.gl, program);
    }

    public getScene(): Readonly<Scene> {
        return this.scene;
    }

    public async crearPoints(
        nombre: string,
        positions: Float32Array,
        colors: Float32Array,
        sizes: Float32Array,
        shader: ResourceShader
        ): Promise<Points> {

        const resource = new ResourcePoints(
            nombre,
            positions,
            colors,
            sizes
        );

        await this.resourceManager.cargar(resource);

        const res = this.resourceManager.obtener<ResourcePoints>(nombre);

        return new Points(res, shader);
    }

    // =========================
    // LINE LOOP
    // =========================
    public async crearLineLoop(
        nombre: string,
        vertices: Float32Array,
        shader: ResourceShader
    ): Promise<LineLoop> {

        const resource = new ResourceLineLoop(nombre, vertices);

        await this.resourceManager.cargar(resource);

        const res = this.resourceManager.obtener<ResourceLineLoop>(nombre);

        return new LineLoop(res, shader);
    }

    public async crearLineSegments(
        nombre: string,
        vertices: Float32Array,
        shader: ResourceShader
    ): Promise<LineSegment> {

        const resource = new ResourceLineSegment(nombre, vertices);

        await this.resourceManager.cargar(resource);

        const res = this.resourceManager.obtener<ResourceLineSegment>(nombre);

        return new LineSegment(res, shader);
    }

    public async crearSprite(
    nombre: string,
    texture: WebGLTexture,
    size: number
    ): Promise<ResourceSprite> {
        const sprite = new ResourceSprite(nombre, texture, size);
        await this.resourceManager.cargar(sprite);
        return this.resourceManager.obtener<ResourceSprite>(nombre);
    }

    public async cargarTexturaDesdeURL(url: string): Promise<WebGLTexture> {

    const img = new Image();
    img.src = url;

    await img.decode();

    const tex = this.gl.createTexture()!;

    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

    this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        img
    );

    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    return tex;
    }

    // Devolver luz
    public getLight(): Readonly<Light>{
        return this.light;
    }

    // Devolver la cámara
    public getCamera(): Readonly<Camera>{
        return this.camera;
    }

    public liberarTodo(): void {
      this.resourceManager.liberarTodo();
    }

    public getResourceManager(): ResourceManager{
      return this.resourceManager;
    }
}
