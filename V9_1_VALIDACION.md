# Validación V9.1

Controles realizados sobre el paquete incremental:

- Se trabajó sobre el ZIP V9 recibido.
- No se incluyeron `node_modules`, `dist`, `.env.local`, `.git`, `.vercel` ni secretos.
- Se agregó `FinanceView.jsx` y `src/lib/finance.js`.
- Se agregó la migración `V9_1_FOCUS_AND_FINANCE.sql`.
- Se actualizó el export de datos para incluir tablas financieras.
- Se redujo y corrigió la bienvenida diaria para evitar cortes palabra por palabra.
- Se agregó el tema `focus` al catálogo de temas visuales.
- Se agregó `Finanzas` al menú lateral.

Control de sintaxis realizado:

```text
node --check src/lib/finance.js
node --check src/data/themePresets.js
node --check src/lib/accountManagement.js
```

El build final debe ejecutarse en la PC del usuario con:

```powershell
pnpm run build
```
