# Auditoría de accesibilidad (WCAG 2.2 AA), UX y diseño responsive

**Proyecto:** `FRONT-END-IS` (Ecuador Travel)
**Fecha:** 2026-10-12
**Tipo:** Auditoría no destructiva — no se modificó ningún archivo del código auditado.
**Herramientas usadas:** inspección estática del código, `npm run lint` (oxlint) y `npm run build` (Vite). Cálculo de ratios de contraste con fórmula WCAG 2.x.

---

## 0. Alcance y método

Los archivos solicitados (`index.html`, `styles.css`, `script.js`) no existen con esos nombres porque el proyecto es **React 19 + Vite + Tailwind v4**. Se acordó auditar los equivalentes reales:

| Pedido | Equivalente real auditado |
|---|---|
| `index.html` | `FRONT-END-IS/index.html` |
| `styles.css` | `FRONT-END-IS/src/index.css` (hoja de estilos global + tema) |
| `script.js` | `src/main.jsx`, `src/App.jsx`, todos los `src/components/**/*.jsx`, `src/context/*.jsx`, `src/services/api.js`, `src/utils/*.js` |

Cobertura: estructura semántica, jerarquía de encabezados, nombres accesibles, textos alternativos, contraste, navegación por teclado, foco visible, uso de botones vs enlaces, ARIA, objetivos táctiles, navegación móvil, overflow horizontal, imágenes, errores JavaScript y comportamiento en 320 / 390 / 768 px y escritorio.

**Nota de método:** las conclusiones de responsive (320/390/768/escritorio) provienen de análisis estático de las clases y layouts; las que requieren render real están marcadas como *«verificar en runtime»*. No se ejecutó un navegador automatizado (no había Playwright/Puppeteer instalado y no se debía alterar dependencias).

**Resultado global del build:** compila correctamente (`vite build` OK). `oxlint`: **0 errores y 18 warnings** (todos de estilo del React Compiler: `set-state-in-effect`, `only-export-components`, `purity`), sin fallos de ejecución detectados en build.

---

## 1. Resumen ejecutivo

El front-end tiene una base de accesibilidad **notablemente sólida** para un proyecto de este tamaño: HTML en español (`lang="es"`), viewport sin bloqueo de zoom, skip-link funcional, landmarks semánticos, un solo `<h1>` por vista, jerarquía de encabezados coherente, nombres accesibles en botones de icono, `aria-current`, `aria-expanded`/`aria-controls`, estados de carga y error anunciados (`role="status"`/`role="alert"`), `prefers-reduced-motion`, foco global visible y objetivos táctiles de 44 px en las acciones principales.

Sin embargo, se identificaron **problemas que impiden cumplir plenamente WCAG 2.2 AA**, concentrados en tres frentes:

1. **Contraste de color** del botón principal (CTA) y de algunos textos/bordes. El botón primario blanco sobre el gradiente naranja cae a **3,19:1** en su extremo (requiere 4,5:1) y los bordes de inputs/botones secundarios quedan en **~1,2:1** (requieren 3:1 en 1.4.11).
2. **Gestión de foco en modales**: no hay *focus trap* ni inactivación (`inert`) del fondo; el foco puede salir hacia la página de atrás y no se devuelve al disparador al cerrar.
3. **Patrones ARIA incorrectos** en componentes concretos (estrellas de reseñas con `role="radiogroup"` con hijos `button`, pestañas sin patrón `tab`, IDs de formulario duplicados en paneles de login).

No se encontraron hallazgos **críticos** (ninguno impide usar el sitio por completo). El esfuerzo de corrección es moderado y está acotado.

---

## 2. Hallazgos por severidad

> Criterios referidos a WCAG 2.2. Nivel AA salvo indicación.

### 2.1 Críticos

**Ninguno.** No se identificó ninguna barrera que bloquee por completo la operación del sitio. Los problemas más graves se clasifican como Altos (ver 2.2).

---

### 2.2 Altos

#### A-1 — Contraste insuficiente en el botón primario (CTA)
- **Criterio:** WCAG 1.4.3 Contrast (Minimum) — 4,5:1 texto normal.
- **Evidencia:** `.btn-primary` (`src/index.css:74-80`) usa `background: linear-gradient(135deg, var(--color-ec-volcano), #d97706)` con `text-white`.
  - Blanco sobre `#c45c26` (inicio) = **4,28:1** (bajo 4,5).
  - Blanco sobre `#d97706` (fin) = **3,19:1** (bajo 4,5).
  - El texto de estos botones es `text-sm` (14 px) / `text-base` (16 px) en negrita → **no** califica como texto grande (requiere ≥18,66 px negrita), por lo que necesita 4,5:1.
  - Afecta a los CTA principales: `AttractionCard.jsx:87`, `CheckoutCard.jsx:66`, `HeroSection.jsx:64`, `App.jsx:287`, `CheckoutModal.jsx:357/473`, `AuthLoginPanel.jsx:160/260`, `AdminAttractionModal.jsx:329`, etc.
- **Recomendación:** oscurecer el gradiente para asegurar ≥4,5:1 en todo su recorrido (p. ej. `#b0491a → #a34a1c`, que dan >5,9:1 y >5,9:1) o añadir un `text-shadow`/capa oscura. Alternativa: aumentar el tamaño del texto del botón a ≥18,66 px negrita **y** llevar el color a ≥3:1. Verificar con la herramienta con los valores finales.

#### A-2 — Los modales no atrapan el foco ni inactivan el fondo
- **Criterio:** WCAG 2.4.3 Focus Order / 2.4.7 Focus Visible / buena práctica ARIA APG para `dialog`.
- **Evidencia:** Todos los diálogos declaran `role="dialog" aria-modal="true"` pero no aplican `inert`/`aria-hidden` al contenido de fondo ni contienen el foco:
  - `CheckoutModal.jsx:191-208` (backdrop + panel), cierre con Escape en `:95-104`.
  - `Navbar.jsx:190-209` (modal de login).
  - `AdminAttractionModal.jsx:123-137`.
  - `AdminUserModal.jsx:93-109`.
  - `PayReservationModal.jsx:78-91`.
  - Se enfoca el botón de cierre al abrir (p. ej. `CheckoutModal.jsx:66`), pero al pulsar `Tab` el foco sale a enlaces de la página detrás (header, footer, tarjetas) porque el fondo sigue siendo alcanzable.
- **Recomendación:** implementar atrapado de foco (roving/focus trap) dentro del `role="dialog"`, marcar el resto de la app como `inert` mientras el modal esté abierto y **devolver el foco** al elemento que abrió el modal al cerrarlo. Un `<dialog>` nativo o una utilidad de focus-trap resuelve ambos casos.

#### A-3 — Bordes de controles con contraste insuficiente (Non-text Contrast)
- **Criterio:** WCAG 1.4.11 Non-text Contrast — 3:1 para límites de componentes.
- **Evidencia:** se usa `border-ec-mist` (`#e2ebe8`) como único límite visual de inputs y del botón secundario, sobre fondo blanco / `#f7f9f8`:
  - `#e2ebe8` sobre blanco = **1,22:1**; sobre `#f7f9f8` = **1,15:1**.
  - `.btn-secondary` (`src/index.css:90-100`), inputs en `CatalogPage` (`App.jsx:176`), `AuthLoginPanel.jsx:140/153/176/…`, `CheckoutModal.jsx:282/299/337/351/428/451`, `AdminAttractionModal.jsx:177/191/207/…`, `AdminUsers.jsx:71`, `AdminUserModal.jsx:151/168/…`.
  - El borde de un input sin fondo diferenciado es la única información que identifica el control → debe alcanzar 3:1.
- **Recomendación:** oscurecer el color del borde de controles a un tono con ≥3:1 sobre blanco (p. ej. `#7c8f88` ≈ 3,0:1 o `#6b7d76`) o reforzar con fondo sutil + sombra. Mantener `ec-mist` solo para separadores decorativos.

---

### 2.3 Medios

#### M-1 — `text-ec-volcano` no alcanza 4,5:1 como texto
- **Criterio:** WCAG 1.4.3.
- **Evidencia:**
  - `#c45c26` sobre blanco = **4,28:1** (bajo 4,5).
  - Sobre su propia capa `bg-ec-volcano/10` = **3,78:1**.
  - Usos como texto no grande: enlaces de navegación activos `Navbar.jsx:44/58/73` (14 px negrita), etiqueta «Error 404» en `App.jsx:284` (`text-sm` negrita), estados `hover:text-ec-volcano` en `WishlistButton.jsx:65`, `AdminUsers.jsx` (botones demo en `CheckoutModal.jsx:460`, `PayReservationModal.jsx:172`).
- **Recomendación:** usar un naranja más oscuro para texto (p. ej. `--color-ec-volcano-hover: #a34a1c` ≈ 5,9:1 sobre blanco) o reservar `ec-volcano` para fondos/decoración. Para el estado activo del nav, usar `text-ec-ink`/`text-ec-pacific` sobre el tinte.

#### M-2 — `role="radiogroup"` con hijos incorrectos (estrellas de calificación)
- **Criterio:** WCAG 4.1.2 Name, Role, Value / 1.3.1 Info and Relationships.
- **Evidencia:** `ReviewsSection.jsx:26-37` (`StarBar`) aplica `role="radiogroup"` a un `<div>` cuyos hijos son `<button>` (`Star`, `:5-24`) — no tienen `role="radio"`, ni `aria-checked`, ni navegación con flechas. Además el `radiogroup` no tiene nombre accesible (falta `aria-label`).
- **Recomendación:** o bien usar el patrón nativo de botones con `aria-pressed` (y **quitar** `role="radiogroup"`), o implementar de verdad el patrón *radio group* (`role="radio"`, `aria-checked`, roving tabindex, manejo de flechas) y añadir `aria-label="Calificación"`.

#### M-3 — Estrellas de solo lectura sin alternativa textual del valor
- **Criterio:** WCAG 1.1.1 / 4.1.2 / 1.3.1.
- **Evidencia:** en el listado de reseñas, `ReviewsSection.jsx:155` renderiza `<StarBar value={Number(r.score) || 0} />` en modo solo-lectura. En ese modo cada `<Star>` queda `disabled` con `aria-label={undefined}` y el SVG tiene `aria-hidden` → **el valor de la reseña no se anuncia** a lectores de pantalla. (El promedio superior sí muestra el número en `:111-113`, pero cada reseña individual no.)
- **Recomendación:** añadir texto accesible explícito por reseña, p. ej. `<span className="sr-only">Calificación: {r.score} de 5</span>`, o `aria-label`/`role="img"` en el contenedor de estrellas.

#### M-4 — IDs de formulario duplicados en paneles de login
- **Criterio:** WCAG 1.3.1 / 4.1.2 (asociación etiqueta–control correcta).
- **Evidencia:** `AuthLoginPanel` usa IDs fijos (`auth-email`, `auth-password`, `reg-nombre`, `reg-dni`, `reg-email`, … en `:136-258`) y se renderiza en varios puntos que pueden coexistir:
  - modal del `Navbar.jsx:199`,
  - `CheckoutModal.jsx:230`,
  - `MyReservations.jsx:82`,
  - `AdminDashboard.jsx:85`.
  - Ejemplo: estando en `/mis-reservas` sin sesión, abrir el modal «Acceder» del navbar deja **dos** `AuthLoginPanel` en el DOM → IDs duplicados; los `htmlFor` apuntan al primer control y el foco/lectura puede ir al formulario equivocado.
- **Recomendación:** generar IDs con `useId()` dentro de `AuthLoginPanel` y enlazar labels con ese sufijo.

#### M-5 — El enlace «Confianza» no desplaza a la sección desde otras rutas
- **Criterio:** UX / WCAG 2.4.4 (Link Purpose) y comportamiento esperado de navegación.
- **Evidencia:** `Navbar.jsx:10` define `{ to: '/#confianza' }` y `App.jsx:326` repite `<Link to="/#confianza">`. React Router (v7) **no** hace scroll al hash por defecto; al venir de otra ruta (p. ej. `/experiencias`) se navega a `/` pero no baja a `#confianza`.
- **Recomendación:** añadir un componente de `ScrollToHash` que, al cambiar `location.hash`, haga `scrollIntoView` del elemento; o usar un `<a href="/#confianza">` real para el caso cross-route.

#### M-6 — Pestañas del Panel B2B sin semántica de pestañas
- **Criterio:** WCAG 4.1.2 / 1.3.1.
- **Evidencia:** `AdminDashboard.jsx:114-117` son dos `<button>` que solo cambian `activeTab` visualmente (clases condicionales), sin `role="tablist"`/`role="tab"`, sin `aria-selected` y sin relación con el panel (`aria-controls`).
- **Recomendación:** aplicar el patrón *tabs* (`role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`) o, como mínimo, `aria-pressed` en cada botón.

#### M-7 — Pista de favoritos posiblemente recortada
- **Criterio:** UX.
- **Evidencia:** la pista de `WishlistButton` (`WishlistButton.jsx:72-79`) es `absolute left-1/2 -translate-x-1/2 w-max max-w-[220px]`, pero en las tarjetas el botón vive dentro de un contenedor con `overflow-hidden` (`AttractionCard.jsx:19` y `:20`). Al centrar una caja de hasta 220 px sobre un botón pegado al borde derecho, parte del texto («Inicia sesión para guardar en favoritos») queda fuera del contenedor y se recorta.
- **Recomendación:** evitar `overflow-hidden` en el ancestro del tooltip o renderizar el aviso en un portal/`position: fixed`, y alinear el mensaje al borde (`right-0` en la tarjeta).

#### M-8 — `text-ec-slate/80` no alcanza 4,5:1
- **Criterio:** WCAG 1.4.3.
- **Evidencia:** `#4a5f58` al 80 % sobre blanco ≈ `#6e7f79` = **4,22:1**. Uso: `AdminUsers.jsx:126` `<div className="text-ec-slate/80">Tel: …</div>` (texto pequeño).
- **Recomendación:** usar `text-ec-slate` sólido (6,84:1) o un tono ≥4,5:1 para ese texto.

---

### 2.4 Bajos

| ID | Hallazgo | Criterio | Evidencia | Recomendación |
|---|---|---|---|---|
| B-1 | Clase inexistente `text-ec-gold` (no está definida en el tema, se genera 0 reglas; confirmado en `dist/assets/*.css`) | WCAG 1.4.1 (uso de color) / calidad | `AdminUsers.jsx:118`; tema en `src/index.css:4-24` (no hay `--color-ec-gold`) | Usar un token existente (`text-amber-700`, `text-ec-earth`) o definir `--color-ec-gold` en `@theme` |
| B-2 | Imagen de miniatura sin `width`/`height` (riesgo de CLS) y `alt` poco descriptivo | WCAG 1.1.1 / UX | `MyReservations.jsx:153-158` (`alt={atr.nombre}`, sin dimensiones) | Añadir `width`/`height` y `alt` descriptivo (o `alt=""` si es decorativa dentro del enlace etiquetado) |
| B-3 | Encabezados de tabla sin `scope="col"` | WCAG 1.3.1 | `AdminDashboard.jsx:158-164`; `AdminUsers.jsx:104-108` | Añadir `scope="col"` a cada `<th>` |
| B-4 | Errores de formulario no vinculados al campo (`aria-invalid`/`aria-describedby`) | WCAG 3.3.1 | `AuthLoginPanel.jsx:126-130`; `CheckoutModal.jsx:253-257`; `AdminAttractionModal.jsx:161-165` | Marcar el input afectado con `aria-invalid="true"` y `aria-describedby` al contenedor del error |
| B-5 | `crypto.randomUUID()` requiere contexto seguro | JS runtime | `CheckoutModal.jsx:54`, `MyReservations.jsx:277` | En orígenes `http://` no locales lanzaría `TypeError`; usar el paquete `uuid` (ya en `package.json`) o un polyfill |
| B-6 | Fecha mínima de reserva calculada en UTC | UX | `CheckoutModal.jsx:9` (`new Date().toISOString()…`) | Calcular con la fecha local (Ecuador UTC-5) para no bloquear reservas del día |
| B-7 | Scroll suave por JS ignora `prefers-reduced-motion` | WCAG 2.3.3 (AAA) / buena práctica | `HeroSection.jsx:9-11` (`behavior: 'smooth'`) | Respetar `window.matchMedia('(prefers-reduced-motion: reduce)')` y usar `behavior: 'auto'` |
| B-8 | `new Date().getFullYear()` durante el render | warning React purity | `App.jsx:328` | Calcular fuera del render o memoizar (sin SSR no rompe, pero es warning) |
| B-9 | Semántica ARIA del precio/aside mejorable | WCAG 4.1.2 | `CheckoutCard.jsx:19-22` (`aside` nombrado por el botón) y `:32` (`aria-label` en un `<p>`) | Nombrar el `aside` con el título del tour; retirar `aria-label` redundante del párrafo |
| B-10 | Uso de `window.confirm`/`alert` para confirmar y avisar | UX | `AdminDashboard.jsx:64`; `AdminUsers.jsx:34/38/45` | Sustituir por diálogos accesibles propios o por patrones inline |
| B-11 | `<nav aria-label="Enlaces legales">` con enlaces que no son legales | WCAG 1.3.1 | `App.jsx:324-327` (Catálogo, Confianza) | Renombrar el `aria-label` (p. ej. «Enlaces del sitio») o incluir enlaces legales reales |
| B-12 | `<summary>` pierde el marcador nativo y el indicador «Ver» es estático y `aria-hidden` | UX | `src/index.css:143-153`; `AttractionDetail.jsx:150-155/168-173` | Añadir chevron visual que rote con `[open]` y texto accesible del estado |
| B-13 | Placeholders con contraste dependiente del navegador | WCAG 1.4.3 (interpretación) | Inputs con `placeholder` en `App.jsx:173`, `AuthLoginPanel.jsx`, etc. (no se define `::placeholder`) | Definir un `::placeholder` con contraste suficiente y no transmitir información esencial solo en el placeholder |

---

## 3. Evidencia concreta (matriz archivo / elemento / línea)

| ID | Archivo | Elemento | Línea |
|---|---|---|---|
| A-1 | `src/index.css` | `.btn-primary` (gradiente + `text-white`) | 74-88 |
| A-2 | `src/components/CheckoutModal.jsx` | backdrop + `div role="dialog"` | 191-208 |
| A-2 | `src/components/Navbar.jsx` | modal login | 190-209 |
| A-2 | `src/components/AdminAttractionModal.jsx` | modal | 123-137 |
| A-2 | `src/components/AdminUserModal.jsx` | modal (además sin bloqueo de scroll del body) | 93-109 |
| A-2 | `src/components/PayReservationModal.jsx` | modal | 78-91 |
| A-3 | `src/index.css` | `.btn-secondary` (borde `ec-mist`) | 90-100 |
| A-3 | `src/components/AuthLoginPanel.jsx` | inputs `border-ec-mist` | 140, 153, 176, 191, 208, 221, 235, 250 |
| A-3 | `src/App.jsx` | input buscador `border-ec-mist` | 176 |
| M-1 | `src/components/Navbar.jsx` | enlaces activos `text-ec-volcano` | 44, 58, 73 |
| M-1 | `src/App.jsx` | etiqueta «Error 404» `text-ec-volcano` | 284 |
| M-2 | `src/components/ReviewsSection.jsx` | `StarBar` con `role="radiogroup"`, `Star` como `button` | 26-37 / 5-24 |
| M-3 | `src/components/ReviewsSection.jsx` | `<StarBar value={r.score} />` sin texto alternativo | 155 |
| M-4 | `src/components/AuthLoginPanel.jsx` | IDs fijos `auth-email`, `reg-*` | 136, 148, 171, 185, 216, 230, 245 |
| M-4 | `src/components/Navbar.jsx` / `MyReservations.jsx` | dos instancias simultáneas posibles | 199 / 82 |
| M-5 | `src/components/Navbar.jsx` | NAV `to: '/#confianza'` | 10 |
| M-5 | `src/App.jsx` | footer `<Link to="/#confianza">` | 326 |
| M-6 | `src/components/AdminDashboard.jsx` | botones Catálogo/Usuarios | 114-117 |
| M-7 | `src/components/WishlistButton.jsx` / `AttractionCard.jsx` | hint `absolute` dentro de `overflow-hidden` | 72-79 / 19-20 |
| M-8 | `src/components/AdminUsers.jsx` | `text-ec-slate/80` | 126 |
| B-1 | `src/components/AdminUsers.jsx` | `text-ec-gold` no definido | 118 |
| B-2 | `src/components/MyReservations.jsx` | `<img>` sin dimensiones | 153-158 |
| B-3 | `src/components/AdminDashboard.jsx` / `AdminUsers.jsx` | `<th>` sin `scope` | 158-164 / 104-108 |
| B-4 | varios | mensajes de error sin `aria-describedby` | ver tabla 2.4 |
| B-5 | `CheckoutModal.jsx` / `MyReservations.jsx` | `crypto.randomUUID()` | 54 / 277 |
| B-6 | `src/components/CheckoutModal.jsx` | `TODAY_ISO` en UTC | 9 |
| B-7 | `src/components/HeroSection.jsx` | `scrollIntoView({ behavior: 'smooth' })` | 9-11 |
| B-8 | `src/App.jsx` | `new Date().getFullYear()` en render | 328 |
| B-9 | `src/components/CheckoutCard.jsx` | `aside aria-labelledby` → id del botón | 19-22, 64 |
| B-11 | `src/App.jsx` | `nav aria-label="Enlaces legales"` | 324 |
| B-12 | `src/index.css` / `AttractionDetail.jsx` | `summary` sin marcador / «Ver» estático | 143-153 / 150-155 |

---

## 4. Recomendación de corrección (por hallazgo)

- **A-1:** ajustar el gradiente de `.btn-primary` a tonos con ≥4,5:1 para texto blanco (p. ej. `linear-gradient(135deg,#b0491a,#a34a1c)`), o subir el tamaño de fuente de los CTA a ≥18,66 px negrita. Validar el gradiente completo, no solo un punto.
- **A-2:** crear un componente `Modal` reutilizable con: focus trap, `inert` en `#root` (o `aria-hidden` en el resto), foco inicial en el primer control, cierre con `Escape`, y restauración del foco al disparador. Reutilizarlo en los 5 modales.
- **A-3:** introducir un token `--color-ec-border` con ≥3:1 sobre blanco y reemplazar `border-ec-mist` en controles de formulario y `.btn-secondary`.
- **M-1:** usar `--color-ec-volcano-hover` o `ec-earth` para texto; reservar `ec-volcano` para fondos.
- **M-2/M-3:** adoptar botones con `aria-pressed` (y quitar `radiogroup`) o implementar el patrón radio completo; añadir texto `sr-only` con el puntaje por reseña.
- **M-4:** cambiar los IDs de `AuthLoginPanel` por sufijos de `useId()`.
- **M-5:** añadir `ScrollToHash` o convertir el enlace a ancla real cross-route.
- **M-6:** aplicar patrón `tablist`/`tab`/`tabpanel` con `aria-selected`.
- **M-7:** sacar el tooltip del contenedor con `overflow-hidden` o usar `position: fixed`/portal.
- **M-8 / B-1:** usar colores existentes con contraste suficiente; definir o eliminar `ec-gold`.
- **B-2…B-13:** correcciones puntuales indicadas en la tabla 2.4 (dimensiones de imagen, `scope`, `aria-invalid`/`aria-describedby`, contexto seguro para UUID, fecha local, `prefers-reduced-motion`, `getFullYear` fuera del render, etiqueta de `nav`, indicador de `<summary>`).

---

## 5. Criterios que SÍ cumplen (no generar falsos positivos)

- **Idioma y zoom:** `lang="es"` (`index.html:2`); `viewport` sin `maximum-scale`/`user-scalable=no` (`index.html:5`) → 1.4.4/1.4.10 sin bloqueo.
- **Metadatos:** `<title>` y `description` presentes (`index.html:8-12`).
- **Skip link:** enlace «Saltar al contenido principal» (`App.jsx:298`) con estilo dedicado y `:focus` visible (`index.css:56-70`); destino `<main id="main-content" tabIndex={-1}>` (`App.jsx:303`).
- **Landmarks:** `header`, `nav` con `aria-label`, `main`, `footer`, `section` con `aria-labelledby`. Múltiples `<nav>` correctamente etiquetados (`Navbar.jsx:37`, `App.jsx:235`, breadcrumb `AttractionDetail.jsx:81`, `App.jsx:324`).
- **Jerarquía de encabezados:** un solo `<h1>` por vista y orden correcto h1→h2→h3 en Home, Catálogo, Detalle, Mis reservas, Panel B2B y Checkout. `TrustStrip` usa un `h2` `sr-only` y `h3` por ítem (`TrustStrip.jsx:11-34`).
- **Nombres accesibles:** botón de menú móvil con texto `sr-only` + `aria-expanded`/`aria-controls` (`Navbar.jsx:102-117`); botones de icono con `aria-label` (héroe, reservar, cerrar, favoritos).
- **Estados:** `aria-current="page"` en navegación; `aria-pressed` en filtros de aeropuerto (`App.jsx:188`) y en favoritos (`WishlistButton.jsx:58`); `aria-expanded` en «Más detalles» (`AttractionCard.jsx:71`) y en cancelar reserva (`MyReservations.jsx:210`).
- **Foco visible:** `:focus-visible { outline: 3px solid #c45c26; outline-offset: 2px }` (`index.css:51-54`); el color del outline sobre blanco = 4,28:1 (>3:1 exigido).
- **Objetivos táctiles:** acciones principales con `min-h-11`/`min-w-11` (44 px) en navbar, paginación, modales y CTAs; las secundarias cumplen el mínimo de 24 px de 2.5.8.
- **Imágenes:** `alt` descriptivo y `width`/`height` en héroe y tarjetas; `loading="eager"` + `fetchPriority="high"` en héroe y `loading="lazy"` en tarjetas (`HeroSection.jsx:19-27`, `AttractionCard.jsx:26-34`, `AttractionDetail.jsx:128-136`).
- **Movimiento:** `prefers-reduced-motion` neutraliza animaciones/transiciones (`index.css:31-42`).
- **Anuncios dinámicos:** resultados con `role="status" aria-live="polite"` (`App.jsx:204`), estados de carga `role="status"`, errores `role="alert"`.
- **Formularios:** labels asociados por `htmlFor`/`id` en todos los campos, `autoComplete` adecuado, `inputMode` en DNI/pasajeros, `required`/`minLength` nativos.
- **Tablas:** marcado con `<thead>`/`<th>` (falta solo `scope`, B-3).
- **Contraste (pares que sí cumplen):** `ec-slate`/blanco 6,84:1; `ec-slate`/`ec-mist` 5,63:1; `ec-pacific`/blanco 9,11:1; `ec-andes`/blanco 7,89:1; blanco/`ec-pacific` 9,11:1; `ec-mist`/`ec-ink` 14,04:1; `ec-mist/60`/`ec-ink` 5,80:1; `amber-800`/`amber-100` 6,37:1; `ec-slate`/`ec-sand/25` 6,34:1; `ec-slate`/`amber-50` 6,60:1.
- **Overflow horizontal:** grids de 1 columna en móvil (`.catalog-grid`), tablas con `overflow-x-auto` (`AdminDashboard.jsx:154`, `AdminUsers.jsx:100`), textos largos con `truncate`/`max-w-*` (email de sesión `Navbar.jsx:80`, breadcrumb `AttractionDetail.jsx:95`), barras con `flex-wrap` (paginación, filtros). Sin indicios claros de desbordamiento a 320/390/768 px en análisis estático.
- **Build/lint:** `vite build` correcto; `oxlint` sin errores.

---

## 6. Pruebas que deberían repetirse después de corregir

1. **Contraste (automático + manual):**
   - Recalcular ratios de `.btn-primary` en ambos extremos del gradiente, `text-ec-volcano` sobre sus fondos, `ec-slate/80`, y bordes vs. 1.4.11.
   - Ejecutar axe DevTools / Lighthouse en Home, Catálogo, Detalle, Mis reservas, Panel B2B y con cada modal abierto.
2. **Teclado (sin ratón):**
   - Recorrer con `Tab`/`Shift+Tab` desde el skip-link: verificar orden lógico, foco nunca oculto.
   - Abrir cada modal: comprobar atrapado de foco, cierre con `Escape` y **retorno del foco** al botón que lo abrió.
   - Verificar `Enter`/`Space` en todos los controles personalizados y que el nav móvil sea operable.
3. **Lector de pantalla (NVDA/VoiceOver):**
   - Confirmar nombre, rol y valor de estrellas de reseñas (individual y promedio), pestañas del Panel B2B y `radiogroup`.
   - Confirmar que al abrir un modal no se lee el fondo (`inert`).
   - Verificar que no hay controles duplicados/etiquetas mal asociadas en `/mis-reservas` y `/admin` con el modal de login abierto.
4. **Navegación y anclas:**
   - Probar «Confianza» (navbar y footer) desde `/`, `/experiencias` y `/experiencias/:id` → debe desplazarse a `#confianza`.
5. **Responsive real (DevTools/emulador):** medir con `document.documentElement.scrollWidth > clientWidth` en **320, 390, 768 y 1440 px** en todas las rutas y con modales abiertos; revisar particularmente navbar autenticado+admin a 768 px, tablas de admin y la pista de favoritos.
6. **Objetivos táctiles:** medir con regla las acciones pequeñas (tokens demo, «Más detalles», «Revocar Admin», cierre de `AdminUserModal` `h-9 w-9` = 36 px) contra 2.5.8 (24 px) y, si se busca AAA, 2.5.5 (44 px).
7. **Estados dinámicos:** forzar errores de API y de validación para confirmar `role="alert"` + `aria-invalid`/`aria-describedby` y anuncios correctos; verificar resultados del catálogo con `aria-live`.
8. **`prefers-reduced-motion`:** activar la preferencia del SO y comprobar que el scroll del héroe no es suave y que no hay animaciones.
9. **Contexto seguro (B-5):** abrir el checkout sobre `http://` no-localhost y confirmar que la reserva no falla por `crypto.randomUUID`.
10. **Regresión de estilo/otros:** `npm run lint` y `npm run build` deben seguir sin errores tras los cambios.

---

### Anexo — Ratios de contraste calculados

| Par (texto / fondo) | Ratio | ¿AA texto normal (4,5:1)? |
|---|---|---|
| `#ffffff` / `#d97706` (btn-primary fin) | 3,19:1 | ❌ |
| `#c45c26` / `#ffffff` (volcano texto) | 4,28:1 | ❌ |
| `#ffffff` / `#c45c26` (btn-primary inicio) | 4,28:1 | ❌ |
| `#c45c26` / `#f9efe9` (volcano sobre volcano/10) | 3,78:1 | ❌ |
| `#6e7f79` / `#ffffff` (slate/80) | 4,22:1 | ❌ |
| `#4a5f58` / `#ffffff` (slate) | 6,84:1 | ✅ |
| `#4a5f58` / `#e2ebe8` (slate sobre mist) | 5,63:1 | ✅ |
| `#0e4d6e` / `#ffffff` (pacific) | 9,11:1 | ✅ |
| `#1a5c45` / `#ffffff` (andes) | 7,89:1 | ✅ |
| `#ffffff` / `#0e4d6e` (blanco sobre pacific) | 9,11:1 | ✅ |
| `#e2ebe8` / `#0f1f1a` (mist sobre ink) | 14,04:1 | ✅ |
| `#8e9996` / `#0f1f1a` (mist/60 sobre ink) | 5,80:1 | ✅ |
| `#92400e` / `#fef3c7` (amber-800/100) | 6,37:1 | ✅ |
| `#e2ebe8` / `#ffffff` (borde mist, 1.4.11) | 1,22:1 | ❌ (necesita 3:1) |
| `#c45c26` / `#ffffff` (outline de foco) | 4,28:1 | ✅ (necesita 3:1) |

*Fin del informe.*
