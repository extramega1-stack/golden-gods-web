# Atribuciones y licencias

## Arte 3D

Los modelos de personaje de `public/models/` son derivados (podados, sin modificar la malla
ni las texturas) de dos packs de **Kay Lousberg**:

| Pack | Uso en el juego |
|---|---|
| [KayKit Character Pack: Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) | `knight`, `barbarian`, `rogue`, `mage` — los cuatro dioses jugables, los compañeros de party y parte de la población |
| [KayKit Character Pack: Skeletons](https://kaylousberg.itch.io/kaykit-skeletons) | `skeleton-minion`, `skeleton-warrior`, `skeleton-mage` — los enemigos y el jefe |

**Licencia: Creative Commons Zero (CC0 1.0)** — <http://creativecommons.org/publicdomain/zero/1.0/>

El autor indica que el contenido es libre para proyectos personales, educativos y comerciales.
CC0 no exige atribución, pero se incluye aquí por cortesía y para dejar trazable el origen.
Si te sirven los packs, considera apoyar al autor.

La poda de animaciones la hace `scripts/prepare-models.mjs`, que descarga los modelos
originales desde los repositorios públicos del autor y descarta las animaciones que el juego no
usa. Ningún fichero original se redistribuye en este repositorio.

## Tecnología

| Proyecto | Licencia |
|---|---|
| [three.js](https://threejs.org/) | MIT |
| [Vite](https://vitejs.dev/) | MIT |
| [Capacitor](https://capacitorjs.com/) | MIT |
| [TypeScript](https://www.typescriptlang.org/) | Apache-2.0 |
| [gltf-transform](https://gltf-transform.dev/) (solo desarrollo) | MIT |

## Contenido propio

Los nombres, estadísticas, habilidades, objetos, enemigos y balance (`src/data/`) son originales
de este proyecto. No se ha copiado ningún recurso, nombre ni código del mapa de Warcraft III en
el que se inspira conceptualmente.
