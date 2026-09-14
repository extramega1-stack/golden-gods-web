# Golden Gods Web

ORPG (Open RPG) **3D** jugable en el navegador, inspirado **conceptualmente** en los mapas ORPG
de Warcraft III (como Golden Gods II): mundo abierto con terreno y desniveles, subir de nivel,
jefes con botín, mejoras de equipo y una capa "MMO local" donde bots simulan otros jugadores.

No contiene ningún recurso, nombre ni código del mapa original: todo el contenido vive en
`src/data/` y es propio.

La versión 2D anterior (Phaser) está congelada en la etiqueta **`v0.1-2d`** por si quieres
comparar o recuperar algo.

## Estado

Completadas las fases 0–7 de la migración a 3D: base Three.js, terreno con alturas y
acantilados, héroe y cámara, combate, progresión y UI, selección de dioses, botín y herrería, y
jefe con fases.

Pendientes: **Fase 8** (bots de party y población simulada), **Fase 9** (persistencia: guardado
local y código de héroe) y **Fase 10** (revalidar PWA y APK).

> Nota: el guardado (`SaveManager`) está implementado y probado, pero todavía **no está conectado
> a la interfaz**: en la versión 3D actual cada partida empieza de cero.

## Requisitos

- Node.js 20+ (probado con Node 24) y npm.
- Un navegador con WebGL.

## Cómo ejecutar

```bash
npm install
npm run dev -- --host
```

`--host` expone el servidor en la red local. Como Termux corre en el propio teléfono, también
puedes abrir directamente `http://localhost:5173` en el navegador del móvil.

Otros comandos:

```bash
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve el build de producción
npm run typecheck  # solo comprobación de tipos
npm test           # tests de lógica (esbuild + Node, sin WebGL)
npm run icons      # regenera los iconos PWA en public/icons/
```

## Controles

| Acción | Teclado / ratón | Táctil |
|---|---|---|
| Elegir dios | teclas 1-4 o clic en la carta | toca la carta |
| Moverse | WASD o flechas | joystick (mitad inferior izquierda) |
| Ataque básico | automático al enemigo más cercano en rango | igual |
| Habilidades Q/E/R | teclas Q, E, R | botones de la barra |
| Talentos | `T` | — |
| Equipo y mochila | `I` | — |
| Herrería (junto al NPC) | `G` | botón que aparece al acercarte |

Cada dios tiene sus propias tres habilidades (área, proyectil, cura, embestida o buff).

## Cómo se juega

Eliges dios, apareces en el **Prado Dorado** y subes por tres subáreas a distinto nivel: el
**Prado**, las **Ruinas de Khar** y la **Cima del Titán**, donde espera el jefe. Matas mobs para
subir de nivel y ganar oro, recoges el botín, mejoras el equipo en la herrería y gastas puntos de
talento. El jefe tiene tres fases y un golpe sísmico que se anuncia con un anillo: si te alejas
del círculo antes de que cierre, lo esquivas.

## Estructura

```
src/
  engine/     motor: renderer, escena, cámara tipo WC3, bucle
  app/        App (estados: menú y partida) y World (una partida en curso)
  world/      alturas, malla del terreno con acantilados, navegación, zona
  entities/   Unit (base), PlayerUnit, EnemyUnit, Projectile3D, Pickup3D, mallas y barras
  systems/    combate, IA, jefe, spawn, progresión, talentos, habilidades, inventario, botín, efectos
  ui/         DOM sobre el canvas: HUD, habilidades, talentos, equipo, menú, joystick
  data/       TODO el contenido y balance (dioses, habilidades, talentos, objetos, enemigos, botín, zonas)
  core/       entrada (teclado y táctil), SaveManager, eventos
tests/        suites de lógica pura (entradas vía esbuild)
scripts/      generación de iconos y ejecución de tests
```

### Cómo funciona el 3D

- **Cámara tipo WC3**: perspectiva con 55° de inclinación y yaw fijo, con seguimiento suavizado y
  sacudida. Las direcciones de entrada se convierten de pantalla a mundo según ese yaw.
- **Terreno**: cada celda es una tapa plana a su altura y, donde hay desnivel, se añade un faldón
  vertical; eso es lo que se lee como acantilado. Todo el terreno es **una sola geometría**
  (2552 triángulos), pensado para el WebView de Android.
- **Navegación**: rejilla con **regla de escalón**; no se salva un desnivel de más de un nivel.
- **Entidades agnósticas del motor**: `Unit` guarda posición, stats y vida, y expone un handle de
  Three.js; la lógica no depende del render.
- **UI en DOM** sobre el canvas, en vez de UI dibujada en el motor.

### Personalizar contenido

Todo el balance es dato, no código:

- `data/gods.ts` — los 4 dioses (stats, crecimiento y habilidades).
- `data/skills.ts` — habilidades y sus efectos (`aoe`, `projectile`, `heal`, `dash`, `buff`).
- `data/talents.ts` — árbol de talentos.
- `data/items.ts` / `data/lootTables.ts` — equipo y tablas de botín.
- `data/enemies.ts` — enemigos y jefe (fases y golpe sísmico).
- `data/zones.ts` — mapa, alturas, subáreas, apariciones y posición de la herrería.
- `config/constants.ts` — tamaño de celda, altura por nivel, escalón máximo.

## APK de Android

El workflow `.github/workflows/android-apk.yml` empaqueta el juego con **Capacitor** y compila
un APK en cada push a `main` (o a mano desde *Actions → Android APK → Run workflow*). Antes de
compilar pasa `npm test`.

- El APK se publica en **Releases** con la etiqueta `android-latest`, y también como artefacto
  de la ejecución.
- Es un **APK de depuración**, firmado con la clave de desarrollo: sirve para instalarlo en tu
  teléfono, no para publicar en Play Store.
- En el móvil: descarga el APK y ábrelo; tendrás que permitir "instalar apps de fuentes
  desconocidas".

## Tests

`npm test` compila las entradas con esbuild y ejecuta las suites en Node, sin navegador ni WebGL
(Three.js construye geometría sin contexto):

- `terrain` — alturas, navegación, escalones, malla y bordes del mapa.
- `movement` — dirección de cámara, movimiento contra muros y acantilados, captura del héroe.
- `combat` — mitigación, cooldown, daño mínimo, muerte, IA y ciclo de respawn.
- `progression` — niveles, talentos, coste y cooldown de habilidades, área, cura, buffs y proyectil.
- `loot` — botín, equipar y quitar, mejoras y escalado.
- `boss` — fases, aviso del golpe sísmico y esquiva.

## Limitaciones conocidas

- Los enemigos y el jefe atacan solo al jugador, no a los compañeros de party (aún no existen).
- El arte es placeholder generado por código (cápsulas, conos y cajas), sustituible por modelos
  reales sin tocar la lógica.
- El balance no está probado en partidas largas; los números de `data/` son un punto de partida.
- Sin multijugador real: lo "cooperativo" serán bots.

## Backlog

Bots de party y población (fase 8), persistencia y código de héroe (fase 9), PWA y APK
revalidados (fase 10), y más adelante: niebla de guerra, rotación de cámara, animaciones
esqueléticas, quests, mazmorras, rebirth y arena PvP.
