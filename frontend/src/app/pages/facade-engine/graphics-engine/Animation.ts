import { WebGLContext } from "@maptiler/sdk/dist/src/utils/webgl-utils";
import { Mesh } from "./Mesh";
import { ResourceManager } from "./ResourceManager";
import { Camera } from "./Camera";
import { Light } from "./Light";
import { PointLight } from "./PointLight";
import { mat4 } from "gl-matrix";
import { TNode } from "./TNode";


export class Animation {
    // Animation data
    private name: string;
    // private node: TNode;

    private currentFrame: number;
    private totalFrames: number;

    private currentTime: number;
    private duration: number;
    private fps: number;

    private loop: boolean;
    private playing: boolean;

    // Meshes
    private meshes: Mesh[];

    private deltaTime: number = 1;

    constructor(name: string, node: TNode, totalFrames: number, fps: number = 24) {
        this.name = name;

        this.currentFrame = 0;
        this.totalFrames = totalFrames;

        this.currentTime = 0;
        this.duration = totalFrames / fps;
        this.fps = fps;

        this.loop = true;
        this.playing = false;

        this.meshes = [];
    }

    // Destructor
    public destroy(): void {

        this.meshes = [];
    }

    // Control de animación
    public play(): void {

        this.playing = true;
    }

    public pause(): void {

        this.playing = false;
    }

    public stop(): void {

        this.playing = false;
        this.currentFrame = 0;
        this.currentTime = 0;
    }

    // Actualización temporal
    public update(): void {

        if (!this.playing) return;

        this.currentTime += this.deltaTime;

        this.currentFrame = Math.floor(
            this.currentTime * this.fps
        );

        if (this.currentFrame >= this.totalFrames) {

            if (this.loop) {

                this.currentFrame = 0;
                this.currentTime = 0;

            } else {

                this.currentFrame = this.totalFrames - 1;
                this.playing = false;
            }
        }
    }

    // Dibujar
    public draw(gl: WebGL2RenderingContext, mt: mat4, camera?: Camera | null, light?: Light | null, pointLight?: PointLight | null): void {
        if (this.meshes.length === 0) return;

        this.meshes[this.currentFrame].draw(
            gl,
            mt,
            camera,
            light,
            pointLight
        );
    }

    // Mesh actual
    public getCurrentMesh(): Mesh{
        return this.meshes[this.currentFrame];
    }
}