(() => {
  'use strict';
  const f = (key, label, value, group = 'Textos de botones y controles') => ({ key: 'ui' + key, label, value, group });
  const modules = {
    hero: [
      f('Nav', 'Menú · invitación', 'Invitación', 'Navegación y pie de página'),
      f('Monogram', 'Cabecera · texto antes de revelar la fecha', 'NUESTRA BODA', 'Navegación y pie de página'),
      f('Footer', 'Pie de página · mensaje', 'Un hogar que comienza con la bendición de Dios.', 'Navegación y pie de página'),
      f('FooterCredit', 'Pie de página · frase final', 'HECHO CON AMOR, PARA CELEBRAR EL AMOR', 'Navegación y pie de página'),
      f('Reopen', 'Pie de página · volver al sobre', 'Volver a abrir la invitación', 'Navegación y pie de página'),
      f('EnvelopeTop', 'Sobre · frase de la carta', 'CON TODO NUESTRO AMOR', 'Sobre de inicio'),
      f('EnvelopeHint', 'Sobre · instrucción', 'TOCA EL SELLO PARA ABRIR', 'Sobre de inicio'),
      f('EnvelopeSkip', 'Sobre · entrar directamente', 'Ir directamente a la invitación', 'Sobre de inicio'),
      f('HiddenDate', 'Sobre · fecha todavía oculta', 'Nuestro gran día está por descubrir', 'Sobre de inicio'),
      f('SurpriseEyebrow', 'Fecha · texto superior', 'GUARDAMOS UNA SORPRESA PARA TI'),
      f('SurpriseTitle', 'Fecha · título de la tarjeta', 'Descubre nuestro gran día'),
      f('DiscoverDate', 'Calendario · descubrir fecha', 'Descubrir la fecha'),
      f('SaveDate', 'Calendario · guardar fecha', 'Guardar la fecha'),
      f('AlbumLink', 'Botón junto a la foto', 'Conoce nuestra historia en fotos'),
      f('Continue', 'Invitación · seguir bajando', 'COMPARTE NUESTRA ALEGRÍA')
    ],
    countdown: [
      f('Days', 'Contador · días', 'DÍAS'),
      f('Hours', 'Contador · horas', 'HORAS'),
      f('Minutes', 'Contador · minutos', 'MINUTOS'),
      f('Seconds', 'Contador · segundos', 'SEGUNDOS'),
      f('Kicker', 'Contador · frase superior', 'PARA NUESTRO GRAN SÍ FALTAN'),
      f('CoverTitle', 'Rascado · pregunta sobre el dorado', '¿Cuánto falta para nuestro sí?'),
      f('CoverHint', 'Rascado · instrucción sobre el dorado', 'RASCA Y DESCUBRE LA CUENTA REGRESIVA'),
      f('Instruction', 'Rascado · instrucción inferior', 'Desliza el dedo o el mouse sobre el dorado.'),
      f('Progress', 'Rascado · mensaje al comenzar', 'Sigue rascando para descubrir cuánto falta…'),
      f('Reveal', 'Botón · revelar sin rascar', 'Revelar sin rascar'),
      f('Reset', 'Botón · volver a rascar', 'Volver a rascar'),
      f('Save', 'Botón · guardar fecha', 'Guardar nuestra fecha')
    ],
    illustrations: [
      f('Nav', 'Menú · historia', 'Nuestra historia'),
      f('Dock', 'Menú de celular · historia', 'Historia'),
      f('Scroll', 'Escenas · instrucción de escritorio', 'HAZ SCROLL PARA CONTINUAR'),
      f('Swipe', 'Escenas · instrucción de celular', 'DESLIZA LAS ESCENAS'),
      f('Chapter', 'Escenas · palabra antes del número', 'CAPÍTULO'),
      f('Replay', 'Botón · repetir', 'Repetir escena'),
      f('Next', 'Botón · siguiente', 'Siguiente capítulo'),
      f('Footnote', 'Frase debajo de las escenas', 'Un hogar, una fe, una vida juntos.')
    ],
    welcome: [
      f('LetterButton', 'Botón · abrir carta', 'Una carta para ti'),
      f('LetterHeading', 'Carta · texto superior', 'UNA CARTA PARA TI'),
      f('LetterSignature', 'Carta · despedida', 'Con amor, Miller y Daniela'),
      f('Seal', 'Sello · texto circular', 'UNIDOS EN FE · UNIDOS EN AMOR · '),
      f('SealCenter', 'Sello · texto central', 'sí, quiero')
    ],
    celebration: [
      f('Nav', 'Menú · el gran día', 'El gran día'),
      f('VenueHeading', 'Lugar · texto superior', 'EL LUGAR DONDE COMIENZA TODO'),
      f('Directions', 'Botón · cómo llegar', 'Cómo llegar'),
      f('PendingMap', 'Mapa · aviso si falta el enlace', 'Ubicación exacta por confirmar'),
      f('PhotoCaption', 'Lugar · pie de foto de inspiración', 'Imagen de inspiración para la celebración')
    ],
    gallery: [
      f('Nav', 'Menú · álbum', 'Álbum'),
      f('Photo1', 'Primera fotografía · texto al pie', 'el compromiso'),
      f('Photo2', 'Segunda fotografía · texto al pie', 'nuestro camino'),
      f('Photo3', 'Tercera fotografía · texto al pie', 'el primer sí'),
      f('Album', 'Botón · abrir álbum', 'Ver nuestro álbum'),
      f('Memories', 'Álbum · palabra junto al total', 'recuerdos')
    ],
    details: [
      f('Nav', 'Menú · detalles', 'Detalles'),
      f('DressTab', 'Pestaña · vestimenta', 'Vestimenta'),
      f('GiftTab', 'Pestaña · regalos', 'Regalos'),
      f('PaletteCaption', 'Vestimenta · frase bajo los colores', 'Un poquito de inspiración')
    ],
    rsvp: [
      f('Nav', 'Menú · confirmar', 'Confirmar asistencia', 'Formulario · botones y avisos'),
      f('Dock', 'Menú de celular · confirmar', 'Confirmar', 'Formulario · botones y avisos'),
      f('FormTitle', 'Formulario · título', '¿Celebramos juntos?', 'Formulario · presentación'),
      f('FormSubtitle', 'Formulario · introducción', 'Nos hace ilusión saber si estarás con nosotros.', 'Formulario · presentación'),
      f('NameLabel', 'Campo · nombre completo', 'Tu nombre completo', 'Formulario · asistentes'),
      f('NamePlaceholder', 'Campo · ejemplo del nombre', 'Escribe tu nombre y apellido', 'Formulario · asistentes'),
      f('Attendance', 'Pregunta de asistencia', '¿Nos acompañas?', 'Formulario · asistentes'),
      f('Yes', 'Opción · sí asistiré', '¡Sí, allí estaré!', 'Formulario · asistentes'),
      f('YesHint', 'Opción · descripción de sí', 'Vamos a celebrar', 'Formulario · asistentes'),
      f('No', 'Opción · no asistiré', 'No podré asistir', 'Formulario · asistentes'),
      f('NoHint', 'Opción · descripción de no', 'Les envío mi cariño', 'Formulario · asistentes'),
      f('Guests', 'Cantidad · título', 'Personas en tu invitación', 'Formulario · asistentes'),
      f('GuestsHint', 'Cantidad · aclaración', 'Incluyéndote a ti', 'Formulario · asistentes'),
      f('CompanionTitle', 'Acompañantes · título', '¿Quiénes te acompañan?', 'Formulario · asistentes'),
      f('CompanionHint', 'Acompañantes · instrucción', 'Escribe sus nombres para reservar un lugar para cada persona.', 'Formulario · asistentes'),
      f('CompanionName', 'Acompañantes · etiqueta antes del número', 'Nombre completo del acompañante', 'Formulario · asistentes'),
      f('CompanionPlaceholder', 'Acompañantes · ejemplo del nombre', 'Nombre y apellido', 'Formulario · asistentes'),
      f('MessageLabel', 'Palabras para los novios · título', 'Unas palabras para los novios', 'Mensaje para los novios'),
      f('MessagePlaceholder', 'Palabras para los novios · ejemplo', 'Un deseo, un recuerdo, un poquito de amor…', 'Mensaje para los novios'),
      f('Optional', 'Mensaje · indicación de opcional', 'Opcional', 'Mensaje para los novios'),
      f('Deadline', 'Fecha límite · frase anterior', 'CONFIRMA ANTES DEL', 'Formulario · botones y avisos'),
      f('Submit', 'Botón · confirmar', 'Confirmar mi respuesta', 'Formulario · botones y avisos'),
      f('Note', 'Aviso bajo el botón', 'Tu respuesta llegará a Miller y Daniela.', 'Formulario · botones y avisos'),
      f('SuccessYes', 'Respuesta guardada · si asiste', '¡Nos vemos pronto!', 'Formulario · botones y avisos'),
      f('SuccessNo', 'Respuesta guardada · si no asiste', 'Te llevamos en el corazón', 'Formulario · botones y avisos'),
      f('Whatsapp', 'Botón · escribir por WhatsApp', 'Escribir a los novios', 'Formulario · botones y avisos')
    ]
  };
  function upgrade(content) {
    if (!content || !Array.isArray(content.modules)) return content;
    return { ...content, modules: content.modules.map(module => {
      if (!module || typeof module !== 'object') return module;
      const defaults = Object.fromEntries((modules[module.id] || []).map(field => [field.key, field.value]));
      return { ...defaults, ...module };
    }) };
  }
  globalThis.BodaModuleCopy = { modules, upgrade };
})();
