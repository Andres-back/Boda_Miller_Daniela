# Miller & Daniela · Nuestra boda

Invitación de matrimonio cristiano en español, en tonos marfil, verde salvia, verde bosque, champaña y dorado, siguiendo la referencia del cliente. Los mensajes del sobre, la portada, la carta y la ceremonia expresan la unión delante de Dios, la oración y la gratitud. Son editables desde el administrador. Incluye entradas suaves con GSAP, la canción elegida desde 1:53, cuenta regresiva, carta, galería ampliable, calendario y confirmaciones de asistencia. El administrador tiene inicio de sesión y gestión de mesas con sillas individuales. Las flores y los sellos permanecen fijos, sin giros ni balanceos. Los textos usan tamaños grandes y los botones tienen acabado dorado, iconos y estados de interacción.

## Abrir el proyecto

Requiere Node.js 22 o posterior; la imagen Docker usa Node.js 24 LTS. No necesita instalar dependencias.

```powershell
cd E:\BODANILLER
npm start
```

- Invitación: http://localhost:3000
- Administrador: http://localhost:3000/admin

También puedes ejecutar `INICIAR.cmd` desde esta carpeta. El servidor escucha solo en este equipo; la invitación todavía no está publicada en internet.

## Despliegue con Docker

Incluye `Dockerfile`, `compose.yaml`, comprobación de estado y volúmenes persistentes. En el servidor, copia `.env.example` a `.env`, configura `APP_ORIGIN` con el dominio HTTPS real y coloca la cuenta privada en `secrets/admin-auth.json` (se transfiere de forma privada desde `data/admin-auth.json`, nunca mediante Git). Después ejecuta:

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

El servicio escucha en `127.0.0.1:3000` del servidor para conectarlo a un proxy HTTPS. La guía [DOCKER.md](DOCKER.md) explica la primera instalación, migración, actualización y respaldo. [PRODUCCION.md](PRODUCCION.md) describe el acceso y los límites de una sola instancia. La cuenta, las confirmaciones, las mesas y los archivos originales quedan fuera de Git y de la imagen. El contenido de la invitación y las imágenes públicas de `assets` sí forman parte del proyecto.

GitHub Actions ejecuta las pruebas, construye la imagen y verifica el arranque y la persistencia del contenedor en cada cambio de `main`. No publica automáticamente la invitación en un dominio.

El primer acceso local a `/admin` permite crear usuario y contraseña; después se exige iniciar sesión. No hay credenciales predeterminadas. La creación inicial está deshabilitada en producción. Consulta [PRODUCCION.md](PRODUCCION.md) para configurar el dominio HTTPS, el almacenamiento privado persistente y el acceso.

## Editar sin código

La navegación principal separa **Invitación**, **Confirmaciones**, **Mesas** y **Cuenta y respaldos**. En **Invitación**, usa el selector **Sección de la invitación** para elegir qué editar. Los campos se agrupan en bloques desplegables de textos, imágenes, horarios, música y decoración. También puedes deslizar la vista previa para cambiar al módulo que estás viendo. En pantallas amplias se muestran edición y vista previa juntas; en pantallas pequeñas usa **Editar contenido / Vista previa** para alternar sin perder cambios.

Cada módulo permite editar su adorno PNG, subir imágenes, cambiar textos y guardar. Las flechas cambian el orden de los módulos interiores. El interruptor permite ocultarlos. La portada y la confirmación siempre permanecen visibles.

Los módulos también incluyen los textos de navegación, botones, indicaciones del rascado, etiquetas de fotografías, carta y pie de página. En **Invitación → Confirmar asistencia**, los grupos **Formulario · presentación**, **Formulario · asistentes**, **Mensaje para los novios** y **Formulario · botones y avisos** permiten personalizar las preguntas, ejemplos y botones sin tocar código. El formulario conserva únicamente el mensaje opcional para los novios; no solicita restricciones alimentarias. Los nombres de acompañantes continúan siendo obligatorios.

Los nuevos campos editables se incorporan automáticamente al abrir el panel, también cuando los datos vienen de una versión anterior o de un volumen Docker existente. Al guardar se conservan junto con los cambios del módulo. Los respaldos anteriores reciben los valores predeterminados de esos nuevos textos al importarse.

Al final de los campos de cada módulo, el selector **Adorno de esta sección** permite escoger visualmente **Esquina floral**, **Guirnalda dorada** o **Sin adorno**. También permite subir un PNG transparente propio. La elección aparece inmediatamente en la vista previa y se conserva al guardar.

Pulsa **Guardar cambios** o `Ctrl+S` para aplicar los cambios a la invitación. Un aviso **Sin guardar** en la navegación indica que hay ediciones pendientes. El botón de guardado solo se muestra al editar la invitación; las mesas se guardan automáticamente. Los datos guardados se conservan al cerrar el navegador o reiniciar el servidor. En **Cuenta y respaldos** puedes cambiar contraseña, cerrar sesión, descargar el contenido JSON o restaurarlo; las imágenes se guardan por separado en `assets`.

En **Confirmaciones**, consulta las respuestas recibidas y descarga un CSV. El botón de WhatsApp del invitado abre un mensaje preparado para el **+57 321 567 3010**; el invitado decide si lo envía.

En **Mesas**, crea mesas con capacidad de 1 a 20 personas y asigna a cada invitado o acompañante a una silla. Puedes dar nombre a los acompañantes, mover o retirar personas, buscar, imprimir y descargar CSV. Los cambios de distribución se guardan automáticamente; el servidor impide duplicar personas o sillas y rechaza ediciones antiguas de otra ventana.

## Datos incorporados

- Maria Daniela Velasco Cuellar y Bayron Miller Coral Criollo.
- 14 de noviembre de 2026, ceremonia a las 5:00 p. m., hora de Colombia.
- Iglesia Cruzada Cristiana Mocoa, Carrera 11a, Mocoa, Putumayo; botón de mapa enlazado al punto exacto enviado por los novios.
- Itinerario indicado por los novios: llegada a las 4:00 p. m.; ceremonia a las 5:00 p. m.; felicitaciones y recuerdos a las 6:00 p. m.; cena de 7:30 a 8:00 p. m. Todo se edita en Módulos → El gran día, incluido el inicio y el final de la cena.
- La fecha límite de confirmación y los textos de vestimenta/regalos son propuestas editables.

Las 14 fotografías originales de los novios se conservan sin cambios en `imagenes`; las copias de la web están en `assets/recuerdo-*.jpg`. Las dos fotos añadidas el 17 de octubre destacan en la invitación y al inicio del álbum. La foto de la mesa de celebración es una imagen de inspiración generada, identificada en la página, y se puede reemplazar desde el administrador.

## Boceto mejorado con fotografías

Después de abrir el sobre aparece una bienvenida inspirada en la referencia del cliente: palomas, flores blancas con follaje verde, marco dorado, nombres en caligrafía y pareja ilustrada con traje gris claro y corbata salvia. El título, mensaje, despedida, ilustración, palomas y adornos se editan en **Módulos → Portada**. La fotografía del compromiso enlaza al álbum. **Nuestra invitación** usa la nueva foto del atardecer. El álbum muestra tres fotos principales y permite recorrer las 14; las posiciones 4 a 14 son opcionales y editables.

## Escenas ilustradas de los novios

### Interfaz y navegación

La navegación superior resalta la sección actual. En móvil, una barra inferior ofrece acceso a invitación, historia, álbum y confirmación; los enlaces de módulos ocultos desaparecen automáticamente. El menú adicional puede cerrarse con Escape o al elegir un enlace. Los controles de sonido están junto al menú en móvil.

La portada muestra una invitación para descubrir la fecha. Al revelar el raspado, la tarjeta muestra fecha y hora; la cabecera y el sobre también actualizan la fecha. Antes de revelar, los botones de calendario llevan a la tarjeta de raspado. El itinerario usa tarjetas con iconos y horarios de 12 horas. El álbum, los botones y las pestañas comparten bordes, superficies y estados de foco.

La confirmación de asistencia usa opciones de radio accesibles, un contador de 1 a 8 personas y una sección desplegable para los datos opcionales. Al elegir que no se asistirá, se ocultan personas y alimentación. Mantiene el mismo almacenamiento y el mismo formato de respuestas del administrador.

### Apertura y recorrido de la invitación

La primera entrada por la página principal muestra un sobre con sello dorado. Al pulsarlo, la solapa se abre, la carta sale y se revela la portada. Se puede saltar, cerrar con Escape o volver a abrir desde el pie de página. Los enlaces directos a una sección entran directamente. La apertura se recuerda durante la sesión y no inicia música automáticamente.

En **Administrador → Portada** se editan el texto superior y el mensaje del sobre; nombres y fecha se toman de la portada. El botón **Ver el sobre en la vista previa** permite revisarlo dentro del administrador.

En pantallas desde 1000 × 780 px, los tres capítulos de la pareja avanzan al hacer scroll en una escena fija, con una línea de progreso. Los botones y el teclado también permiten elegir capítulo. En móvil y pantallas más pequeñas se recorren con botones o un gesto lateral sobre la escena; el gesto vertical sigue desplazando la página. Con movimiento reducido, el recorrido permanece manual y el sobre abre sin animación. La vista previa no fija escenas al hacer scroll.

La serie actual usa los PNG `miller-daniela-*-v5.png`, corregidos a partir de las dos fotos nuevas para conservar los rostros y la contextura reales. El traje es gris claro con corbata salvia y el cabello de ambos es negro. El acabado es de retrato dibujado, sin afinar facciones ni estilizar las siluetas. Los prompts están en `assets/GENERACION-PARECIDO-V5.md`; la paleta y los adornos se documentan en `assets/GENERACION-BIENVENIDA-V3.md`. Las versiones anteriores quedan como alternativas.

Al desplazarse, ScrollTrigger anima suavemente los bloques de texto y tarjetas, el trazo dorado de los títulos y un pequeño desplazamiento de las fotografías. Las flores permanecen fijas. La preferencia de movimiento reducido desactiva estas transiciones; la vista previa del administrador permanece estática.

### Rasca para revelar la cuenta regresiva

En **Cuenta regresiva** el contador de días, horas, minutos y segundos está debajo de la capa dorada; no hay un contador duplicado por fuera. Se revela al rascar aproximadamente el 38% de la superficie con mouse o dedo, y continúa actualizándose en vivo. El botón **Revelar sin rascar** ofrece el mismo resultado con teclado. **Volver a rascar** cubre de nuevo el contador. **Guardar nuestra fecha** descarga el calendario. El estado se conserva durante esa sesión del navegador y se reinicia si cambia la fecha.

En **Administrador → Módulos → Cuenta regresiva** se editan título, instrucción y mensaje revelado. Dejar vacío el título desactiva el rascado y muestra el contador directamente. Fecha y hora siempre se toman de **Portada**, sin duplicar datos. El rascado se limita a la tarjeta para permitir desplazar el resto de la página con normalidad.

Las microanimaciones incluyen un destello al pulsar botones, movimiento de flechas y corazones al pasar el mouse, cambios suaves de pestaña, aparición de respuestas y ventanas, realce de campos al enfocarlos y transición de los dígitos cuando cambia el contador. Se limitan a la interacción y respetan movimiento reducido. Las flores decorativas permanecen fijas.

El módulo **Nuestra historia ilustrada**, después de la cuenta regresiva, contiene tres PNG con transparencia creados con IA a partir de las fotos de Miller y Daniela: llegada en auto, promesa con anillos y alegría por su unión. Sus personajes y vestimenta se mantienen a lo largo de la serie. La web anima la llegada del auto, los destellos y un movimiento suave de la pareja durante la celebración. Las flores decorativas permanecen fijas.

Los invitados pueden elegir el capítulo, recorrer los siguientes y repetir la escena. La animación es breve y respeta la preferencia de movimiento reducido del dispositivo. En **Administrador → Módulos → Nuestra historia ilustrada** se editan los botones, títulos, mensajes e imágenes; también puede ocultarse o reordenarse el módulo. La vista previa del administrador es estática para facilitar la edición.

Los archivos actuales están en `assets/miller-daniela-auto-v5.png`, `assets/miller-daniela-anillos-v5.png` y `assets/miller-daniela-bienvenida-v5.png`. El modo de generación y los prompts están documentados en `assets/GENERACION-PARECIDO-V5.md`.

## Archivos y respaldo

- `data/content.json`: contenido guardado desde el administrador.
- `data/rsvps.json`: respuestas recibidas.
- `data/seating.json`: mesas, sillas, asignaciones y nombres de acompañantes.
- `data/admin-auth.json`: cuenta privada del administrador (hash de contraseña); se crea al configurar el acceso y nunca se sirve desde la web.
- `assets/flores-marfil-salvia-v3.png`, `assets/palomas-bendicion-v3.png` y `assets/floral-garland.png`: adornos PNG transparentes en blanco, verde y dorado. Se mantienen fijos.
- `assets/`: imágenes, fuentes locales y GSAP. No necesita servicios externos para cargar el diseño.
- `assets/GENERACION.md`: prompts y procedencia de los recursos generados.

Respalda los datos y las imágenes en una ubicación privada. Las rutas de edición, respuestas y mesas exigen sesión; las modificaciones requieren además un token CSRF y el origen autorizado. La invitación y el formulario de confirmación siguen siendo públicos. Para publicar configura HTTPS, una sola instancia y disco persistente según `PRODUCCION.md`. `npm test` ejecuta pruebas aisladas de acceso, sesiones, validación y persistencia de mesas, respuestas e imágenes.
