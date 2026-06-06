# Decisiones tecnicas y agentes Codex

Este documento fija la pila tecnologica inicial y el modelo de trabajo con agentes para implementar el simulador de branch predictors descrito en `docs/REQUISITOS.md` y `docs/ARQUITECTURA.md`.

## 1. Decision ejecutiva

Implementaremos una aplicacion web local con un nucleo de simulacion puro en TypeScript, una interfaz React y una estructura modular por capas.

La decision favorece:

- Un unico lenguaje principal para dominio, aplicacion, infraestructura y UI.
- Pruebas rapidas del motor sin navegador.
- Tipado fuerte para configuraciones de predictores, trazas y YAML.
- Distribucion sencilla como carpeta local exportable.
- Extension futura hacia Tournament, TAGE, pipeline, ROB y pila de retorno sin rehacer la UI.

## 2. Pila tecnologica

| Area | Tecnologia | Decision |
| --- | --- | --- |
| Lenguaje principal | TypeScript | Lenguaje unico del producto. Tipado estricto para dominio y contratos. |
| Build/frontend | Vite | Arranque rapido, aplicacion local, poca ceremonia. |
| UI | React | Buen ecosistema para tablas, editores, estado e i18n. |
| Componentes UI | MUI Material UI | Encaja con el estilo Android/Material solicitado. |
| Estado de UI | Zustand | Estado simple y explicito para sesion, modo, ejecucion y paneles. |
| Datos servidor/async | TanStack Query, solo si hace falta | Probablemente prescindible en v1 al ser app local sin backend. |
| Tablas | TanStack Table | Tablas dinamicas por predictor, columnas configurables y renderizado controlado. |
| Editores de codigo | Monaco Editor | Buena experiencia para C y RISC-V, resaltado y bloqueo del editor C. |
| Validacion | Zod | Validar YAML, plantillas oficiales, configs y formularios. |
| YAML | yaml | Importar/exportar sesiones visibles para el usuario. |
| i18n | i18next + react-i18next | ES/EN con catalogos separados y claves estables. |
| Export CSV | PapaParse o generador propio simple | CSV desde proyecciones, no desde DOM. |
| Export Markdown | Generador propio | Es suficientemente simple y mantiene control educativo. |
| Export imagen | html-to-image en v1.1 | Posponer salvo que quede tiempo; no bloquea la v1. |
| Testing unitario | Vitest | Ideal para dominio puro TypeScript y Vite. |
| Testing UI | Testing Library | Tests de componentes y flujos criticos sin sobreactuar. |
| Testing e2e | Playwright | Verificar flujos locales completos y capturas cuando haya UI. |
| Formato/lint | ESLint + Prettier | Calidad basica y consistencia. |
| Documentacion interna | Markdown + Mermaid | Ya esta alineado con la arquitectura actual. |

La politica detallada de pruebas y QA queda fijada en `docs/POLITICA_QA.md`. Ese documento es vinculante para implementar clases, casos de uso, adaptadores, componentes y flujos.

## 2.1 Autoridad documental

La implementacion y los agentes obedecen esta jerarquia:

1. `docs/REQUISITOS.md`: fuente de verdad maxima. No se modifica salvo instruccion explicita del usuario.
2. `docs/ARQUITECTURA.md`: arquitectura de referencia. Cualquier cambio requiere confirmacion explicita del usuario.
3. `docs/POLITICA_QA.md`: politica de testing y QA. Cualquier cambio requiere confirmacion explicita del usuario.
4. `docs/DECISIONES_TECNICAS_Y_AGENTES.md` y `.codex/AGENTES.md`: decisiones operativas que deben derivar de los documentos anteriores.
5. `README.md`, scaffold y codigo: deben obedecer a todos los documentos superiores.

Reglas de gobierno:

- La mayoria de agentes tiene prohibido editar documentos de diseno y gobernanza.
- Los workers no pueden tocar `docs/REQUISITOS.md`, `docs/ARQUITECTURA.md`, `docs/POLITICA_QA.md`, `docs/DECISIONES_TECNICAS_Y_AGENTES.md` ni `.codex/AGENTES.md`.
- Los explorers no modifican archivos salvo encargo explicito.
- Si una tarea contradice requisitos, se detiene y se pregunta al usuario.
- Si una tarea requiere cambiar arquitectura o politica QA, se pide confirmacion textual antes de editar.
- Si hay conflicto entre documentos, gana el de mayor autoridad.

## 3. Tecnologias descartadas

| Opcion | Motivo |
| --- | --- |
| Next.js | No necesitamos SSR, rutas servidor ni backend. Vite es mas ligero para una web local. |
| Angular | Robusto, pero demasiado pesado para el alcance y menos agil para iterar con Codex. |
| Vue/Svelte | Viables, pero React + MUI + TanStack ofrece mejor encaje con tablas, editores y ecosistema. |
| Python backend | Anade una frontera innecesaria. El motor puede vivir puro en TypeScript. |
| Rust/WASM | Interesante para rendimiento, innecesario para las trazas educativas de v1. |
| Electron | No hace falta empaquetar escritorio en v1; una web local basta. |

## 4. Estructura propuesta del proyecto

```text
.
+-- src/
|   +-- domain/
|   |   +-- predictors/
|   |   +-- simulation/
|   |   +-- stats/
|   |   +-- correction/
|   |   +-- source/
|   +-- application/
|   |   +-- use-cases/
|   |   +-- ports/
|   |   +-- projectors/
|   +-- infrastructure/
|   |   +-- persistence/
|   |   +-- templates/
|   |   +-- export/
|   |   +-- i18n/
|   +-- presentation/
|   |   +-- components/
|   |   +-- screens/
|   |   +-- stores/
|   |   +-- theme/
|   +-- test/
+-- public/
|   +-- templates/
+-- docs/
+-- .codex/
+-- package.json
```

Regla de dependencia:

```text
presentation -> application -> domain
infrastructure -> application/domain
domain -> nada externo de UI, YAML, LocalStorage o React
```

## 5. Decisiones v1

- Retroceso paso a paso: entra en v1 mediante historial de snapshots/traza, no con patron Command completo.
- Exportacion a imagen: se pospone a v1.1 salvo que quede margen; CSV y Markdown entran primero.
- Margen por defecto para porcentajes: `0.5%` absoluto, configurable por plantilla.
- Parser RISC-V inicial: `beq`, `bne`, `blt`, `bge`, `bgt`, `ble`, `beqz`, `bnez`, etiquetas, direcciones opcionales hexadecimales y comentarios.
- Traductor C inicial: didactico, no compilador real; cubre bucles, condicionales, enteros, flotantes basicos y operaciones aritmeticas simples.
- Plantillas oficiales: datos versionados en YAML/JSON validados con Zod y ejecutados por `TemplateValidator`.

## 6. Equipo de agentes

Usaremos agentes de Codex solo para tareas separables. El programador jefe mantiene la arquitectura, integra cambios y toma decisiones finales.

| Agente | Tipo Codex | Responsabilidad | Cuando usarlo |
| --- | --- | --- | --- |
| Guardian documental | `explorer` | Revisar coherencia entre requisitos, arquitectura, politica QA, decisiones operativas y codigo. No modifica archivos. | Antes de hitos, cambios de alcance, cambios de arquitectura, cambios de testing o dudas entre documentos. |
| Guardian SOLID y patrones | `explorer` | Revisar SRP, OCP, LSP, ISP, DIP, patrones documentados, dependencias entre capas y oportunidades de refactor. No modifica archivos. | Durante hitos de dominio/aplicacion, antes de introducir abstracciones nuevas, antes de cerrar hitos grandes o cuando aparezca deuda estructural. |
| Arquitecto revisor | `explorer` | Revisar requisitos, detectar inconsistencias y riesgos. | Antes de cambios grandes o al cerrar hitos. |
| Motor de simulacion | `worker` | Implementar `domain/predictors`, `simulation`, `stats`. | Cuando haya contratos definidos y tests esperados. |
| Diseno UX academico | `explorer` | Revisar flujos, wireframes, jerarquia de informacion, modo examen/solucion, estados vacios, errores y claridad pedagogica. | Antes de pantallas nuevas, tablas complejas o cambios de interaccion. |
| QA Visual Material | `explorer` o `worker` | Revisar coherencia MUI, densidad de tablas, responsive, contraste, i18n visual y capturas Playwright. | Antes de cerrar hitos de UI o cambios visuales relevantes. |
| UI Material | `worker` | Implementar pantallas, tablas, editores y estados visuales. | Cuando el dominio exponga casos de uso estables. |
| Persistencia | `worker` | YAML, validacion Zod, repositorios de sesion y borrador. | En paralelo al motor, con contratos cerrados. |
| Plantillas oficiales | `worker` | Extraer y versionar ejercicios 1, 2, 3, 4, 5 y 7 desde `ref_docs/Problemas.pdf`. | Cuando el esquema de plantilla este definido. |
| QA unitario | `worker` | Crear y mantener tests Vitest de clases, funciones puras, predictores, parsers, reglas y calculadoras. | Al terminar cada clase o unidad funcional. |
| QA integracion | `worker` | Crear y mantener tests de casos de uso, puertos fake, repositorios, validacion de plantillas y formatos. | Al terminar cada caso de uso o adaptador. |
| QA e2e | `worker` | Crear y mantener tests Playwright de flujos locales completos y capturas cuando haya UI. | Al cerrar flujos de usuario o hitos de UI. |
| QA revisor | `explorer` | Revisar cobertura, riesgos, dependencias entre capas y huecos frente a requisitos. | Antes de cerrar hitos o integrar cambios criticos. |
| i18n y contenido | `worker` | Catalogos ES/EN, textos de UI y enunciados. | Cuando la UI tenga claves estables. |

## 7. Como configurarlos aqui en Codex

En este entorno los agentes se lanzan desde la conversacion cuando el programador jefe los necesita. No tienes que instalar nada adicional si la herramienta `multi_agent_v1` esta disponible.

Forma de pedirlo:

```text
Usa agentes para dividir esta tarea:
- worker Motor: implementa predictores de un nivel y tests.
- worker UI: crea configurador de predictor y tabla base.
- worker Plantillas: convierte ejercicios oficiales del PDF en plantillas validadas.
- explorer QA: revisa riesgos de arquitectura y cobertura.
```

Reglas de uso:

- Antes de cambios grandes o dudosos se puede lanzar `Guardian documental` para validar coherencia sin editar archivos.
- El `Guardian SOLID y patrones` trabaja junto al `Guardian documental`: puede proponer refactors, pero si una propuesta toca alcance, arquitectura documentada o politica QA, debe marcarla para revision documental antes de implementarla.
- El `Guardian SOLID y patrones` no bloquea por preferencias esteticas de codigo; prioriza riesgos estructurales, acoplamiento, violaciones SOLID, patrones mal aplicados y refactors que reduzcan complejidad real.
- El `QA revisor` manda sobre cobertura, gates, huecos de prueba y riesgos de verificacion.
- El `Arquitecto revisor` manda sobre coherencia tecnica amplia, separacion de capas, contratos y encaje con la arquitectura documentada.
- Cada `worker` debe recibir una zona de propiedad clara para evitar conflictos.
- Ningun `worker` puede editar documentos de diseno o gobernanza.
- Ningun agente debe revertir cambios de otros.
- Los agentes de implementacion deben devolver rutas de archivos modificadas.
- Cada clase nueva o modificada debe cerrar con test unitario actualizado, salvo que sea una pieza puramente declarativa justificada por el jefe.
- Cada caso de uso implementado debe cerrar con test de integracion.
- Los flujos de UI criticos deben cerrar con tests de componente y, cuando exista app ejecutable, Playwright.
- El jefe revisa, integra y ejecuta pruebas antes de dar por cerrado el trabajo.

Prompt base recomendado para un worker:

```text
Eres un worker de Codex en este proyecto. No estas solo en el codebase:
no reviertas cambios ajenos y adapta tu trabajo a lo existente.

Responsabilidad: [modulo o archivos concretos].
Objetivo: [resultado verificable].
Restricciones: sigue docs/ARQUITECTURA.md y docs/POLITICA_QA.md, usa TypeScript estricto y no metas logica de dominio en React.
No edites documentos de diseno o gobernanza salvo encargo explicito del jefe tras confirmacion del usuario.
Entrega: modifica archivos directamente y termina indicando rutas cambiadas y pruebas ejecutadas.
```

Prompt base recomendado para un explorer:

```text
Eres un explorer de Codex. Revisa solo este aspecto: [pregunta concreta].
No modifiques archivos. Devuelve hallazgos priorizados, riesgos y referencias a documentos o codigo.
```

Prompt recomendado para Guardian SOLID y patrones:

```text
Eres el Guardian SOLID y patrones de Codex.
No modifiques archivos.
Revisa SRP, OCP, LSP, ISP, DIP, patrones documentados en docs/ARQUITECTURA.md,
dependencias entre capas, duplicacion accidental y deuda tecnica estructural.
Coordina tus hallazgos con el Guardian documental: si una recomendacion contradice
docs/REQUISITOS.md, docs/ARQUITECTURA.md o docs/POLITICA_QA.md, marcala como
decision documental y no como refactor directo.
Devuelve hallazgos P1/P2/P3 con rutas, principio/patron afectado, recomendacion,
seguridad del cambio y tests protectores.
```

## 8. Primera division de trabajo recomendada

1. Jefe: crear esqueleto Vite + TypeScript, capas y contratos base.
2. Explorer Guardian documental: validar que el primer hito respeta requisitos, arquitectura y politica QA sin modificar archivos.
3. Explorer Guardian SOLID y patrones: revisar contratos base, patrones y dependencias sin modificar archivos.
4. Worker Motor: implementar contadores saturantes, outcomes, branch sequence, predictor de un nivel y tests.
5. Worker Persistencia: definir esquemas Zod para sesion, predictor config y repositorios YAML.
6. Worker Plantillas oficiales: convertir ejercicios 1, 2, 3, 4, 5 y 7 de `ref_docs/Problemas.pdf` a datos versionados.
7. Explorer Diseno UX academico: revisar layout Material, densidad academica, accesibilidad basica y comportamiento esperado de editores/tabla antes de implementar pantalla.
8. Worker UI: montar layout Material con editores, configurador y tabla vacia conectada a store.
9. Worker QA unitario/integracion: completar tests faltantes del bloque si no quedaron incluidos por los workers de implementacion.
10. Explorer QA revisor: revisar si las dependencias respetan la regla de capas y si las plantillas reproducen las soluciones oficiales.

## 9. Dudas abiertas para confirmar con el usuario

- Confirmar si la prioridad academica es fidelidad a los ejercicios UCM o experiencia visual; mi recomendacion es fidelidad primero.
- Confirmar si quieres que la v1 sea solo navegador local o si mas adelante empaquetamos con Electron/Tauri.
