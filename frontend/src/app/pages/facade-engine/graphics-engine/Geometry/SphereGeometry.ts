// Clase esfera con textura
/*export type MeshData = {
    vertices: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint16Array;
};*/

export class SphereGeometry{
    private radius: number;
    private widthSegments: number;
    private heightSegments: number;

    private vertices: Float32Array;
    private normals: Float32Array;
    private uvs: Float32Array;
    private indices: Uint16Array;

    // Constructor
    /*constructor(radius = 1, widthSegments = 32, heightSegments = 16){
        // Guardamos los datos de la esfera
        this.radius = radius;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;

        // Generamos datos de la malla
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let lat = 0; lat <= heightSegments; lat++) {
            const theta = lat * Math.PI / heightSegments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= widthSegments; lon++) {
            const phi = lon * 2 * Math.PI / widthSegments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            positions.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
            uvs.push(lon / widthSegments, lat / heightSegments);
            }
        }

        for (let lat = 0; lat < heightSegments; lat++) {
            for (let lon = 0; lon < widthSegments; lon++) {
            const first = lat * (widthSegments + 1) + lon;
            const second = first + widthSegments + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
            }
        }

        this.vertices = new Float32Array(positions);
        this.normals = new Float32Array(normals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);
    }*/

    constructor(
        radius: number = 1,
        widthSegments: number = 32,
        heightSegments: number = 16
    ) {
        this.radius = radius;
        this.widthSegments = Math.max(3, widthSegments);
        this.heightSegments = Math.max(2, heightSegments);

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        // vértices
        for (let lat = 0; lat <= this.heightSegments; lat++) {
            const theta = (lat * Math.PI) / this.heightSegments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= this.widthSegments; lon++) {
                const phi = (lon * 2 * Math.PI) / this.widthSegments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                positions.push(
                    this.radius * x,
                    this.radius * y,
                    this.radius * z
                );

                normals.push(x, y, z);

                uvs.push(
                    lon / this.widthSegments,
                    lat / this.heightSegments
                );
            }
        }

        // Índices
        for (let lat = 0; lat < this.heightSegments; lat++) {
            for (let lon = 0; lon < this.widthSegments; lon++) {
                const first =
                    lat * (this.widthSegments + 1) + lon;

                const second =
                    first + this.widthSegments + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        this.vertices = new Float32Array(positions);
        this.normals = new Float32Array(normals);
        this.uvs = new Float32Array(uvs);
        this.indices = new Uint16Array(indices);
    }

    // Devolver los datos de la esfera
    // Obtener radio
    public getRadius(): Readonly<number>{
        return this.radius;
    }

    // Obtener segmentos horizontales
    public getWidthSegments(): Readonly<number>{
        return this.widthSegments;
    }

    // Obtener segmentos verticales
    public getHeightSegments(): Readonly<number>{
        return this.heightSegments;
    }

    // Obtener vértices
    public getVertices(): Readonly<Float32Array>{
        return this.vertices;
    }

    // Obtener normales
    public getNormals(): Readonly<Float32Array>{
        return this.normals;
    }

    // Obtener UVs
    public getUVs(): Readonly<Float32Array>{
        return this.uvs;
    }

    // Obtener índices
    public getIndices(): Readonly<Uint16Array>{
        return this.indices;
    }
}


/*function createSphere(radius: number, latBands: number, lonBands: number): MeshData {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let lat = 0; lat <= latBands; lat++) {
        const theta = lat * Math.PI / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= lonBands; lon++) {
        const phi = lon * 2 * Math.PI / lonBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        positions.push(radius * x, radius * y, radius * z);
        normals.push(x, y, z);
        uvs.push(lon / lonBands, lat / latBands);
        }
    }

    for (let lat = 0; lat < latBands; lat++) {
        for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
        }
    }

    return {
        vertices: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices),
    };
}*/