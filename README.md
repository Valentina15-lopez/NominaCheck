# PeluDEV

Portafolio construido con Next.js 15 (App Router), TypeScript estricto y Tailwind CSS v4.

## Stack

- Next.js 15 · App Router · TypeScript
- Tailwind CSS v4
- ESLint + Prettier
- Lucide React, `clsx` y `tailwind-merge` (`cn()`)

## Desarrollo

```bash
cp .env.example .env.local
npm install
npm run dev
```

Scripts principales:

- `npm run dev`: servidor local con Turbopack.
- `npm run build`: build optimizado de producción.
- `npm run start`: ejecuta el build de producción.
- `npm run lint`: valida ESLint.
- `npm run typecheck`: valida TypeScript estricto.
- `npm run format:check`: comprueba el formato con Prettier.

## CI/CD

El workflow de GitHub Actions valida formato, lint, tipos y build en cada pull
request y push a `main`.

Para activar los despliegues continuos:

1. Publicá este repositorio en GitHub y verificá que la rama de producción sea
   `main`.
2. En Vercel, elegí **Add New > Project**, importá el repositorio y conservá el
   preset detectado de Next.js.
3. Configurá `NEXT_PUBLIC_SITE_URL` con el dominio de producción. Agregalo tanto
   al entorno **Production** como a **Preview** si querés metadatos absolutos
   correctos en ambos.
4. Desplegá el proyecto. Vercel creará previews para las ramas y pull requests,
   y publicará producción con cada cambio en `main`.
5. En GitHub, protegé `main` y exigí que el job **Lint, types and build** termine
   correctamente antes de permitir el merge.

No es necesario guardar tokens de Vercel en GitHub cuando se utiliza la
integración nativa de Vercel con GitHub.
