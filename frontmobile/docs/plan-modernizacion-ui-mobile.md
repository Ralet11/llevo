# Frontmobile Modernization Implementation

## Source Scope
- `frontmobile/app/_layout.tsx`, `app/index.tsx`, `app/onboarding.tsx`
- `frontmobile/app/auth/login.tsx`, `app/auth/register.tsx`
- `frontmobile/app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/buscar/index.tsx`, `app/(tabs)/publicar/index.tsx`, `app/(tabs)/misviajes/index.tsx`, `app/(tabs)/perfil/index.tsx`
- `frontmobile/app/trip/[id].tsx`
- `frontmobile/components/TripCard.tsx`, `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/Badge.tsx`
- `frontmobile/constants/colors.ts`, `frontmobile/lib/auth.tsx`, `frontmobile/lib/mockData.ts`, `frontmobile/package.json`

## Current Scope and Assumptions
- Objetivo: modernizar el look-and-feel del mobile sin cambiar todavia la propuesta funcional principal.
- El refresh es prioritariamente `frontmobile`; backend y contratos reales quedan fuera salvo ajustes menores de copy o shape visual.
- El codigo actual muestra tres problemas base: textos con encoding roto, iconografia basada en emojis y ausencia de design system reutilizable.
- La navegacion y los flujos ya existen; conviene redisenar sobre esa estructura en lugar de rearmar la app desde cero.

## Implementation Tasks Ordered by Importance

### 1. Fix Content Integrity and Visual Foundation
- Corregir todos los textos mojibakeados en pantallas y mocks.
- Reemplazar `constants/colors.ts` por tokens semanticos de color, fondo, borde, texto, estado y elevacion.
- Activar tipografias reales con `expo-font` en `app/_layout.tsx` y definir escala tipografica y spacing.
- Why it matters: elimina senales inmediatas de producto viejo y crea la base compartida para todo lo demas.
- Primary owner: `frontmobile`

### 2. Rebuild Shared UI Primitives
- Redisenar `Button`, `Input`, `Badge` y sumar primitives como `Screen`, `Card`, `SectionHeader`, `EmptyState`, `ListItem`, `IconButton`.
- Sustituir emojis por iconografia consistente.
- Normalizar estados `default`, `pressed`, `disabled`, `loading`, `error`, `success`.
- Why it matters: reduce drift visual y abarata cualquier rediseno posterior.
- Primary owner: `frontmobile`

### 3. Redesign Navigation Shell and First Impression Surfaces
- Rehacer `onboarding`, `login`, `register`, `app/index.tsx`, loading shell y `tabs/_layout.tsx`.
- Mejorar safe areas, tab bar, headers, fondo, ritmo vertical y jerarquia de CTA.
- Why it matters: estas pantallas definen la primera impresion y hoy concentran bastante look viejo.
- Primary owner: `frontmobile`

### 4. Redesign Core Demand Flow
- Replantear `home`, `buscar`, `TripCard` y `trip/[id]`.
- Convertir la home en una superficie mas editorial y confiable: hero, busqueda mas fuerte, solicitudes activas y trips destacados.
- Rehacer busqueda y detalle con mejor jerarquia de ruta, disponibilidad, confianza y CTA persistente.
- Why it matters: es el flujo principal para descubrir y reservar viajes o envios.
- Primary owner: `frontmobile`

### 5. Redesign Core Supply and Management Flow
- Modernizar `publicar` y `misviajes` con formularios por bloques, mejores toggles, sumario economico y estados claros.
- Ordenar mejor las listas de viajes propios y solicitudes por estado.
- Why it matters: publicar y gestionar viajes es la otra mitad del marketplace; no puede quedar visualmente atras.
- Primary owner: `frontmobile`

### 6. Redesign Profile and Trust Surfaces
- Rehacer `perfil` para que se vea mas premium y mas util: reputacion, resenas, verificacion, ganancias y acciones de cuenta.
- Consolidar patrones de tarjetas de confianza y menu de ajustes.
- Why it matters: perfil hoy comunica poco valor y poca sofisticacion.
- Primary owner: `frontmobile`

### 7. Add Polish, Motion, and Validation Pass
- Incorporar microanimaciones utiles, estados vacios, carga, error, teclado, accesibilidad y contraste.
- Ajustar consistencia en todos los tamanos de pantalla y plataformas.
- Why it matters: el look moderno no depende solo del mockup; depende del comportamiento en uso real.
- Primary owner: `frontmobile`

## Operational Delivery Blocks

### Block 1. Foundation and System
- Status: completed
- Tasks included: `1`, `2`
- Deliverable: tema visual, tipografia, iconografia y primitives listos para escalar

### Block 2. Entry Experience and App Shell
- Status: completed
- Tasks included: `3`
- Deliverable: onboarding, auth, tabs y loading con lenguaje visual nuevo

### Block 3. Core Marketplace Experience
- Status: completed
- Tasks included: `4`
- Deliverable: home, busqueda, cards y detalle de viaje alineados al nuevo estandar

### Block 4. Publishing and Account Surfaces
- Status: completed
- Tasks included: `5`, `6`
- Deliverable: publicar, mis viajes y perfil con el mismo nivel de calidad del core flow

### Block 5. Final UX Polish
- Status: implemented, pending manual QA
- Tasks included: `7`
- Deliverable: consistencia final, motion, accesibilidad y cierre de detalles

## Repo Ownership and Contract Impact
- Owner principal: `frontmobile`
- Contract impact inmediato: ninguno obligatorio si este trabajo se mantiene en refresh visual y de interaccion.
- Posibles dependencias futuras si se quiere subir el nivel de UX despues: autocomplete de rutas, datos reales de disponibilidad, perfil mas rico y estados de solicitud mas precisos.

## Frontend / UI Plan

### Scope
- Superficies publicas: `onboarding`, `login`, `register`
- Superficies autenticadas: `inicio`, `buscar`, `publicar`, `misviajes`, `perfil`
- Superficie de detalle: `trip/[id]`

### Product Goals
- Que la app se sienta confiable, actual y mas cercana a producto real que a MVP.
- Mejorar claridad de acciones clave: buscar, solicitar, publicar, gestionar.
- Subir percepcion de calidad sin expandir scope funcional.

### Visual Direction
- Mantener `navy` como color de confianza, pero con fondos mas limpios, bordes suaves y menos dependencia de sombras pesadas.
- Usar `amber` solo como acento y CTA, no como color dominante.
- Reemplazar emojis por iconos vectoriales y dar una tipografia mas marcada a titulos y metricas.
- Apostar por layout mas respirado, tarjetas mejor compuestas y encabezados con mas intencion visual.

### States That Must Be Designed
- `loading`, `empty`, `error`, `success`
- `pending`, `accepted`, `rejected`, `completed`, `full`
- formularios con foco, error y disabled
- estados sin sesion y con sesion recien creada

### Component Strategy
- Base layer: theme tokens, typography, spacing, radius, shadows
- Primitive layer: button, input, badge, card, screen shell, section title, tab icon, empty state
- Feature layer: trip card, route module, trust module, fee summary, request summary

## Testing and Validation Plan
- QA manual en Android e iOS con pantallas chicas y grandes.
- Verificar safe areas, teclado, scroll, tab bar y headers.
- Validar contraste, legibilidad, targets tactiles y consistencia de espaciado.
- Hacer regression pass de copy y encoding en toda la app.
- Revisar que el refresh no rompa auth mock, navegacion ni estados existentes.
- Checks tecnicos completados el 30 de abril de 2026: `npx tsc --noEmit` y `npm run lint`.
- Se agrego configuracion de ESLint para Expo en `frontmobile/eslint.config.js` y dependencias de lint en `package.json`.
- Pendiente para cerrar rollout visual: QA manual del modal de solicitud en `trip/[id]`, teclado y tamanos de pantalla en Android e iOS.

## Risks and Open Questions
- Falta decidir cuan premium versus cuan masivo se quiere el lenguaje visual de marca.
- Hay que elegir tipografia e icon set antes de redisenar multiples pantallas.
- Si el refresh se mezcla con cambios de producto, el scope se va a inflar rapido.
- Algunos modulos hoy viven sobre mocks; al conectar datos reales puede haber ajustes de densidad o estados.

## Rollout Recommendation
- Ejecutar primero `Block 1` y `Block 2`; ahi ya se obtiene un salto visible de calidad y se puede revisar la direccion visual antes de tocar todo el producto.
- Despues avanzar con `Block 3` como nucleo comercial y dejar `Block 4` y `Block 5` para consolidacion.
- La mejor secuencia de trabajo es validar diseno en `onboarding`, `auth`, `tabs` y `home` antes de propagar el sistema al resto.
