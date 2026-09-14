# Golden Gods Web

ORPG (Open RPG) isométrico jugable en el navegador, inspirado **conceptualmente** en los
mapas ORPG de Warcraft III (como Golden Gods II): mundo abierto, subir de nivel, jefes con
botín, mejoras de equipo y guardado de héroe, con una capa "MMO local" donde bots simulan
otros jugadores.

No contiene ningún recurso, nombre ni código del mapa original: todo el contenido vive en
`src/data/` y es propio.

## Requisitos

- Node.js 20+ (probado con Node 24) y npm.
- Un navegador moderno con WebGL/Canvas.

## Cómo ejecutar

```bash
npm install
npm run dev -- --host
```

`--host` expone el servidor en la red local, imprescindible para probar en el móvil: abre la
URL de red que imprime Vite (p. ej. `http://192.168.x.x:5173`).

Otros comandos:

```bash
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve el build de producción
npm run typecheck  # solo comprobación de tipos
npm run icons      # regenera los iconos PWA en public/icons/
```

## Controles

| Acción | Teclado / ratón | Táctil |
|---|---|---|
| Moverse | WASD o flechas | Joystick (mitad inferior izquierda) |
| Habilidades Q/E/R | teclas Q, E, R | toca los botones de habilidad |
| Ataque básico | automático al enemigo más cercano en rango | igual |
| Talentos | `T` | botón TALENTOS |
| Equipo y mochila | `I` | botón EQUIPO |
| Herrería (cerca del NPC) | `G` | botón HERRERÍA |
| Partida (guardar/exportar/importar) | `O` | botón PARTIDA |

## Instalar como app (PWA)

En producción (`npm run build && npm run preview`, o desplegado por HTTPS) el juego incluye
manifest y service worker, así que el navegador ofrece **"Añadir a pantalla de inicio"** y se
abre a pantalla completa como una app.

## Estructura

```
src/
  config/     constantes y configuración de Phaser
  core/       bus de eventos, input, SaveManager
  data/       TODO el contenido y balance (dioses, habilidades, talentos, items, enemigos, botín, zonas, bots)
  entities/   Actor, Player, Enemy, Projectile, Pickup, PartyBot, PopulationHero
  systems/    combate, IA, jefe, spawn, progresión, talentos, skills, inventario, loot, población
  ui/         HUD y paneles (habilidades, talentos, inventario, partida) y joystick
  world/      proyección isométrica, map loader, texturas placeholder
  scenes/     Boot, selección de héroe y mundo
```

### Personalizar contenido

Todo el balance es dato, no código:

- `data/gods.ts` — los 4 dioses jugables (stats, crecimiento, habilidades).
- `data/skills.ts` — habilidades y sus efectos (`aoe`, `projectile`, `heal`, `dash`, `buff`).
- `data/talents.ts` — árbol de talentos.
- `data/items.ts` / `data/lootTables.ts` — equipo y tablas de botín.
- `data/enemies.ts` — enemigos y jefe.
- `data/zones.ts` — mapa, subáreas, puntos de aparición y posición de la herrería.

## Estado del proyecto

Completadas las 9 fases del plan: scaffold, mundo isométrico y movimiento, combate, progresión
y habilidades, 4 dioses con selección, loot y economía, zona con 3 subáreas y jefe, bots de
party y población, persistencia, y pulido + PWA.

### Limitaciones conocidas

- Los enemigos y el jefe atacan solo al jugador, no a los compañeros de party.
- El arte es placeholder generado por código (formas y colores), pensado para sustituirse por
  tilesets libres sin tocar la lógica.
- El balance no está probado en partidas reales; los números de `data/` son un punto de partida.
- Sin multijugador real: lo "cooperativo" son bots.

### Backlog (fuera del MVP)

Quests encadenadas, mazmorras instanciadas, rebirth/prestigio, arena PvP, vehículo, más zonas y
dioses, y netcode real.
