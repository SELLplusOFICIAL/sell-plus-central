import path from "path";

/**
 * Raíz de la Central.
 *
 * La Central puede correr desde otro directorio (p. ej. /tmp/central, zona
 * protegida del entorno) mientras la fuente de verdad —código, base de datos
 * e instaladores— vive en /home/z/my-project. CENTRAL_RAIZ apunta siempre a
 * esa raíz; si no está definida, se usa el directorio de ejecución actual.
 */
export const RAIZ_CENTRAL = process.env.CENTRAL_RAIZ || process.cwd();

/** Carpeta de instaladores publicados (fuente de verdad del proyecto). */
export const UPDATES_DIR = path.join(RAIZ_CENTRAL, "central-files", "updates");

/** Carpeta de archivos de tutoriales. */
export const TUTORIALES_DIR = path.join(RAIZ_CENTRAL, "central-files", "tutoriales");
