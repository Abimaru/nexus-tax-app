# Laboratorio documental

## Propósito

El laboratorio permite inspeccionar un PDF local por página, ejecutar OCR bajo demanda y convertir
una selección humana en candidato revisable. Nunca escribe directamente en la matriz tributaria.

## Flujo

1. Elegir documento y página.
2. Revisar diagnóstico y recomendación.
3. Decidir si se ejecuta OCR.
4. Comparar texto nativo y OCR sin fusionar contradicciones.
5. En modo avanzado, activar capas o marcar una zona por arrastre.
6. Crear un candidato manual asistido.
7. Confirmarlo, corregirlo o rechazarlo en Revisión de extracción.

Las tareas del expediente pueden abrir directamente el documento y la página correspondiente.

## Editor de zonas

El overlay convierte el arrastre a coordenadas relativas 0–1, independientes de la resolución de
renderizado. El rectángulo se identifica también mediante trazo punteado y texto accesible. Como
alternativa a arrastrar, el botón **Usar página completa como zona** permite operar con teclado.
Una zona nueva se guarda en un perfil en borrador como zona de totales/campo valor; cambiar su
semántica detallada sigue siendo una decisión humana posterior.

## Estados y fallos

Carga, lectura, renderizado, reconocimiento, cancelación, fallo y resultado tienen estados visibles.
Un fallo ofrece reintento, menor resolución o texto nativo. El registro manual permanece disponible
cuando no hay texto utilizable.

## Accesibilidad y temas

Controles con nombre accesible, foco global visible, estados con texto y forma además de color,
alternativa de teclado para zonas, sin scroll horizontal en 390 px y colores semánticos en ambos
temas. Los `<option>` nativos usan superficie y texto del tema para evitar listas blancas ilegibles.
