# Ascenda V10 · Instalación

## 1. Copiar archivos
Copiar todo el contenido de este ZIP sobre la raíz del proyecto actual y permitir reemplazo de archivos.

## 2. Build local
```powershell
pnpm install
pnpm run build
```

## 3. Migración Supabase
En Supabase > SQL Editor > New query, ejecutar completo:

```text
supabase/migrations/V10_SIMPLE_ASSISTED_FOCUS.sql
```

Después ejecutar:

```sql
NOTIFY pgrst, 'reload schema';
```

## 4. Subir a GitHub/Vercel
```powershell
git add .
git commit -m "Ascenda V10 Simple Focus y Modo Asistido"
git push
```

Esperar Vercel en `Ready` y recargar con Ctrl+F5.

## 5. Pruebas recomendadas
- Cambiar a modo Simple y verificar inicio con letras grandes y pocos datos.
- Activar Modo Asistido en Configuración y abrir `+ Agregar algo`.
- Ver modal de Novedades V10 una vez.
- Revisar el tutorial inicial.
- Activar tema MODO FOCUS y probar no negociables + temporizador.
- Crear recordatorio rápido desde Inicio o Modo Asistido.
- Entrar a Finanzas en modo Simple y revisar resumen básico.
- Entrar a Avisos y revisar prioridades automáticas e historial interno.
