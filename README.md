# Golden Gods Web

ORPG (Open RPG) **3D** jugable en el navegador, inspirado **conceptualmente** en los mapas ORPG
de Warcraft III (como Golden Gods II): mundo abierto con terreno y desniveles, subir de nivel,
jefes con botín, mejoras de equipo y una capa "MMO local" donde bots simulan otros jugadores.

No contiene ningún recurso, nombre ni código del mapa original: todo el contenido vive en
`src/data/` y es propio.

La versión 2D anterior (Phaser) está congelada en la etiqueta **`v0.1-2d`** por si quieres
comparar o recuperar algo.

## Estado

Completadas las **10 fases** de la migración a 3D: base Three.js, terreno con alturas y
acantilados, héroe y cámara, combate, progresión y UI, selección de dioses, botín y herrería,
jefe con fases, bots de party y población simulada, persistencia, y PWA y APK revalidados.

El juego guarda solo cada 15 segundos y al cerrar la pestaña. Si hay partida, el menú ofrece
**CONTINUAR**; elegir un dios nuevo la descarta.

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
| Misiones | `L` | — |
| Herrería (junto al NPC) | `G` | botón que aparece al acercarte |
| Partida (guardar, exportar, importar, borrar) | `O` | — |

Cada dios tiene sus propias tres habilidades (área, proyectil, cura, embestida o buff).

## Cómo se juega

Eliges dios, apareces en el **Prado Dorado** y subes por tres subáreas a distinto nivel: el
**Prado**, las **Ruinas de Khar** y la **Cima del Titán**, donde espera el jefe. Matas mobs para
subir de nivel y ganar oro, recoges el botín, mejoras el equipo en la herrería y gastas puntos de
talento. El jefe tiene tres fases y un golpe sísmico que se anuncia con un anillo: si te alejas
del círculo antes de que cierre, lo esquivas.

Una **cadena de misiones** te va marcando el camino (el objetivo activo se ve siempre en el HUD, y
`L` abre el registro completo): limpiar el prado, subir de nivel, cazar brutos en las ruinas,
reunir oro para la herrería y, al final, bajar a por el Titán. Cada una da oro, experiencia o
equipo.

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

## Arte

Los personajes, las armas y la decoración son **CC0** (KayKit, de Kay Lousberg): ver
`ATTRIBUTIONS.md`. `npm run models`, `npm run props` y `npm run weapons` los descargan,
descartan lo que no se usa y los dejan en `public/models/`. Los ficheros resultantes **se
versionan**, así que solo hay que ejecutar esos scripts si quieres cambiar o actualizar el arte.

### Cómo funciona el 3D

- **Cámara tipo WC3**: perspectiva con 55° de inclinación y yaw fijo, con seguimiento suavizado y
  sacudida. Las direcciones de entrada se convierten de pantalla a mundo según ese yaw.
- **Terreno**: cada celda es una tapa plana a su altura y, donde hay desnivel, se añade un faldón
  vertical; eso es lo que se lee como acantilado. Todo el terreno es **una sola geometría**
  (2552 triángulos), pensado para el WebView de Android.
- **Navegación**: rejilla con **regla de escalón**; no se salva un desnivel de más de un nivel.
- **Entidades agnósticas del motor**: `Unit` guarda posición, stats y vida, y expone un handle de
  Three.js; la lógica no depende del render.
- **Decoración**: árboles, rocas y objetos repartidos con una semilla fija (mismo mundo siempre)
  y dibujados con `InstancedMesh`: una llamada de dibujo por tipo de prop en vez de una por
  objeto. Son decorativos, no bloquean el paso.
- **Personajes**: modelos GLB con esqueleto y un `AnimationMixer` por unidad; si un modelo no
  carga, la entidad cae a una primitiva generada por código.
- **Armas**: cada personaje se cuelga el arma del nodo de enganche que trae el propio modelo
  (`1H_Sword`, `2H_Axe`, `Round_Shield`…). Ojo: three sanea los nombres de nodo al cargar glTF
  (le quita puntos), así que se busca con su misma regla y no con la cadena literal.
- **UI en DOM** sobre el canvas, en vez de UI dibujada en el motor.

### Personalizar contenido

Todo el balance es dato, no código:

- `data/gods.ts` — los 4 dioses (stats, crecimiento y habilidades).
- `data/skills.ts` — habilidades y sus efectos (`aoe`, `projectile`, `heal`, `dash`, `buff`).
- `data/talents.ts` — árbol de talentos.
- `data/items.ts` / `data/lootTables.ts` — equipo y tablas de botín.
- `data/enemies.ts` — enemigos y jefe (fases y golpe sísmico).
- `data/zones.ts` — mapa, alturas, subáreas, apariciones y posición de la herrería.
- `data/quests.ts` — la cadena de misiones, con sus objetivos y recompensas.
- `config/constants.ts` — tamaño de celda, altura por nivel, escalón máximo.

### Dónde están los números "de tacto"

Si algo se siente mal, casi todo se ajusta en un sitio concreto:

- **Velocidad de cada dios**: `moveSpeed` en `data/gods.ts` (en celdas por segundo).
- **Densidad de decoración**: `PROP_DENSITY` y `PROP_TABLES` en `world/props.ts`.
- **Partículas** (tamaño, gravedad, pool): constantes al principio de `systems/Particles.ts`;
  cuántas lanza cada efecto, en las llamadas a `fx.burst`.
- **Balance de combate**: `data/enemies.ts`, `data/skills.ts` y `data/balance.ts`.
- **Cámara**: `WC3_CAMERA` en `engine/Wc3Camera.ts` (ángulo, distancia, campo de visión).

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
- `party` — compañeros que siguen, entran en combate y respetan la correa del héroe.
- `save` — guardado, continuar, código de héroe, rechazo de códigos corruptos y partida limpia.
- `assets` — emparejado de animaciones y que cada GLB de personaje exista y cubra los 7 estados.
- `props` — reparto determinista de decoración, zonas reservadas y que cada prop tenga su GLB.
- `weapons` — que cada nodo de enganche exista de verdad en su modelo y que cada arma tenga GLB.
- `particles` — el pool de partículas: arranque apagado, estallidos, apagado por tiempo y que
  desbordarlo no rompa nada.
- `quests` — la cadena de misiones: contadores por misión, objetivos de bajas, nivel y oro, una
  pasada completa de la cadena y que cada misión apunte a un enemigo que existe.

## Limitaciones conocidas

- Los enemigos y el jefe atacan solo al jugador, no a los compañeros de party: los bots ayudan
  pero no reciben daño.
- El arte es placeholder generado por código (cápsulas, conos y cajas), sustituible por modelos
  reales sin tocar la lógica.
- El balance no está probado en partidas largas; los números de `data/` son un punto de partida.
- Sin multijugador real: lo "cooperativo" son los bots.

## Backlog

Niebla de guerra, rotación de cámara, animaciones esqueléticas y modelos reales, quests,
mazmorras, rebirth, arena PvP y más dioses y zonas.
