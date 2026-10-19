# NóminaCheck

Asistente para contadores que revisan liquidaciones salariales en Uruguay.

Cargás la liquidación de Odoo (LS), la nómina, los recibos de sueldo y los
comprobantes bancarios de un período. La app extrae lo visible en esos
archivos, propone coincidencias por trabajador y te muestra dónde hay
faltantes, diferencias de importe o casos que hay que confirmar a mano.

NóminaCheck **no aprueba liquidaciones** ni sustituye la revisión del
contador. Es una herramienta de apoyo: extrae, relaciona y señala
inconsistencias.

## Qué resuelve

Un control salarial típico mezcla planillas, PDFs escaneados y extractos
bancarios. El trabajo lento es cruzar, para cada persona:

- lo declarado en Odoo
- lo informado en la nómina
- lo que figura en el recibo
- lo que realmente se transfirió

La unidad de conciliación no es “el trabajador”. Es:

**trabajador + período + acumulación laboral/cargo + concepto salarial**

Una misma persona puede tener más de un cargo, más de un recibo y más de un
pago en el mismo mes. El sistema no los fusiona solo porque coincida el
nombre.

Hay dos cadenas de control:

| Cadena  | Compara                                     | Pregunta                       |
| ------- | ------------------------------------------- | ------------------------------ |
| Nominal | LS ↔ nómina ↔ recibo                        | ¿El sueldo declarado coincide? |
| Líquido | líquido del recibo ↔ suma de transferencias | ¿Se pagó lo que corresponde?   |

Los pagos a cuenta y de saldo se conservan por separado y después se
suman. Una diferencia dentro de la tolerancia de redondeo se marca como
`CORRECTO_CON_REDONDEO`; nunca se oculta el importe exacto.

## Flujo de uso

1. Iniciar sesión.
2. Crear un control: empresa, período (`AAAA-MM`) y, si aplica, tolerancia
   de redondeo.
3. Subir juntos LS, nómina, recibos y comprobantes. La clasificación es
   automática por contenido, no por el nombre del archivo.
4. Revisar el resultado por trabajador: coincidencias propuestas,
   documentos sin emparejar e incidencias.
5. Ver el resumen y el informe del período.

Formatos admitidos: **PDF, PNG, JPG, CSV y XLSX**. Hasta 40 archivos por
corrida, 15 MB cada uno.

## Qué no hace

- No inventa cédulas, nombres, cuentas ni importes ilegibles.
- No valida el cálculo interno del recibo (BPS, IRPF, FONASA, descuentos,
  horas extras, embargos).
- No interpreta cumplimiento de la Ley de Tercerizaciones.
- No descarta recibos repetidos: puede ser duplicado o otra acumulación.
- No distribuye transferencias entre cargos si no hay evidencia de a cuál
  pertenecen.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- Supabase Auth
- Mistral (OCR + extracción estructurada)
- Zod para validar la salida del modelo
- Tests con el runner nativo de Node (`tsx --test`)

## Requisitos

- Node.js 20.9 o superior
- Una cuenta de [Supabase](https://supabase.com) con Auth habilitado
- Una API key de [Mistral](https://mistral.ai) (OCR y chat)

## Configuración

```bash
cp .env.example .env.local
npm install
```

Completá `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
MISTRAL_API_KEY=

# En Vercel, la integración de Supabase publica estas mismas credenciales como
# NEXT_PUBLIC_DATABASE_SUPABASE_URL y NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY.
# La app acepta cualquiera de los dos nombres y prioriza los de la integración.

# Opcionales. Si no se definen, se usan estos valores:
# NOMINACHECK_MISTRAL_MODEL=mistral-small-latest
# NOMINACHECK_OCR_MODEL=mistral-ocr-4-1
```

Creá el esquema una sola vez: abrí el SQL Editor de tu proyecto de Supabase y
ejecutá `supabase/migrations/0001_nominacheck.sql`. Crea las tablas de
controles, documentos, trabajadores, pagos y preferencias, sus políticas de
RLS y el bucket privado `control-documents` donde se guardan los archivos.

Para probar el login sin pasar por `/registro`, ejecutá esto en el mismo SQL
Editor. Crea (o actualiza) un usuario ya confirmado:

```sql
-- NóminaCheck · usuario de prueba
-- Es idempotente: si el correo ya existe, confirma el mail y resetea la clave.
create extension if not exists pgcrypto;

do $$
declare
  v_email    text := 'prueba@nominacheck.test';
  v_password text := 'Prueba123!';
  v_user_id  uuid;
begin
  select id into v_user_id
  from auth.users
  where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Usuario de prueba"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || '{"full_name":"Usuario de prueba"}'::jsonb,
      updated_at = now()
    where id = v_user_id;

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do nothing;
  end if;
end $$;

select id, email, email_confirmed_at
from auth.users
where email = 'prueba@nominacheck.test';
```

Credenciales:

| Campo      | Valor                    |
| ---------- | ------------------------ |
| Correo     | `prueba@nominacheck.test` |
| Contraseña | `Prueba123!`             |

Después:

```bash
npm run dev
```

La app queda en [http://localhost:3000](http://localhost:3000). El registro
está en `/registro`.

Sin las variables de Supabase o Mistral, el login y el análisis no
funcionan: el endpoint `/api/analyze` exige sesión y `MISTRAL_API_KEY`.

## Scripts

| Comando                           | Qué hace                             |
| --------------------------------- | ------------------------------------ |
| `npm run dev`                     | Servidor local con Turbopack         |
| `npm run build`                   | Build de producción                  |
| `npm run start`                   | Sirve el build                       |
| `npm run lint`                    | ESLint                               |
| `npm run typecheck`               | TypeScript estricto (`tsc --noEmit`) |
| `npm test`                        | Tests del motor de conciliación      |
| `npm run format` / `format:check` | Prettier                             |

## Cómo está armado

```
src/
  app/controles/        Flujo del control: alta, documentos, análisis, informe
  components/nomina/    Pantallas del espacio de trabajo y store de controles
  lib/db/               Lectura y escritura en Supabase
  lib/nominacheck/      Extracción, normalización y conciliación
  config/               Códigos de concepto salarial
  types/nominacheck.ts  Contrato del resultado
supabase/migrations/    Esquema de la base
```

Todo el estado vive en Supabase. Al crear un control se guarda una fila en
`controls`; los archivos van al bucket `control-documents` y se registran en
`control_documents`. Cuando el análisis termina, el `NominaCheckResult`
completo queda en `controls.result` y, derivada de él, una vista por persona
en `control_workers` y `control_payments`: esa es la que el contador edita al
confirmar o reasignar pagos, y por eso sobrevive a una nueva corrida.

El análisis de un control guardado corre en
`src/app/api/controles/[controlId]/analizar/route.ts` (hasta 300 s), que baja
los archivos del bucket y llama al mismo motor que expone `POST /api/analyze`
para usos sin persistencia:

1. **OCR / parseo.** PDF e imágenes van a Mistral OCR. CSV y XLSX se leen
   en crudo.
2. **Extracción.** Un segundo llamado a Mistral clasifica el archivo y
   copia solo lo visible a un JSON validado con Zod.
3. **Conciliación determinística.** `src/lib/nominacheck/process.ts`
   normaliza cédulas, nombres e importes (formato uruguayo `60.045,98` vs.
   internacional), arma las coincidencias y calcula estados.

La especificación funcional está en `NOMINACHECK_SYSTEM_PROMPT.md`. El
codificador de conceptos (`1` sueldo, `2` aguinaldo, `41` salario
vacacional, etc.) vive en `src/config/concept-codes.ts` para poder
ajustarlo sin tocar el motor.

### Estados que puede devolver

`CORRECTO` · `CORRECTO_CON_REDONDEO` · `CORRECTO_CON_OBSERVACION` ·
`ADVERTENCIA` · `REVISION_MANUAL` · `DOCUMENTACION_INCOMPLETA` · `ERROR` ·
`NO_PROCESABLE`

El estado general nunca es más favorable que el caso más crítico del lote.

## CI/CD

GitHub Actions corre formato, lint, tipos y build en cada pull request y
en cada push a `main`.

Para desplegar en Vercel:

1. Importá el repo (preset Next.js). La rama de producción es `main`.
2. Configurá las mismas variables de entorno en Production y Preview.
3. Protegé `main` exigiendo el job **Lint, types and build**.

No hace falta guardar tokens de Vercel en GitHub si usás la integración
nativa con GitHub.
