# Ascenda V10 · Validación

Validación realizada en entorno de revisión:

```text
npm install --package-lock=false
npm run build
```

Resultado:

```text
✓ 143 modules transformed
✓ built successfully
```

Advertencia no bloqueante:

```text
Some chunks are larger than 500 kB after minification.
```

No se incluyeron en el ZIP:
- node_modules
- dist
- .env.local
- .git
- .vercel
- claves privadas
