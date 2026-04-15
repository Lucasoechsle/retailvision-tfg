# RetailVision

Plataforma B2B de retail analytics con computer vision.

## Stack

- **Frontend/Backend:** Next.js 14 (App Router), Tailwind CSS, Shadcn/ui, Recharts, Zustand
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS) - Pendiente Fase 2
- **Edge/Vision:** Python 3.10+, YOLO v8, ByteTrack - Pendiente

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura del Proyecto

```
app/
├── (auth)/          # Rutas de autenticación
├── (dashboard)/     # Rutas del dashboard
└── api/             # API endpoints

components/
├── ui/              # Componentes Shadcn/ui
├── dashboard/       # Componentes del dashboard
└── shared/          # Componentes compartidos

lib/
└── supabase/        # Configuración Supabase

stores/              # Zustand stores
types/               # TypeScript types
```

## Progreso

- [x] Fase 1: Scaffold del proyecto
- [ ] Fase 2: Configuración Supabase
- [ ] Fase 3: Endpoints de ingesta
- [ ] Fase 4: Dashboard UI
- [ ] Fase 5: Pipeline de visión (Python)
