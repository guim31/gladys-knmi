# KNMI

El tiempo oficial de los **Países Bajos** en Gladys: las observaciones, las previsiones y los
**avisos del KNMI** (Koninklijk Nederlands Meteorologisch Instituut, el instituto meteorológico
neerlandés), leídos a través de la API gratuita de [Weerlive.nl](https://weerlive.nl). Pensada para
los neerlandeses que viven en Francia, para quienes viven cerca de la frontera belga-neerlandesa y
para cualquiera que tenga una casa en los Países Bajos.

> **Desarrollada sin cuenta de Weerlive: sus comentarios son bienvenidos.** La integración se ha
> construido y probado con respuestas reales de Weerlive (publicadas por los proyectos
> python-weerlive y ha-knmi), no con el servicio real. Indique lo que funciona y lo que no en las
> [issues](https://github.com/guim31/gladys-knmi/issues).

Esta integración no tiene relación con el KNMI ni con Weerlive.

## Presentación

- **Un dispositivo por lugar**: una casa de Gladys (su ubicación), ciudades neerlandesas o
  coordenadas, cinco lugares como máximo.
- Cada dispositivo muestra la temperatura, la sensación térmica, la humedad, la presión, el viento
  (Beaufort, km/h y dirección), la visibilidad, la precipitación prevista para la próxima hora, las
  condiciones, la salida y la puesta del sol, y el **aviso del KNMI**: su color (verde, amarillo,
  naranja, rojo), su título y su texto, y el próximo aviso anunciado.
- Un **disparador de escena** _Nuevo aviso KNMI_, con el texto del KNMI listo para una notificación.
- Un **widget** _Previsión KNMI_: valores en directo, avisos, sol y previsión a 5 días.
- Solo lectura: no se puede controlar nada.

## Requisitos

- Gladys Assistant **5.2.0** o posterior (elección de la casa en la configuración, widgets,
  disparadores de escena).
- Una **clave de API gratuita de Weerlive**: rellene el formulario de
  [weerlive.nl/delen.php](https://weerlive.nl/delen.php) con su dirección de correo; la clave llega
  por correo electrónico. Weerlive reserva la clave gratuita para un uso personal y de ocio.
- Acceso a Internet para Gladys (la integración llama a `weerlive.nl`).
- La pantalla de instalación pide acceso a la **ubicación de sus casas**: solo se usa para la casa
  elegida en la configuración.

## Configuración

Abra **Integraciones → KNMI → Configuración**.

### Clave de API de Weerlive

Pegue la clave recibida por correo. Se guarda en la configuración de Gladys, nunca en los
registros.

### Lugares

- **Casa de Gladys**: seguir el tiempo en la ubicación de esta casa (definida en Ajustes → Casas).
  Las coordenadas se envían a Weerlive redondeadas a dos decimales, aproximadamente 1 km.
- **Otros lugares**: ciudades neerlandesas (`Amsterdam`, `'s-Hertogenbosch`) o coordenadas
  (`52.09,5.12`), separadas por punto y coma. Weerlive elige la estación más cercana: el botón
  _Probar la conexión_ indica el lugar encontrado.
- Cinco lugares como máximo, casa incluida.

Abra después la pestaña **Descubrimiento** y añada los dispositivos que desee: solo se leen los
dispositivos añadidos.

### Actualización y cuota

La clave gratuita permite **300 solicitudes al día**, y Weerlive actualiza sus datos cada
10 minutos. La integración lee cada lugar añadido como mucho cada 10 minutos (campo _Intervalo de
actualización_) y se ralentiza por sí sola con varios lugares para que todos juntos queden por
debajo de 240 solicitudes al día: 12 minutos con dos lugares, 18 con tres, 30 con cinco. La última
lectura se guarda en `/data`: un reinicio de Gladys no vuelve a gastar la cuota, y mostrar el widget
nunca hace una solicitud.

### Idioma

_Idioma de los textos_ (francés por defecto) da nombre a las funciones de los nuevos dispositivos y
escribe las condiciones y las fechas. Los nombres de las funciones se fijan al añadir el
dispositivo. Los textos de aviso del KNMI siguen en neerlandés, tal como los escribe el KNMI.

## Dispositivos

Todas las funciones son de solo lectura.

| Función                        | Valor                                                              |
| ------------------------------ | ------------------------------------------------------------------ |
| Temperatura, sensación térmica | °C                                                                 |
| Humedad                        | %                                                                  |
| Presión atmosférica            | hPa                                                                |
| Viento (Beaufort)              | 0 a 12                                                             |
| Velocidad del viento           | km/h                                                               |
| Dirección del viento           | grados (0 = del norte, 90 = del este)                              |
| Visibilidad                    | km                                                                 |
| Precipitación, próxima hora    | mm previstos para la hora en curso                                 |
| Condiciones                    | soleado, nublado, chubascos… en el idioma elegido                  |
| Salida y puesta del sol        | hora local de los Países Bajos (la misma que en Francia y Bélgica) |
| Nivel de aviso KNMI            | 0 verde, 1 amarillo, 2 naranja, 3 rojo                             |
| Aviso KNMI, texto              | título y texto del KNMI, en neerlandés                             |
| Alarma meteorológica           | 1 cuando Weerlive señala una alarma meteorológica para la región   |
| Nivel del próximo aviso        | color del próximo aviso anunciado (0 si no hay ninguno)            |
| Próximo aviso KNMI desde       | su inicio, o «Ninguno»                                             |

## Widget

Añada el widget **Previsión KNMI** a un panel y elija un lugar. Muestra el lugar y las condiciones,
tres mosaicos en directo (temperatura, sensación, viento), la previsión a 5 días (mínima y máxima,
probabilidad de lluvia, viento), el aviso vigente y el siguiente con sus colores, la salida y la
puesta del sol, y el texto neerlandés del KNMI cuando hay un aviso en vigor. Se construye a partir
de la última lectura: no cuesta ninguna solicitud.

## Disparador de escena

**Nuevo aviso KNMI** se dispara una vez por cada aviso nuevo:

- _En vigor_: empieza un aviso amarillo, naranja o rojo para el lugar, u otro aviso lo sustituye;
- _Anunciado para más tarde_: el KNMI anuncia un aviso que empieza más tarde, la primera vez que se
  ven ese color y ese inicio.

Filtros: el lugar, los colores, cuándo. Variables para las acciones: `place`, `level` (`yellow`,
`orange`, `red`), `level_number` (1 a 3), `phase` (`current`, `upcoming`), `title` y `text` (en
neerlandés, para un aviso en vigor), `starts_at` (fecha ISO). La primera lectura tras la
instalación solo registra lo que está en vigor, y un reinicio nunca vuelve a disparar el mismo
aviso. El fin de un aviso no es un evento: use la función _Nivel de aviso KNMI_ (`= 0`).

## Acción de configuración

**Probar la conexión** lee el primer lugar una vez (una solicitud de la cuota) e indica si la clave
es aceptada, qué lugar ha encontrado Weerlive, cuántas solicitudes quedan hoy y el ritmo de las
lecturas.

## Ejemplos de escenas

- **Aviso de tormenta**: disparador _Nuevo aviso KNMI_, colores naranja y rojo, _En vigor_ → enviar
  un mensaje «Aviso KNMI {{triggerEvent.data.level}}: {{triggerEvent.data.title}}».
- **Recoger el toldo**: disparador _Estado de un dispositivo_ en _Viento (Beaufort)_ de su casa,
  ≥ 6 → cerrar el toldo o las persianas.
- **La víspera**: disparador _Nuevo aviso KNMI_, _Anunciado para más tarde_ → una notificación con
  `starts_at`, para guardar los muebles de jardín.

## Solución de problemas

- **«Weerlive ha rechazado la clave de API»**: compruebe la clave recibida por correo, sin
  espacios.
- **«Límite diario de Weerlive alcanzado»**: las lecturas se reanudan después de medianoche, hora
  neerlandesa. Menos lugares o un intervalo más largo ayudan; el botón _Probar_ también gasta una
  solicitud.
- **«Weerlive no responde»**: avería del servicio o del acceso a Internet de Gladys. Las lecturas
  se reanudan solas.
- **Ningún valor en un dispositivo**: compruebe que el dispositivo se ha añadido en la pestaña
  Descubrimiento.
- **Lugar extraño**: Weerlive elige la estación más cercana; escriba otra ciudad o unas
  coordenadas.
- Más detalles: defina `LOG_LEVEL=debug` en el contenedor y lea sus registros.

## Límites

- Los datos cubren los Países Bajos: un lugar lejano recibe la estación neerlandesa más cercana, o
  nada.
- Los textos de aviso están en neerlandés, tal como los publica el KNMI.
- Cinco lugares como máximo por clave, y una lectura cada 10 minutos en el mejor de los casos.
- Weerlive indica que su clave gratuita es para uso personal y de ocio.
- Desarrollada sin cuenta de Weerlive, probada con respuestas reales publicadas.
