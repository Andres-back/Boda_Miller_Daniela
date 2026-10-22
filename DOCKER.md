# Boda de Miller y Daniela · Docker

## Primera instalación en el servidor

Requisitos: Docker Engine con Compose v2, un dominio que apunte al servidor y un proxy HTTPS (Nginx, Caddy o el proxy de la plataforma). La configuración predeterminada mantiene Node accesible solo desde el propio servidor.

```sh
git clone https://github.com/Andres-back/Boda_Miller_Daniela.git
cd Boda_Miller_Daniela
cp .env.example .env
mkdir -p secrets
```

Edita `.env`: `APP_ORIGIN=https://tu-dominio-real` debe coincidir exactamente con el origen que verá el navegador. `APP_PORT=3000` es el puerto local del proxy; cámbialo si otro proyecto ya lo utiliza.

Transfiere **privadamente** el archivo `E:\BODANILLER\data\admin-auth.json` del equipo de desarrollo a `secrets/admin-auth.json` en el servidor. Ese archivo contiene el usuario y el hash de su contraseña, no se debe publicar. Se conserva el mismo acceso que ya configuraste en el administrador. No existe contraseña predeterminada. Si el archivo local todavía no existe, crea primero la cuenta entrando a `/admin` en desarrollo.

```sh
chmod 700 secrets
chmod 644 secrets/admin-auth.json
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 boda
```

El directorio `secrets` es privado para el usuario que despliega. El archivo debe ser legible desde el contenedor, que ejecuta Node como UID 1000; Compose monta este archivo como secreto de solo lectura. El hash se copia al volumen privado únicamente cuando no existe una cuenta. Las actualizaciones y los reinicios no restablecen contraseñas cambiadas desde la web.

La primera instalación copia `data/content.json` al volumen de datos solo si no existe. Las nuevas confirmaciones, las mesas y los cambios del administrador se almacenan allí. Las imágenes subidas se guardan en un segundo volumen. No se incluyen invitados ni respuestas de desarrollo en el repositorio.

## Proxy y HTTPS

Conecta `https://tu-dominio-real` a `http://127.0.0.1:3000`, conservando `Host`. Hay una plantilla en `deploy/nginx.conf.example`; sustituye el dominio y las rutas del certificado. Si cambias `APP_PORT`, actualiza el destino del proxy.

Las cookies de producción son `Secure`; el inicio de sesión se debe probar mediante el dominio HTTPS. Abrir directamente el puerto HTTP con otro Host devolverá 403 de forma intencional. El healthcheck interno envía el Host configurado y no necesita una sesión.

Para una plataforma con proxy en otro contenedor, retira el mapeo local de `ports`, conecta el servicio a la red privada del proxy y apunta a `boda:3000`. Mantén el backend fuera del acceso público y conserva el disco persistente. Ejecuta una única instancia.

## Migrar datos ya existentes

Si se deben trasladar confirmaciones o mesas locales, detén temporalmente la entrada de nuevas respuestas durante la migración. Guarda un respaldo privado y transfiere `content.json`, `rsvps.json`, `seating.json` y `admin-auth.json` fuera de Git.

Tras crear los volúmenes con el primer arranque, detén el servicio y copia los archivos privados al volumen mediante un contenedor temporal:

```sh
docker compose stop boda
docker compose run --rm --no-deps -v /ruta/privada/datos:/migration:ro boda node --input-type=module -e "import{copyFile}from'node:fs/promises';for(const n of ['content.json','rsvps.json','seating.json','admin-auth.json'])await copyFile('/migration/'+n,process.env.DATA_DIR+'/'+n)"
docker compose up -d
```

Si hay imágenes `assets/upload-*` del administrador, transfiérelas también al volumen de subidas. Las imágenes públicas que ya contiene el repositorio no necesitan copiarse de nuevo. Los archivos migrados deben pertenecer o ser escribibles por UID 1000. No migres una copia antigua encima de respuestas nuevas recibidas en producción.

## Actualizaciones

```sh
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Los volúmenes conservan contenido, cuenta, respuestas, mesas e imágenes subidas. Los cambios públicos de código o de diseño llegan con la imagen. Si cambias el contenido inicial del repositorio, no reemplaza las ediciones ya guardadas en un volumen: edita desde el administrador o importa un respaldo JSON revisado.

No uses `docker compose down -v` en una instalación con datos: eliminaría los volúmenes. Reiniciar el proceso cierra las sesiones y requiere volver a iniciar sesión.

## Respaldo privado

El respaldo debe incluir ambos volúmenes. Para obtener una copia consistente, detén el servicio durante el respaldo y vuelve a iniciarlo al terminar:

```sh
mkdir -p backups
chmod 700 backups
docker compose stop boda
docker compose run --rm --no-deps -v "$PWD/backups:/backup" boda sh -c 'umask 077; tar -czf /backup/boda-backup.tgz -C /var/lib/boda data uploads'
docker compose up -d
```

El usuario UID 1000 del contenedor debe poder escribir en la carpeta de destino. Ajusta su propietario si es necesario. Cambia el nombre del archivo en cada respaldo para conservar versiones. El archivo contiene datos personales y el hash de la cuenta; guárdalo en una ubicación privada externa al servidor, nunca en GitHub.

## Pruebas y diagnóstico

```sh
npm run check
npm test
docker build -t boda-miller-daniela:test .
node tests/docker-smoke.mjs boda-miller-daniela:test
```

La construcción ejecuta las pruebas antes de crear la imagen final. La prueba Docker crea un contenedor y volúmenes con nombres aleatorios, usa datos de prueba y los elimina al terminar. Comprueba el usuario sin privilegios, el sistema de archivos de solo lectura, el inicio de sesión, las rutas privadas, los acompañantes y la persistencia después de reiniciar. No afecta a la invitación ni a los datos reales. GitHub Actions ejecuta estas mismas comprobaciones en Linux.
