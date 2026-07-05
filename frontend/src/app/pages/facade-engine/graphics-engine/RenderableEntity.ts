import { Entity } from "./Entity";
import { Resource } from "./Resource";

export abstract class RenderableEntity extends Entity {
  abstract getResource(): Readonly <Resource>;
}