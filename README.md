# Pichangas - App de Gestión de Partidos de Fútbol

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwind-css" alt="Tailwind">
</div>

---

## 📋 Descripción

**Pichangas** es una aplicación web para gestionar partidos de fútbol con amigos. Permite crear encuentros, invitar jugadores, registrar goles, votar al MVP y consultar estadísticas históricas.

### Características Principales

- 🔐 **Autenticación** - Login/registro con email y contraseña usando Supabase Auth
- 📅 **Gestión de Partidos** - Crear partidos con fecha, hora, cancha y cantidad de jugadores
- 👥 **Sistema de Invitaciones** - Invitar jugadores a partidos y gestionar aceptaciones
- ⚽ **Registro de Goles** - Interfaz intuitiva para registrar goles con selección de equipo y jugador
- ⭐ **Votación MVP** - Al finalizar el partido, los jugadores pueden votar al mejor jugador
- 📊 **Estadísticas** - Historial de partidos jugados, ganados, perdidos, goles y MVPs
- 🌙 **Modo Oscuro** - Soporte completo para tema claro y oscuro con toggle switch
- 📱 **Diseño Responsivo** - Funciona en móviles y escritorio

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Propósito |
|------------|-----------|
| **Next.js 16** | Framework frontend y backend (App Router) |
| **React 19** | Biblioteca de interfaz de usuario |
| **TypeScript** | Tipado estático |
| **Tailwind CSS 4** | Estilos y diseño responsive |
| **Supabase** | Base de datos PostgreSQL y autenticación |
| **Lucide React** | Iconos |

### Dependencias Principales

```json
{
  "@supabase/ssr": "^0.9.0",
  "@supabase/supabase-js": "^2.100.1",
  "lucide-react": "^1.7.0",
  "next": "16.2.1",
  "react": "19.2.4"
}
```

---

## 🚀 Cómo Levantar el Proyecto

### Prerrequisitos

- **Node.js**: v18+ (probado con v23.11.1)
- **npm**: v9+ (probado con v10.9.2)
- Cuenta de Supabase (gratuita)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repositorio-url>
   cd contabilidad-pichangas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   Crear archivo `.env.local` con tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```

4. **Configurar Base de Datos**

   Ejecutar el schema SQL en el SQL Editor de Supabase:
   - Archivo: `supabase/schema.sql`
   
   Esto creará las tablas:
   - `profiles` - Perfiles de usuarios
   - `partidos` - Partidos creados
   - `partido_jugadores` - Jugadores en cada partido
   - `invitaciones` - Invitaciones a partidos
   - `goles` - Goles registrados
   - `votos_mvp` - Votos para MVP

5. **Ejecutar el proyecto**
   ```bash
   npm run dev
   ```

6. **Abrir en navegador**
   ```
   http://localhost:3000
   ```

---

## 📁 Estructura del Proyecto

```
contabilidad-pichangas/
├── src/
│   ├── app/                    # Páginas de Next.js (App Router)
│   │   ├── login/             # Página de login/registro
│   │   ├── dashboard/         # Panel principal
│   │   ├── partido/
│   │   │   ├── nuevo/         # Crear nuevo partido
│   │   │   └── [id]/          # Detalle del partido
│   │   ├── mis-estadisticas/  # Estadísticas del usuario
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Página de inicio (redirect)
│   │   └── globals.css        # Estilos globales
│   │
│   ├── components/            # Componentes reutilizables
│   │   ├── AuthProvider.tsx   # Context de autenticación
│   │   ├── ThemeProvider.tsx  # Context de tema claro/oscuro
│   │   └── ThemeToggle.tsx    # Botón toggle de tema
│   │
│   ├── lib/                   # Utilidades
│   │   └── supabase.ts        # Cliente de Supabase
│   │
│   └── types/                 # Tipos TypeScript
│       ├── index.ts           # Interfaces principales
│       └── supabase.d.ts      # Extensiones de tipos
│
├── supabase/
│   └── schema.sql             # Schema de base de datos
│
├── public/                    # Archivos estáticos
├── .env.local                # Variables de entorno (no commitear)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 🔄 Flujo de Uso

### 1. Registro/Login
El usuario se registra con email y contraseña. Se crea automáticamente un perfil en la tabla `profiles`.

### 2. Crear Partido
El usuario crea un partido indicando:
- Cancha/ubicación
- Fecha
- Hora
- Cantidad máxima de jugadores

### 3. Invitar Jugadores
El creador del partido puede buscar otros usuarios e invitarlos a unirse.

### 4. Unirse al Partido
Los invitados reciben una invitación y pueden aceptarla o rechazarla.

### 5. Iniciar Partido
Cuando el creador decide empezar (todos los jugadores confirmados), el partido cambia a estado "jugando".

### 6. Registrar Goles
Durante el partido, el creador registra los goles:
- Selecciona equipo (A o B)
- Selecciona jugador
- El minuto se calcula automáticamente

### 7. Finalizar Partido
El creador termina el partido, indicando el resultado automático basado en los goles registrados.

### 8. Votar MVP
Todos los jugadores pueden votar al mejor jugador del partido.

### 9. Ver Estadísticas
Los usuarios pueden ver su historial de partidos y estadísticas acumuladas.

---

## 🔧 Configuración de Supabase

### 1. Autenticación
- Ir a **Authentication** → **Providers**
- Habilitar **Email** 
- Activar "Allow email signups"

### 2. Tablas
Las tablas se crean ejecutando `supabase/schema.sql` en el SQL Editor.

### 3. Row Level Security (RLS)
El schema incluye políticas RLS que permiten:
- Lectura pública de perfiles, partidos, goles
- Escritura solo para el creador/propietario
- Lectura de invitaciones solo para involucrados

---

## 🎨 Personalización

### Tema Claro/Oscuro
El proyecto incluye soporte completo para tema oscuro. Los colores se definen en `src/app/globals.css` usando variables CSS.

### Colores Principales
- Verde: `#16a34a` (principal)
- Verde oscuro: `#22c55e` (hover)
- Azul: `#3B82F6` (equipo B)

---

## 📝 Notas Importantes

- El proyecto usa Supabase Auth para autenticación (no Google OAuth)
- El modo oscuro se guarda en localStorage
- Los minutos de los goles se calculan automáticamente
- El resultado final se calcula automáticamente desde los goles registrados

---

## 📄 Licencia

MIT License - Proyecto personalizado para gestión de partidos de fútbol.

---

## 👤 Autor

Desarrollado para uso personal/personalizado.

---

¿Necesitas ayuda adicional? ¡Escríbenos!