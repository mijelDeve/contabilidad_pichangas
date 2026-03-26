# Setup Supabase - Pichangas App

## 1. Configurar las variables de entorno

Ya configuradas en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://sycxgpjwucbebnanfwwx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y3hncGp3dWNiZWJuYW5md3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTcxNDAsImV4cCI6MjA5MDA3MzE0MH0.14oTFVw3u8IKzp70MQzjuhg6vVnCAsuzcpG4QqjTav0
```

## 2. Ejecutar el Schema SQL

Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard/project/sycxgpjwucbebnanfwwx

1. Haz clic en **SQL Editor** en el menú lateral
2. Crea una nueva query
3. Copia y pega el contenido de `supabase/schema.sql`
4. Ejecuta el query (botón "Run")

## 3. Habilitar registro por email

1. En el dashboard, ve a **Authentication** → **Providers**
2. Asegúrate que **Email** esté habilitado
3. En "Configuration", habilita "Allow email signups"

## 4. Probar la app

```bash
npm run dev
```

Ve a http://localhost:3000 y prueba:
1. Regístrate con un email y contraseña
2. Crea un partido
3. Invita a otros usuarios