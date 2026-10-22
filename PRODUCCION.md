# Administrador y mesas

## Crear el acceso privado

1. Inicia el proyecto en este equipo con `npm start` o `INICIAR.cmd`.
2. Abre http://localhost:3000/admin. En la primera entrada aparecerá **Crear acceso privado**.
3. Elige un usuario y una contraseña de al menos 12 caracteres. No existe una contraseña predeterminada.
4. Las siguientes entradas muestran el formulario de inicio de sesión. En **Cuenta y respaldos** puedes cambiar la contraseña y cerrar sesión.

La creación inicial solo se permite en desarrollo, desde localhost y mientras no exista la cuenta. En producción esta ruta está deshabilitada: el servidor no inicia sin una cuenta previamente configurada. La contraseña se conserva como hash scrypt con sal aleatoria en `data/admin-auth.json`, fuera de las rutas públicas; no se incorpora al JavaScript ni a la exportación de contenido.

Las sesiones expiran tras 30 minutos de inactividad o un máximo de 8 horas. Reiniciar el servidor cierra las sesiones. El cambio de contraseña revoca las demás sesiones. Hay límites de intentos, cookies HttpOnly y SameSite=Strict, comprobación del origen y token CSRF para las operaciones privadas.

## Mesas, como en la boda de Ana

En **Mesas**, crea una mesa con número único, nombre opcional y entre 1 y 20 sillas. Cada persona que confirma asistencia genera una plaza individual; si la confirmación incluye acompañantes, aparecerán como personas independientes en **Pendientes de ubicar**.

Cuando un invitado aumenta el total de asistentes, la invitación pide un nombre obligatorio por cada acompañante. El total incluye a la persona principal: 2 asistentes requiere 1 nombre adicional, 3 requiere 2. Los nombres se guardan con la confirmación, aparecen en Confirmaciones y su CSV, y se incorporan a las mesas. Las respuestas antiguas sin estos datos siguen disponibles; se puede nombrar a sus acompañantes desde Mesas.

El formulario ya no solicita restricciones alimentarias: deja visible solo el mensaje opcional para los novios después de los asistentes. Su título, ejemplo, indicación de opcional, preguntas y botones se editan en Invitación → Confirmar asistencia. Los demás módulos incluyen también sus textos de botones, navegación, carta, álbum y pie de página. La actualización añade los nuevos campos de texto de forma compatible al leer contenido existente y respeta las ediciones guardadas; no hay que eliminar los volúmenes.

- Toca una silla libre y elige a una persona para asignarla.
- Puedes escribir el nombre real de un acompañante.
- Toca una persona ubicada para moverla a otra silla libre o quitarla de la mesa.
- Cambia el nombre o la capacidad de una mesa. No se permite dejar personas en sillas fuera de la nueva capacidad.
- Para eliminar una mesa, retira primero a sus ocupantes.
- Busca por nombre, grupo o mesa. Descarga el CSV o imprime la distribución completa.

Los cambios de mesas se guardan automáticamente. Las personas que declinaron no aparecen para asignación. No se permite duplicar personas, sillas ni números de mesa. Si dos ventanas editan la distribución a la vez, se rechaza la versión antigua y se solicita actualizar.

## Publicación

El proyecto incluye un servidor Node.js y requiere un servicio con proceso persistente y disco persistente. Configuración para una única instancia detrás de un proxy HTTPS:

```text
NODE_ENV=production
APP_ORIGIN=https://tu-dominio.example
HOST=127.0.0.1
PORT=3000
DATA_DIR=/var/lib/boda/data
UPLOAD_DIR=/var/lib/boda/uploads
```

`APP_ORIGIN` debe ser el dominio HTTPS real, sin rutas. El proxy debe conservar el encabezado Host de ese dominio y permitir peticiones de hasta 8 MB para las imágenes. `HOST=0.0.0.0` puede usarse dentro de un contenedor cuyo puerto solo esté accesible desde el proxy. No expongas directamente el puerto HTTP de Node en internet: en producción las cookies son Secure y el acceso del navegador debe llegar mediante HTTPS.

Inicializa el directorio privado `DATA_DIR` con los archivos actuales `content.json`, `rsvps.json`, `seating.json` y **admin-auth.json después de crear el acceso local**. Solo el usuario del servidor debe poder leer y escribir estos datos. El directorio `UPLOAD_DIR` conserva las imágenes subidas desde el administrador; mueve allí los archivos `assets/upload-*` existentes si cambias de ubicación. Los demás archivos de `assets` forman parte del despliegue del diseño.

Mantén una sola instancia del servidor: la cola de escritura y las sesiones están en ese proceso. No uses varios workers, réplicas ni almacenamiento efímero con este backend de archivos. Si se necesitan varias instancias, habrá que migrar datos, sesiones y límites de intentos a servicios compartidos. El proxy limita los intentos por su propia IP; no se confía en encabezados X-Forwarded-For enviados por clientes.

No publiques `data`, `output`, `.env`, los originales de `imagenes` ni archivos de diagnóstico mediante otro servidor estático. Conserva copias privadas del directorio de datos y de las imágenes subidas. No compartas `admin-auth.json` en un repositorio público. Para recuperar un acceso perdido, detén la instancia, guarda una copia privada del archivo de cuenta, restablece la cuenta en un entorno local aislado y despliega el nuevo hash; no hay un restablecimiento público de contraseña.

## Verificación

`npm run check` comprueba la sintaxis. `npm test` prueba autenticación, acceso a datos, CSRF, rotación y cierre de sesión, cookies de producción, límites de acceso, persistencia y validación de mesas, imágenes y confirmaciones en servidores y carpetas temporales aislados. No genera invitados en los datos reales.

La revisión visual automatizada no se ejecutó debido al bloqueo previo del navegador; el acceso y la distribución se deben recorrer manualmente en la página. La publicación en un dominio y la configuración del proxy todavía no se han realizado.
