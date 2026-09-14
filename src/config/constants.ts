export const TILE_SIZE = 4;
/** Altura de un nivel. Con TILE_SIZE 4, un escalón de un nivel es una grada caminable. */
export const HEIGHT_STEP = 1.6;
export const MAX_STEP_LEVELS = 1;

/**
 * La clave no lleva versión: la versión va dentro del propio guardado, que es lo que
 * SaveManager valida. Subir SAVE_VERSION invalida los guardados anteriores a propósito.
 */
export const SAVE_KEY = 'gg-web-save';
export const SAVE_VERSION = 3;

export const MAX_DPR = 2;
