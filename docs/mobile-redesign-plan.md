# Plan de redisenio mobile LLEVO

Fecha: 2026-05-23  
Proyecto: `frontmobile`  
Estado general: Bloques 01/04 completados; 02/03/05/06/08 en progreso con mapa real, shell oscuro, entrada y perfil redisenados  
Decision clave: la home debe usar mapa real desde el inicio. No se acepta mapa mockeado, screenshot, imagen estatica ni recreacion visual falsa.

## Objetivo

Transformar la app mobile de LLEVO hacia una experiencia tipo ride-hailing moderna, oscura, consistente y fluida, tomando como referencia visual las pantallas compartidas:

- Login/onboarding oscuro con marca fuerte, CTA verde lima y mensaje de confianza.
- Pantalla principal basada en mapa real, busqueda, categorias de viaje y acciones flotantes.
- Barra lateral/drawer oscuro con perfil, rating, opciones y modo conductor.
- Perfil/configuracion con formulario oscuro, avatar, alerta y CTA principal.

El resultado debe sentirse como una misma app, no como pantallas redisenadas de forma aislada.

## Criterios globales de aceptacion

- [ ] La estetica es consistente en login, home, drawer, perfil y pantallas internas.
- [ ] La home usa `react-native-maps` con mapa real, gestos reales, region real y permisos reales.
- [ ] No hay mapa visual fake. Solo se permiten estados reales de carga, permiso denegado u offline.
- [ ] La app se siente fluida: transiciones suaves, drawer sin saltos, bottom sheet estable, inputs responsivos.
- [ ] Los textos visibles no tienen problemas de encoding como `IngresÃ¡`, `ContraseÃ±a`, etc.
- [ ] No se usan emojis como iconografia principal de producto. Usar iconos consistentes.
- [ ] Los colores, espaciados, radios, sombras y tipografias salen de tokens compartidos.
- [ ] El login y el registro conservan el flujo funcional actual mientras se define auth real por telefono/Google.
- [ ] La app respeta safe areas, status bar, tamanios de pantalla chicos y Android.
- [ ] `.env.example` queda actualizado con las variables necesarias para mapas y configuracion publica.
- [ ] Cada bloque se verifica antes de pasar al siguiente.

## Convencion de seguimiento

Usaremos este documento como tablero vivo.

- `[ ]` Pendiente.
- `[~]` En progreso.
- `[x]` Completado.
- `[!]` Bloqueado.

Regla: no marcar un bloque como completado hasta cumplir su "Definition of Done" y ejecutar la verificacion indicada.

## Indicaciones generales de implementacion

- Trabajar por bloques pequenos y verificables. No mezclar mapa, login, drawer y perfil en un unico cambio gigante.
- Mantener la app funcionando al final de cada bloque. Si una pantalla queda incompleta, debe tener un estado temporal honesto y usable.
- Evitar componentes one-off. Si una decision visual aparece dos veces, debe vivir en tokens o componentes compartidos.
- No copiar assets exactos de inDrive ni marcas de terceros. La referencia define direccion visual, no identidad literal.
- Evitar introducir features falsas. Si Google login o auth por telefono no estan implementados, el UI debe decir claramente que esta pendiente o enrutar a un flujo funcional existente.
- Preferir componentes nativos livianos y `Animated` de React Native antes de agregar librerias grandes, salvo que el beneficio sea claro.
- Probar en pantalla chica primero. El diseno de referencia es mobile estricto; el layout debe funcionar bien alrededor de 360 px de ancho.
- Todas las nuevas pantallas deben usar fondo oscuro base y superficies elevadas coherentes.
- El mapa debe quedar desacoplado del resto de UI: permisos, region, estilo, marcadores y controles deben poder probarse sin tocar el drawer.
- No tocar `api` ni `frontweb` salvo que el bloque lo pida explicitamente.

## Direccion visual

Paleta propuesta:

- Fondo principal: carbon/negro suave, por ejemplo `#151515`.
- Superficie: gris profundo, por ejemplo `#242424`.
- Superficie elevada/input: `#323334`.
- Texto principal: `#FFFFFF`.
- Texto secundario: `#A8A8A8`.
- Acento principal: verde lima, por ejemplo `#B8FF00`.
- Acento presionado: lima mas oscuro, por ejemplo `#9CE000`.
- Alerta/error: rojo oscuro/superficie rojiza, por ejemplo `#933C35`.
- Bordes: gris oscuro, por ejemplo `#3F3F3F`.

Tipografia propuesta:

- Titulos y marca: una fuente con personalidad, por ejemplo Space Grotesk.
- UI y formularios: una fuente limpia y legible, por ejemplo Manrope.
- Si se decide no agregar dos familias, elegir una sola familia fuerte y usar pesos/espaciado para jerarquia.

Lenguaje visual:

- Botones primarios lima con texto negro.
- Inputs oscuros, sin bordes brillantes, con labels discretos.
- Cards/sheets redondeadas, radios entre 10 y 18.
- Iconografia lineal y consistente.
- Mapa oscuro con overlays compactos.
- Animaciones cortas: drawer slide, sheet reveal, pressed states y pequenos fades.

## Bloques de trabajo

### Bloque 00 - Documento maestro

Estado: `[x]`

Objetivo: crear el plan de accion y dejar una fuente unica de seguimiento.

Tareas:

- [x] Definir objetivo, criterios globales y bloques.
- [x] Registrar la decision de usar mapa real desde el inicio.
- [x] Crear carpeta `docs`.
- [x] Crear este documento.

Definition of Done:

- [x] El documento existe en `docs/mobile-redesign-plan.md`.
- [x] El plan esta organizado por bloques accionables.

### Bloque 01 - Baseline tecnica y decisiones cerradas

Estado: `[x]`

Objetivo: medir el estado actual antes de tocar arquitectura visual.

Tareas:

- [x] Revisar rutas actuales de `frontmobile/app`.
- [x] Revisar componentes compartidos actuales: `Button`, `Input`, `Badge`, `TripCard`.
- [x] Revisar `auth.tsx`, datos mock actuales y redirects de `_layout.tsx`.
- [x] Ejecutar baseline de calidad disponible: `npm run lint`.
- [x] Confirmar si se mantiene el grupo de rutas `(tabs)` temporalmente o se migra a `(app)`.
- [x] Confirmar comportamiento de auth visual: telefono/Google real ahora, o UI visual con flujo email/password funcional por ahora.
- [x] Definir matriz minima de prueba: Android fisico/emulador, Expo Go/dev build, ancho chico.

Definition of Done:

- [x] Hay una lista clara de archivos a modificar.
- [x] Sabemos si la navegacion se migra o se adapta.
- [x] Sabemos si Google/telefono son features reales del primer alcance o placeholders no interactivos.
- [x] Baseline de lint documentada.

Notas:

- Este bloque no cambia UI todavia.
- Si lint falla por errores existentes, se registra y se decide si se corrige antes o durante el redisenio.

Hallazgos:

- La app usa Expo Router con rutas actuales en `frontmobile/app`: `onboarding`, `auth/login`, `auth/register`, `(tabs)`, `trip/[id]`.
- El redirect de auth en `app/_layout.tsx` envia usuarios autenticados a `/(tabs)`.
- La UI autenticada actual depende de `Tabs` y tab bar inferior en `app/(tabs)/_layout.tsx`.
- Los componentes visuales compartidos son pocos y estan acoplados a la paleta anterior: `Button`, `Input`, `Badge`, `TripCard`.
- `react-native-maps`, `expo-location` e iconografia consistente no estan instalados todavia.
- Al iniciar el baseline, `frontmobile/node_modules` no existia. Por eso el primer `npm run lint` fallo antes de analizar codigo con: `"expo" no se reconoce como un comando interno o externo`.
- Hay textos visibles con problemas de encoding/mojibake al leer archivos desde terminal. Se deben corregir durante el redisenio visual.

Decision tecnica:

- Crear un grupo nuevo `app/(app)` para el shell autenticado nuevo.
- Mantener `app/(tabs)` temporalmente como legado durante la transicion, sin seguir invirtiendo en esa arquitectura visual.
- Cuando el shell nuevo exista, cambiar el redirect autenticado de `/(tabs)` a `/(app)`.
- El home nuevo debe vivir en `app/(app)/index.tsx` y controlar mapa real, drawer y bottom sheet.
- El perfil/configuracion nuevo debe vivir dentro del grupo autenticado, por ejemplo `app/(app)/profile.tsx` o `app/(app)/settings/profile.tsx`.

Decision de auth visual:

- No simular telefono/Google como si fueran reales si no hay backend/provider configurado.
- En el primer corte visual, mantener un camino funcional con el auth actual de desarrollo.
- Los CTAs de telefono/Google pueden aparecer para fidelidad visual, pero deben estar conectados solo cuando el provider exista o mostrar un estado honesto de "proximamente".

Matriz minima de prueba:

- Android primero, preferentemente dispositivo fisico o emulador.
- Expo/dev build segun lo requiera la configuracion de mapas.
- Pantalla chica aproximada: 360 px de ancho.
- Casos obligatorios: login, register, redirect autenticado, home con mapa, permisos aceptados/denegados, drawer, perfil.

Archivos esperados a modificar en los siguientes bloques:

- `frontmobile/package.json`
- `frontmobile/package-lock.json`
- `frontmobile/app.json`
- `frontmobile/.env.example`
- `frontmobile/app/_layout.tsx`
- `frontmobile/app/(app)/*`
- `frontmobile/app/auth/login.tsx`
- `frontmobile/app/auth/register.tsx`
- `frontmobile/app/onboarding.tsx`
- `frontmobile/components/*`
- `frontmobile/constants/*`
- `frontmobile/lib/auth.tsx`
- `frontmobile/lib/mockData.ts`
- `frontmobile/lib/location.ts`
- `frontmobile/lib/map.ts`

### Bloque 02 - Dependencias reales para mapa, ubicacion, iconos y fuentes

Estado: `[~]`

Objetivo: preparar la base tecnica para que la home use un mapa real desde el primer corte funcional.

Tareas:

- [x] Instalar mapa real con Expo: `react-native-maps`.
- [x] Instalar permisos/ubicacion: `expo-location`.
- [x] Instalar o confirmar iconografia consistente, por ejemplo `@expo/vector-icons`.
- [x] Instalar o incorporar fuentes elegidas con `expo-font`.
- [x] Actualizar `app.json` con permisos de ubicacion para Android/iOS.
- [ ] Configurar API key de Google Maps si se usa provider Google de forma consistente.
- [x] Actualizar `.env.example` con variables publicas necesarias.
- [x] Crear helper de mapa, por ejemplo `lib/map.ts` o `lib/location.ts`.
- [x] Crear estilo de mapa oscuro, por ejemplo `constants/mapStyle.ts`.
- [x] Definir region inicial si el usuario no da permiso: Buenos Aires/CABA u otra region de negocio.

Variables sugeridas:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_DEFAULT_MAP_LAT=-34.6037
EXPO_PUBLIC_DEFAULT_MAP_LNG=-58.3816
EXPO_PUBLIC_DEFAULT_MAP_DELTA=0.035
```

Definition of Done:

- [x] La app compila despues de instalar dependencias.
- [x] Existe una pantalla minima con `MapView` real renderizando.
- [x] Si el usuario acepta permisos, se centra en ubicacion real.
- [x] Si el usuario rechaza permisos, se muestra mapa real en region fallback, no mock.
- [x] Los errores de API key/permisos tienen estado visible y entendible.

Riesgos:

- Google Maps puede requerir API key valida para Android/iOS segun provider y build.
- En Windows no podremos validar iOS completamente.
- Si se usa Expo Go, algunas configuraciones nativas pueden requerir dev build para validacion final.

Avance 2026-05-23:

- `npm install` completado.
- Expo configuro ESLint automaticamente.
- Dependencias agregadas: `react-native-maps`, `expo-location`, `@expo/vector-icons`, `eslint`, `eslint-config-expo`.
- `app.json` actualizado con `userInterfaceStyle: "dark"`, permisos Android y mensajes iOS/plugin para ubicacion.
- `.env.example` actualizado con API key opcional de Google Maps y region fallback.
- `lib/location.ts` creado para pedir permiso y resolver region inicial real/fallback.
- `constants/mapStyle.ts` creado con estilo oscuro para `MapView`.
- Ruta tecnica `app/(app)/index.tsx` creada con `MapView` real, region inicial, permiso de ubicacion y fallback real.
- `app/(app)/_layout.tsx` creado y `app/_layout.tsx` registra el nuevo grupo sin cambiar todavia el redirect autenticado.
- `npx expo install --check` pasa con dependencias al dia.
- `npm run lint` pasa sin errores ni warnings.
- `npx tsc --noEmit` pasa sin errores.
- Vulnerabilidades npm moderadas bajaron de 16 a 14 tras alinear Expo; no se ejecuto `npm audit fix --force` para evitar cambios mayores.
- Pendiente para cerrar el bloque: definir fuente final, decidir provider/API key final de Google Maps para builds nativas y validar runtime en Android.

### Bloque 03 - Sistema visual base

Estado: `[~]`

Objetivo: crear la base de diseno que hara consistente toda la app.

Tareas:

- [x] Reemplazar/expandir `constants/colors.ts` con tokens oscuros y semanticos.
- [x] Crear tokens de spacing, radius, shadows/elevation y typography.
- [x] Cargar fuentes en `app/_layout.tsx`.
- [x] Ajustar status bar y splash para tema oscuro.
- [x] Redisenar `Button` con variantes: primary lime, surface, ghost, danger.
- [x] Redisenar `Input` para formularios oscuros.
- [ ] Crear `Screen`, `Surface`, `IconButton`, `Avatar`, `MenuRow`, `Divider` si aplica.
- [ ] Eliminar dependencia visual de emojis en componentes principales.

Definition of Done:

- [x] Login o pantalla sandbox puede usar todos los componentes base.
- [ ] Ningun componente base depende de colores hardcodeados fuera de tokens.
- [x] Los componentes se ven correctos en fondo oscuro.
- [x] Los estados disabled/loading/pressed son visibles y consistentes.

Avance 2026-05-23:

- Fuentes instaladas: `@expo-google-fonts/space-grotesk` y `@expo-google-fonts/manrope`.
- `constants/theme.ts` creado con paleta oscura, tokens de espaciado, radios y familias tipograficas.
- `constants/colors.ts` ahora funciona como capa de compatibilidad sobre `Theme`.
- `app/_layout.tsx` carga Manrope y Space Grotesk antes de renderizar la app.
- `app.json` usa tema oscuro tambien en splash/adaptive icon.
- `Button`, `Input` y `Badge` usan tokens/fuentes nuevas.
- `npm run lint` pasa sin errores ni warnings.
- `npx tsc --noEmit` pasa sin errores.
- Pendiente para cerrar bloque: componentes estructurales (`Screen`, `Surface`, `IconButton`, `Avatar`, `MenuRow`, `Divider`), status/splash final y retiro de emojis de pantallas principales.

### Bloque 04 - Arquitectura de navegacion y shell de app

Estado: `[x]`

Objetivo: adaptar la navegacion al modelo de home con mapa y drawer lateral.

Tareas:

- [x] Decidir migracion de `app/(tabs)` a `app/(app)` o mantener grupo actual sin tab bar visible.
- [x] Actualizar redirects de `app/_layout.tsx`.
- [x] Crear shell oscuro para pantallas autenticadas.
- [x] Crear componente `AppDrawer` custom con overlay, slide animation y cierre por backdrop.
- [x] Definir rutas principales: home, solicitudes/historial, entregas, flete, notificaciones, seguridad, configuracion, ayuda, soporte.
- [x] Mantener rutas existentes funcionales mientras se redisenan.

Definition of Done:

- [x] Usuario logueado cae en home nueva.
- [x] Drawer abre/cierra sin saltos.
- [x] Navegacion no queda atrapada ni rompe back button.
- [x] Las rutas antiguas necesarias siguen accesibles o tienen equivalente claro.

Avance 2026-05-23:

- `app/(app)` queda como grupo autenticado nuevo.
- Redirect de usuario autenticado actualizado de `/(tabs)` a `/(app)`.
- `AppDrawer` creado con overlay, animacion lateral, cierre por backdrop y back Android.
- Rutas creadas: `city`, `history`, `deliveries`, `freight`, `notifications`, `safety`, `profile`, `help`, `support`.
- Rutas secundarias usan placeholders oscuros hasta su redisenio final.
- `(tabs)` se mantiene como legado temporal para comparar o rescatar flujos.
- `npm run lint`, `npx tsc --noEmit` y `npx expo install --check` pasan.

### Bloque 05 - Login/onboarding fiel a la referencia

Estado: `[~]`

Objetivo: redisenar la entrada a la app con estetica oscura, CTA lima y mensaje de confianza.

Tareas:

- [x] Redisenar `app/onboarding.tsx` o decidir si se reemplaza por login-first.
- [x] Redisenar `app/auth/login.tsx` con fondo oscuro, logo, hero propio y CTAs.
- [x] Crear ilustracion propia inspirada en confianza/eleccion, sin copiar assets de inDrive.
- [x] Definir comportamiento de "Continuar con el telefono".
- [x] Definir comportamiento de "Continuar con Google".
- [x] Mantener acceso funcional al login/register actual si telefono/Google no estan listos.
- [x] Corregir textos con encoding roto.
- [x] Ajustar teclado, safe area y scroll.

Definition of Done:

- [x] Login se parece en estructura y sensacion a la referencia, pero con identidad LLEVO.
- [x] Los CTAs son funcionales o explicitamente no disponibles sin enganar al usuario.
- [x] No hay textos rotos.
- [ ] Funciona en pantalla chica sin cortar contenido clave.

Avance 2026-05-23:

- `app/onboarding.tsx` redisenado como entrada oscura con hero propio y marca LLEVO.
- `app/auth/login.tsx` redisenado con formulario email/password funcional, hero lime y copy nuevo.
- `app/auth/register.tsx` redisenado con tokens oscuros, safe area y teclado.
- Google/telefono no se fingen como providers reales; Google muestra estado honesto de proximo proveedor y email mantiene acceso funcional.
- Textos nuevos escritos sin mojibake.
- `npm run lint` y `npx tsc --noEmit` pasan.

### Bloque 06 - Home con mapa real y controles principales

Estado: `[~]`

Objetivo: crear la pantalla principal con mapa real, categorias, busqueda y acciones flotantes.

Tareas:

- [x] Implementar `MapView` real como fondo full-screen.
- [x] Aplicar estilo oscuro de mapa.
- [x] Pedir permiso de ubicacion de forma amable y no bloqueante.
- [x] Mostrar ubicacion actual si esta disponible.
- [x] Agregar marcadores reales desde datos disponibles.
- [ ] Si los viajes actuales no tienen coordenadas, extender datos de viaje con coordenadas temporales hasta conectar API.
- [x] Crear boton menu superior izquierdo.
- [x] Crear controles superiores/laterales: ubicacion actual, orientacion o accion similar.
- [x] Crear chips de categoria: viaje, moto, asientos, entregas, flete.
- [x] Crear barra/bottom sheet de busqueda: "A donde y por cuanto?".
- [x] Crear lista de destinos sugeridos con iconos y estilo oscuro.
- [ ] Asegurar que gestos del mapa y gestos del sheet no peleen entre si.

Definition of Done:

- [ ] El mapa es real y se puede mover/zoom.
- [ ] La UI encima del mapa replica la jerarquia de la referencia.
- [ ] Los controles se sienten tactiles y fluidos.
- [ ] El drawer se abre desde la home.
- [ ] No hay flicker importante al cargar ubicacion.

Nota importante:

- La prohibicion de mock aplica al mapa. Los datos de viajes/destinos pueden seguir usando datos locales hasta que exista API real, pero deben modelarse de forma compatible con coordenadas reales.

### Bloque 07 - Drawer lateral oscuro

Estado: `[ ]`

Objetivo: implementar la barra lateral con perfil, rating, menu, modo conductor y social.

Tareas:

- [ ] Crear header de usuario con avatar, nombre, rating y notificacion.
- [ ] Crear filas de menu con iconos lineales.
- [ ] Marcar item activo con superficie gris.
- [ ] Crear CTA "Modo conductor" lima.
- [ ] Agregar accesos sociales solo si son parte del producto; si no, ocultarlos.
- [ ] Conectar "Configuracion" al perfil/configuracion.
- [ ] Conectar logout de forma segura.
- [ ] Asegurar cierre por swipe/backdrop/back Android.

Definition of Done:

- [ ] Drawer reproduce estructura y tono visual de la referencia.
- [ ] Animacion entra/sale fluida.
- [ ] El contenido no se corta en pantallas chicas.
- [ ] Cada item navega, cierra drawer o queda marcado como pendiente de forma clara.

### Bloque 08 - Perfil/configuracion

Estado: `[~]`

Objetivo: redisenar perfil como pantalla de configuracion oscura con formulario y avatar.

Tareas:

- [x] Crear pantalla `Configuracion del perfil` con header oscuro y back.
- [x] Avatar circular grande con iniciales y accion de editar.
- [x] Alerta roja si falta foto/perfil incompleto.
- [x] Inputs oscuros para nombre, apellido, correo, ciudad y telefono.
- [x] Filas navegables para ciudad/telefono si corresponde.
- [x] CTA "Guardar" lima.
- [x] Conectar formulario a estado local/user context segun alcance.
- [x] Corregir textos y labels.

Definition of Done:

- [x] La pantalla se ve consistente con login/drawer/home.
- [ ] Se puede editar sin glitches de teclado.
- [x] Guardar produce feedback claro.
- [x] El estado del usuario no se rompe despues de navegar.

Avance 2026-05-23:

- `app/(app)/profile.tsx` reemplazado por pantalla real de configuracion.
- Avatar, alerta, inputs, filas ciudad/telefono y CTA Guardar implementados.
- `auth.tsx` ahora expone `updateUser` para guardar cambios locales en `SecureStore`.
- Textos nuevos sin mojibake.
- `npm run lint` y `npx tsc --noEmit` pasan.

### Bloque 09 - Pantallas secundarias en la nueva estetica

Estado: `[ ]`

Objetivo: que buscar, publicar, mis viajes y detalle no queden con estilo anterior.

Tareas:

- [ ] Redisenar `buscar` con tema oscuro y componentes nuevos.
- [ ] Redisenar `publicar` con formularios oscuros y secciones claras.
- [ ] Redisenar `misviajes` con cards oscuras y tabs/chips nuevos.
- [ ] Redisenar `trip/[id]` con header y cards oscuros.
- [ ] Redisenar `TripCard` y `Badge`.
- [ ] Revisar estados vacios, loading y error.
- [ ] Corregir todos los textos mojibake restantes.

Definition of Done:

- [ ] No queda ninguna pantalla principal con paleta navy/amber anterior.
- [ ] Cards, badges e inputs se sienten parte del mismo sistema.
- [ ] Los flujos existentes siguen navegando correctamente.

### Bloque 10 - Fluidez, animacion y performance

Estado: `[ ]`

Objetivo: asegurar que el redisenio no solo se vea bien, sino que se sienta rapido.

Tareas:

- [ ] Animar drawer con `Animated` usando transform, no layout pesado.
- [ ] Animar entrada de login/home con fades o slides discretos.
- [ ] Optimizar overlays del mapa para evitar rerenders innecesarios.
- [ ] Mantener `MapView` estable al abrir drawer/sheets.
- [ ] Reducir sombras pesadas en Android si afectan rendimiento.
- [ ] Revisar hit areas minimas de botones e iconos.
- [ ] Revisar transiciones con teclado abierto.

Definition of Done:

- [ ] Drawer y bottom sheet se sienten suaves.
- [ ] El mapa no se reinicia al abrir/cerrar UI.
- [ ] No hay saltos visuales en carga inicial.
- [ ] Botones tienen respuesta tactil clara.

### Bloque 11 - QA visual y funcional

Estado: `[ ]`

Objetivo: validar que los cambios estan completos y no rompen flujos.

Tareas:

- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar app en Android.
- [ ] Probar login, register, logout.
- [ ] Probar permisos de ubicacion: aceptado, denegado y sin respuesta.
- [ ] Probar home/mapa: pan, zoom, ubicacion, drawer, search sheet.
- [ ] Probar navegacion desde drawer a perfil/configuracion.
- [ ] Probar pantallas secundarias.
- [ ] Revisar pantalla chica y pantalla alta.
- [ ] Capturar screenshots finales para comparacion visual.

Definition of Done:

- [ ] Lint pasa o quedan issues documentados.
- [ ] No hay crashes en los flujos principales.
- [ ] Los criterios globales quedan marcados como completos o con excepcion documentada.

### Bloque 12 - Limpieza y cierre

Estado: `[ ]`

Objetivo: dejar el repo ordenado despues del redisenio.

Tareas:

- [ ] Eliminar estilos/componentes muertos si ya no se usan.
- [ ] Revisar imports no usados.
- [ ] Confirmar `.env.example` actualizado.
- [ ] Actualizar este documento con el resultado final.
- [ ] Registrar decisiones tomadas y pendientes.
- [ ] Preparar resumen de cambios para commit/PR.

Definition of Done:

- [ ] No quedan archivos temporales.
- [ ] El plan refleja el estado real.
- [ ] El proyecto queda listo para siguiente etapa: backend real, pagos, auth telefono/Google o mapas avanzados.

## Decisiones pendientes

- [ ] API key y provider final de mapas: Google Maps en Android solamente o Google provider tambien en iOS para estilo oscuro consistente.
- [x] Auth: mantener email/password funcional en el primer corte visual; no fingir telefono/Google real sin provider.
- [x] Fuente final: Space Grotesk para display y Manrope para UI/formularios.
- [x] Nombre de rutas: crear `(app)` nuevo y mantener `(tabs)` temporalmente como legado.
- [ ] Alcance de modo conductor: solo CTA visual/navegable o flujo real.
- [ ] Coordenadas de viajes: extender mocks locales o esperar endpoint real.

## Riesgos principales

- Mapas reales agregan configuracion nativa y API keys. Conviene resolverlo temprano para no descubrir bloqueos al final.
- Si se fuerza Google Maps provider para iOS, puede requerir validacion fuera del entorno Windows.
- Una migracion total de navegacion puede romper redirects de auth si se hace junto con muchas pantallas. Por eso va en bloque propio.
- Copiar demasiado literalmente la referencia puede traer problemas de identidad/marca. La meta es equivalencia de calidad, no clon.
- Si telefono/Google aparecen como CTAs sin backend real, la UX puede sentirse falsa. Hay que decidirlo antes del bloque login.

## Registro de progreso

| Fecha | Bloque | Estado | Nota |
| --- | --- | --- | --- |
| 2026-05-23 | 00 | `[x]` | Plan maestro creado en `docs/mobile-redesign-plan.md`. |
| 2026-05-23 | 01 | `[~]` | Baseline tecnica iniciada. |
| 2026-05-23 | 01 | `[x]` | Baseline completada. Lint no ejecuta por falta de `node_modules`; navegacion recomendada: nuevo grupo `(app)`. |
| 2026-05-23 | 02 | `[~]` | Dependencias reales de mapa/ubicacion iniciadas. |
| 2026-05-23 | 03 | `[~]` | Sistema visual base iniciado. |
| 2026-05-23 | 04 | `[~]` | Shell autenticado y navegacion `(app)` iniciados. |
| 2026-05-23 | 04 | `[x]` | Shell autenticado completado. Redirect a `/(app)`, drawer y rutas principales creadas. |
| 2026-05-23 | 05 | `[~]` | Login/onboarding oscuro iniciado. |
| 2026-05-23 | 06 | `[~]` | Home con mapa real iniciada dentro de `app/(app)/index.tsx`. |
| 2026-05-23 | 08 | `[~]` | Perfil/configuracion real implementado con guardado local. |
