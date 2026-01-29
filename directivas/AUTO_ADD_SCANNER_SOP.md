# SOP: AUTO-AGREGADO POR ESCÁNER (FÉNIX V6.1)

> **Escenario**: El cajero usa un escáner de códigos de barras para agilizar la venta.

## Lógica de Funcionamiento
1. **Escucha en Tiempo Real**: El sistema vigila el input de búsqueda continuamente (sin esperar el debounce de 300ms de la lista visual).
2. **Match Exacto**: Si el texto ingresado coincide exactamente con el código de un producto en la base de datos maestra:
   - Se activa el disparador de agregado.
   - El producto entra a la cesta con la cantidad configurada en el multiplicador (por defecto 1).
   - Se limpia el buscador automáticamente.
3. **Optimización con Enter**: Para escáneres que envían la tecla `Enter`, la lógica de teclado realiza una búsqueda de emergencia para asegurar que el lag del filtrado no impida el agregado del ítem.

## Restricciones Técnicas
- **Unicidad**: Se recomienda que los códigos de barras de los productos sean únicos.
- **Longitud**: Se priorizan códigos de longitud estándar (>3 caracteres) para evitar colisiones con atajos de comando.
