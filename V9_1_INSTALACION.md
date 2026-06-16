# Ascenda V9.1 · Focus y Finanzas

## 1. Copiar archivos

Extraé el ZIP y copiá todo su contenido sobre la raíz de tu proyecto actual.
Permití que Windows reemplace los archivos repetidos.

Archivos nuevos o modificados:

```text
package.json
src/components/DailyWelcomeModal.jsx
src/components/Dashboard.jsx
src/components/FinanceView.jsx
src/components/SettingsView.jsx
src/data/themePresets.js
src/lib/accountManagement.js
src/lib/finance.js
src/styles.css
supabase/migrations/V9_1_FOCUS_AND_FINANCE.sql
```

## 2. Compilar localmente

Desde la raíz del proyecto:

```powershell
pnpm install
pnpm run build
```

No sigas si el build falla.

## 3. Ejecutar migración en Supabase

Abrí:

```text
supabase/migrations/V9_1_FOCUS_AND_FINANCE.sql
```

Copiá todo y pegalo en:

```text
Supabase → SQL Editor → New query → Run
```

Resultado esperado:

```text
ASCENDA V9.1: MODO FOCUS y finanzas personales disponibles.
```

## 4. Verificar tablas

Ejecutá:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'finance_categories',
    'finance_transactions',
    'finance_monthly_goals'
  );
```

Deben aparecer las tres tablas.

## 5. Subir a GitHub

```powershell
git add .
git commit -m "Ascenda V9.1 Focus y finanzas"
git push
```

Esperá el deployment de Vercel en `Ready`.

## 6. Probar

1. Abrí Ascenda y revisá que la bienvenida no corte palabras.
2. Entrá a Configuración → Estilo del sistema → MODO FOCUS.
3. Guardá cambios y verificá la transformación oscura.
4. Entrá a Finanzas desde el menú lateral.
5. Cargá un ingreso, un gasto y un objetivo de ahorro.
6. Recargá la página y verificá que los datos se mantengan.
