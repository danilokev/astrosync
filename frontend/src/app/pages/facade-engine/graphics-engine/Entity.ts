import { mat4, vec3 } from "gl-matrix";
import { Camera } from "./Camera";
import { Light } from "./Light";
import { PointLight } from "./PointLight";
import { Resource } from "./Resource";

export abstract class Entity{
    public abstract draw(gl: WebGL2RenderingContext, mt: mat4, camera?: Camera, light?: Light, pointLight?: PointLight): void;
}
