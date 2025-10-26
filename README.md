# Pensum Planner — Medicina (PWA)

PWA 100% frontend para planificar materias y horarios del pensum de Medicina (UTESA, pensum 2013).  
Funciona offline, visualiza prerequisitos/correquisitos y permite armar horarios sin choques.

## ✨ Características
- 🔎 Navegación por trimestre/área y electivas
- 🔗 Prerequisitos y correquisitos con validación (sin ciclos)
- 🕒 Secciones con horarios; verificación de choques
- 📦 Admin local (sin backend): CRUD de cursos y secciones
- 📥 Importar/📤 Exportar datasets (`courses.json`, `sections.json`)
- 📱 PWA: offline, manifest y Service Worker
- 🚀 Deploy en GitHub Pages

## 🧰 Stack
- Vite + React + TypeScript
- UI (shadcn/ui) + Tailwind
- Build a `dist/public/` para GitHub Pages
- Sin backend (provider local) — listo para agregar API en el futuro

## 📂 Estructura de datos
- `client/public/data/courses.json`
- `client/public/data/sections.json`  
  (array plano o `{ "courses": [{ "id": "MED101", "sections": [...] }, ...] }`)

## 🧪 Desarrollo
```bash
npm i
npm run dev

🛠️ Admin (local)

Acceso: /?admin=1 o localStorage.setItem('admin','1')

Funciones: editar cursos, prerrequisitos/correquisitos y secciones

Persistencia: usa Exportar JSON y reemplaza los archivos en client/public/data/* para subir cambios al repo

🚀 Deploy (GitHub Pages)

Ramas: main (código), gh-pages (build)

CI: ver .github/workflows/deploy.yml

SPA fallback: client/public/404.html (redirige a ./)

📸 Screenshots

Agrega capturas de: Home, Planner, Admin, vista móvil y desktop.

🧭 Roadmap

Paginación/búsqueda avanzada en Admin

Mejoras de accesibilidad

Code-splitting para reducir bundles

Provider de API (Express/Vercel Functions) opcional

📝 Licencia

**`medicina-pwa/client/public/404.html`**
```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=./" />
    <meta name="robots" content="noindex" />
  </head>
  <body></body>
</html>

## 📐 Design Guidelines
Consulta las guías de diseño y tokens de UI en [/docs/design_guidelines.md](./docs/design_guidelines.md).
