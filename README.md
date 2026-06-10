# Ascenda Web V6

Aplicación web de organización y desarrollo personal construida con React, Vite y Supabase.

## Novedades V6

- Agenda avanzada con vista diaria, semanal y mensual.
- Varias anotaciones libres por fecha con formato básico y autoguardado.
- Conversión de texto seleccionado o del contenido de una anotación en tarea o recordatorio.
- Notas independientes: búsqueda, fijado, archivado, categorías, colores y bloqueo con PIN.
- Cifrado local de notas bloqueadas mediante Web Crypto API, PBKDF2 y AES-GCM.
- Eventos con horarios, todo el día, color, ubicación, enlace, invitados como texto, estado y repetición.
- Recordatorios internos con sonidos, prioridad, repetición y posposición.
- Tareas con subtareas, etiquetas, XP final calculada y vista Kanban.
- Conservación de niveles, temporadas, rangos y estilos visuales de V5.

## Instalación

1. Copiar `.env.local` desde V5 a la raíz de este proyecto.
2. Ejecutar `supabase/schema.sql` completo desde Supabase > SQL Editor > New query > Run.
3. Ejecutar:

```powershell
npm install
npm run dev
```

4. Abrir la URL local que muestra Vite, normalmente `http://localhost:5173`.

## Prueba recomendada

1. Confirmar que continúan visibles los datos de V5.
2. Abrir Agenda y crear dos anotaciones para el día actual.
3. Escribir texto, aplicar negrita o lista y verificar el autoguardado.
4. Convertir texto en tarea y en recordatorio.
5. Crear un evento repetitivo y revisar las vistas Mes, Semana y Día.
6. Crear una nota independiente y otra nota bloqueada con PIN.
7. Abrir la nota bloqueada e ingresar su PIN.
8. Crear una tarea con subtareas y etiquetas; revisar Lista y Kanban.
9. Crear un recordatorio con sonido para unos minutos después y probar Posponer.

## Seguridad de notas con PIN

Las notas bloqueadas se cifran en el navegador antes de enviarse a Supabase. Supabase guarda el contenido cifrado, el vector de inicialización y la sal criptográfica; no guarda el PIN ni una copia legible del texto.

**Importante:** si el usuario olvida el PIN, no existe recuperación automática del contenido cifrado.

## Notificaciones

V6 incluye alertas internas, sonidos y uso de la API de notificaciones del navegador cuando existe permiso. La detección se realiza mientras la aplicación web está abierta. Para notificaciones confiables con la pestaña cerrada se requiere una etapa posterior con service worker o push desde backend.

## Compilación validada

```powershell
npm run build
```
