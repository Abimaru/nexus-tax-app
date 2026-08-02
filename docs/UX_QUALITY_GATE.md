# Quality gate visual

Claude y Codex deben inspeccionar las pantallas existentes antes de crear una
nueva y reutilizar el lenguaje visual de NexusTax. Deben preferir composición,
jerarquía y componentes compartidos frente a formularios planos o listas
técnicas.

Antes de cerrar cualquier funcionalidad visual se verifica:

1. Jerarquía visual y agrupación por intención.
2. Espaciado consistente y acción primaria evidente.
3. Etiquetas humanas; ningún enum interno visible.
4. Estados vacío, carga, error, éxito y deshabilitado.
5. Ayudas breves y consecuencias antes de acciones destructivas.
6. Navegación por teclado y foco visible.
7. Responsive sin scroll horizontal accidental.
8. Reutilización de patrones y componentes existentes.
9. Coherencia en tema oscuro y soporte del tema claro.
10. Contraste y estados que no dependan solo del color.
11. Respeto por `prefers-reduced-motion`.
12. Revisión visual con Playwright y capturas sintéticas de escritorio y móvil.
13. Rendimiento razonable y ausencia de renders innecesarios evidentes.
14. Una pantalla no se considera completa únicamente porque compile.

Las capturas son artefactos locales de Playwright y no deben contener datos
reales ni agregarse al repositorio.
