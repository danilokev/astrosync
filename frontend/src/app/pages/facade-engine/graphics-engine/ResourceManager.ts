import { Resource } from "./Resource";

export class ResourceManager {

    private recursos = new Map<string, Resource>();

    constructor(private gl: WebGL2RenderingContext) {}

    async cargar(recurso: Resource): Promise<void> {

        if (this.recursos.has(recurso.nombre)) {
            // console.warn(`Recurso ${recurso.nombre} ya cargado`);
            return;
        }

        await recurso.load(this.gl);
        this.recursos.set(recurso.nombre, recurso);
    }

    obtener<T extends Resource>(nombre: string): T {

        const recurso = this.recursos.get(nombre);

        if (!recurso) {
            throw new Error(`Recurso ${nombre} no encontrado`);
        }

        return recurso as T;
    }

    liberar(nombre: string): void {

        const recurso = this.recursos.get(nombre);
        if (!recurso) return;

        recurso.dispose(this.gl);
        this.recursos.delete(nombre);
    }

    liberarTodo(): void {

        for (const r of this.recursos.values()) {
            r.dispose(this.gl);
        }

        this.recursos.clear();
    }
}