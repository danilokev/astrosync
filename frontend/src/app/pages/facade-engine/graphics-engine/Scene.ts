import { mat4, vec3, quat } from 'gl-matrix';
import { TNode } from './TNode';
import { Camera } from './Camera';
import { Light } from './Light';
import { Entity } from './Entity';
import { PointLight } from './PointLight';
import { Mesh } from './Mesh';
import { FacadeEngineServiceTAG } from '../facade-engine-TAG.service';
import { LineLoop } from './LineLoop';

// Escena (árbol): contiene Mallas, Luces y Cámaras
// Transformaciones: cada nodo va a contener un tipo malla (TMalla), que a su vez tiene matrizes de traslación y de rotación
// Programar de manera que al aplicar cambios a una matriz del padre, se cambian también todos sus hijos, nietos, etc.
export class Scene {
  private root: TNode; // raíz (nodo inicial)
  private nodes: Map<number, TNode> = new Map(); // para búsqueda rápida por id
  private nextId = 1; // para id automático
  private activeCamera: TNode | null = null;
  private activeLight: TNode | null = null;
  private pointLight: PointLight | null = null;
  private sunLightNode: TNode | null = null;
  private LightNode: TNode | null = null;
  //private camera: Camera | null = null;
  //private light: Light | null = null;

  private hideLine = false;
  private hideSaturnoSol = false;

  // Constructor
  public constructor(private serviceTag: FacadeEngineServiceTAG) {
    this.root = new TNode(0);
    this.nodes.set(0, this.root);
    serviceTag.hideLineLoop.subscribe((x) => (this.hideLine = x));
    serviceTag.hideSaturnSol.subscribe((x) => (this.hideSaturnoSol = x));
  }

  public setSunLightNode(node: TNode) {
    this.sunLightNode = node;
  }

  public setLightNode(node: TNode) {
    this.activeLight = node;
  }

  public getLightNode() {
    return this.LightNode;
  }

  public getSunLightNode(): TNode | null {
    return this.sunLightNode;
  }

  public setPointLight(light: PointLight) {
    this.pointLight = light;
  }
  // Añadir nodo
  public addNode(parentId: number = 0, entity?: Entity): TNode {
    // por defecto nodo padre es la raíz
    const parent = this.nodes.get(parentId);
    if (!parent) throw new Error('Parent not found');

    const node = new TNode(this.nextId); // crear nodo
    this.nextId++; // actualizar el contador
    parent.addChild(node); // añadir el nodo en children
    this.nodes.set(node.id, node); // añadir a la tabla de búsqueda rápida

    // Establecer entidad
    if (entity) {
      node.setEntity(entity);

      if (entity instanceof Camera) {
        this.activeCamera = node;
      }

      if (entity instanceof Light) {
        this.activeLight = node;
      }
    }
    return node;
  }

  public *iterateDown(startNode?: TNode): Generator<TNode> {
    const node = startNode ?? this.root;

    yield node;

    for (const child of node.getChildren()) {
      yield* this.iterateDown(child);
    }
  }

  // Recorrido hacia arriba
  public iterateUp(visit: (n: TNode) => void, startNode?: TNode) {
    const node = startNode ?? this.root;

    for (const child of node.getChildren()) {
      this.iterateUp(visit, child);
    }

    visit(node);
  }

  // Obtener la raíz
  public getRoot(): TNode {
    return this.root;
  }

  // Obtener Map de nodos
  public getNodes(): Map<number, TNode> {
    return this.nodes;
  }

  // Destructor
  public destroy(): void {
    // Destruimos el árbol recursivamente desde el root
    this.deleteNode(this.root);

    // Reestablecemos
    this.root = new TNode(0);
    this.nodes.set(0, this.root);
    this.nextId = 1;
  }

  // Eliminar nodo
  public deleteNode(node: TNode): void {

    // Eliminado todos los hijos
    for (const child of [...node.getChildren()]) {
      this.deleteNode(child);
    }

    // Eliminamos del Map
    this.nodes.delete(node.getId());

    // Avisamos al padre
    const parent = node.getParent();
    if (parent) {
      const index = parent.getChildren().indexOf(node);
      if (index !== -1) parent.getChildren().splice(index, 1);
    }

    // Borramos el nodo
    node.destroy();
  }

  // Trasladar
  public translate(node: TNode, vec: vec3): void {
    node.translate(vec);
  }

  // Rotar
  public rotate(node: TNode, vec: vec3): void {
    node.rotate(vec);
  }

  // Escalar
  public scale(node: TNode, vec: vec3): void {
    node.scale(vec);
  }

  // Visualizar la escena
  public draw(gl: WebGL2RenderingContext): void {
    const renderList: TNode[] = [];

    // ==========================================
    // Recolectamos objetos
    // ==========================================
    for (const node of this.iterateDown()) {
      if (!node.isVisible()) continue;

      const entity = node.getEntity();

      if (entity instanceof LineLoop && this.hideLine) {
        node.setVisible(false);
        (entity as any).setVisible?.(false);
      } else if (entity instanceof LineLoop && !this.hideLine) {
        node.setVisible(true);
        (entity as any).setVisible?.(true);
      } else if (
        !this.hideSaturnoSol &&
        entity &&
        (entity as any).material &&
        (entity as any).material.nombre === 'Sol_material'
      ) {
        node.setVisible(false);
        (entity as any).setVisible?.(false);
      } else if (
        this.hideSaturnoSol &&
        entity &&
        (entity as any).material &&
        ((entity as any).material.nombre === 'Saturno_material' ||
          (entity as any).material.nombre === 'Sol_material')
      ) {
        node.setVisible(true);
        (entity as any).setVisible?.(true);
      }

      if (!entity) continue;

      const cameraEntity = this.activeCamera?.getEntity();

      if (cameraEntity instanceof Camera && !cameraEntity.inFrustum(node)) {
        continue;
      }

      renderList.push(node);
    }

    // ==========================================
    // Ordenar por queue
    // ==========================================
    renderList.sort((a, b) => {
      return (a.getQueue() ?? 1000) - (b.getQueue() ?? 1000);
    });

    // ==========================================
    // Render
    // ==========================================
    for (const node of renderList) {
      const entity = node.getEntity();

      let lightNodeToUse: TNode | null = this.activeLight;

      if (entity instanceof Mesh && entity['isSun']) {
        lightNodeToUse = this.sunLightNode;
      }

      if (!lightNodeToUse) continue;

      node.draw(gl, this.activeCamera!, lightNodeToUse, this.pointLight);
    }
  }
  
  // Indicar la cámara activa
  public setActiveCamera(node: TNode): void {
    this.activeCamera = node;
  }

  // Obtener la cámara activa
  public getActiveCamera(): TNode | null {
    return this.activeCamera;
  }

  // Indicar la luz activa
  public setActiveLight(node: TNode): void {
    this.activeLight = node;
  }

  // Obtener  la cámara activa
  public getActiveLight(): TNode | null {
    return this.activeLight;
  }
}
