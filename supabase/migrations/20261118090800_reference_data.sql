-- ============================================================
-- Camino UTP · 09 · Datos de referencia
-- Catálogo real del campus, categorías, FAQ, canales y avisos.
-- Idempotente: se puede re-ejecutar sin duplicar filas.
-- No crea usuarios ni tickets de prueba.
-- ============================================================

-- ------------------------- Sede -------------------------

insert into public.campuses (code, name, city)
values ('LIMA-CENTRO', 'Sede Lima Centro', 'Lima')
on conflict (code) do update
  set name = excluded.name,
      city = excluded.city;

-- ------------------------- Pabellones -------------------------

insert into public.buildings (campus_id, code, name, floors)
select c.id, v.code, v.name, v.floors
from (
  values
    ('A', 'Pabellón A', 4),
    ('B', 'Pabellón B', 3),
    ('C', 'Pabellón C', 4),
    ('D', 'Pabellón D', 5)
) as v(code, name, floors)
cross join (select id from public.campuses where code = 'LIMA-CENTRO') as c
on conflict (campus_id, code) do update
  set name = excluded.name,
      floors = excluded.floors;

-- ------------------------- Aulas -------------------------

insert into public.classrooms (
  building_id, code, name, floor, reference, capacity, map_x, map_y, equipment
)
select b.id, v.code, v.name, v.floor, v.reference, v.capacity, v.map_x, v.map_y, v.equipment
from (
  values
    ('A', 'A-101', 'Auditorio A', 1, 'Al costado de la recepción principal', 120, 18.00, 62.00,
      array['Proyector', 'Sonido', 'Aire acondicionado']),
    ('A', 'A-201', 'Aula A-201', 2, 'Frente a la escalera central', 40, 30.00, 38.00,
      array['Proyector', 'Pizarra acrílica']),
    ('A', 'A-305', 'Aula A-305', 3, 'Cerca de la coordinación académica', 45, 42.00, 26.00,
      array['Proyector', 'Pizarra acrílica', 'Ventilación']),
    ('B', 'B-102', 'Aula B-102', 1, 'Junto a la cafetería', 38, 62.00, 58.00,
      array['Proyector', 'Pizarra acrílica']),
    ('B', 'B-204', 'Laboratorio B-204', 2, 'Segundo piso, ala norte', 30, 70.00, 40.00,
      array['Computadoras', 'Proyector', 'Red cableada']),
    ('B', 'B-301', 'Sala de estudio B-301', 3, 'Tercer piso, zona de silencio', 25, 78.00, 22.00,
      array['Mesas grupales', 'Enchufes', 'Wi-Fi']),
    ('C', 'C-101', 'Laboratorio de Cómputo C-101', 1, 'Primer piso, ala oeste', 35, 22.00, 78.00,
      array['Computadoras', 'Proyector', 'Aire acondicionado']),
    ('C', 'C-205', 'Aula C-205', 2, 'Frente a los servicios higiénicos', 42, 40.00, 66.00,
      array['Proyector', 'Pizarra acrílica']),
    ('C', 'C-402', 'Aula C-402', 4, 'Último piso, ala este', 40, 52.00, 48.00,
      array['Proyector', 'Pizarra acrílica', 'Aire acondicionado']),
    ('D', 'D-105', 'Taller D-105', 1, 'Zona de talleres, ingreso lateral', 28, 82.00, 74.00,
      array['Herramientas', 'Mesas de trabajo', 'Extractor']),
    ('D', 'D-203', 'Aula D-203', 2, 'Junto a la escalera de emergencia', 44, 66.00, 80.00,
      array['Proyector', 'Pizarra acrílica']),
    ('D', 'D-401', 'Sala de videoconferencias D-401', 4, 'Cuarto piso, ala sur', 20, 88.00, 34.00,
      array['Videoconferencia', 'Pantalla 65"', 'Micrófonos'])
) as v(building_code, code, name, floor, reference, capacity, map_x, map_y, equipment)
join public.buildings b on b.code = v.building_code
join public.campuses c on c.id = b.campus_id and c.code = 'LIMA-CENTRO'
on conflict (code) do update
  set building_id = excluded.building_id,
      name = excluded.name,
      floor = excluded.floor,
      reference = excluded.reference,
      capacity = excluded.capacity,
      map_x = excluded.map_x,
      map_y = excluded.map_y,
      equipment = excluded.equipment;

-- ------------------------- Rutas paso a paso -------------------------

insert into public.classroom_directions (classroom_id, step_order, instruction)
select c.id, v.step_order, v.instruction
from (
  values
    ('A-101', 1, 'Ingresa por la puerta principal y avanza hasta la recepción.'),
    ('A-101', 2, 'Gira a la derecha pasando la cafetería.'),
    ('A-101', 3, 'El auditorio está al final del pasillo, a mano izquierda.'),

    ('A-201', 1, 'Ingresa al Pabellón A y sube por la escalera central al segundo piso.'),
    ('A-201', 2, 'Al salir de la escalera, camina 15 metros por el pasillo.'),
    ('A-201', 3, 'El aula A-201 está a mano derecha, junto a la vitrina de avisos.'),

    ('A-305', 1, 'Sube al tercer piso del Pabellón A.'),
    ('A-305', 2, 'Camina hacia la coordinación académica y continúa 10 metros.'),
    ('A-305', 3, 'El aula A-305 es la penúltima puerta del pasillo.'),

    ('B-102', 1, 'Cruza el patio central hacia el Pabellón B.'),
    ('B-102', 2, 'Ingresa y avanza 20 metros por el pasillo principal.'),
    ('B-102', 3, 'El aula B-102 está a mano izquierda, antes de la cafetería.'),

    ('B-204', 1, 'Ingresa al Pabellón B y sube al segundo piso.'),
    ('B-204', 2, 'Gira a la derecha hacia el ala norte.'),
    ('B-204', 3, 'El laboratorio B-204 es la segunda puerta con lector de tarjeta.'),

    ('B-301', 1, 'Sube al tercer piso del Pabellón B.'),
    ('B-301', 2, 'Sigue el pasillo hasta la zona de silencio.'),
    ('B-301', 3, 'La sala B-301 está al final, junto a la ventana panorámica.'),

    ('C-101', 1, 'Ingresa al Pabellón C por la puerta oeste.'),
    ('C-101', 2, 'Avanza 15 metros y gira a la izquierda.'),
    ('C-101', 3, 'El laboratorio C-101 tiene doble puerta de vidrio.'),

    ('C-205', 1, 'Sube al segundo piso del Pabellón C.'),
    ('C-205', 2, 'Camina hacia el centro del pasillo.'),
    ('C-205', 3, 'El aula C-205 está frente a los servicios higiénicos.'),

    ('C-402', 1, 'Usa el ascensor o la escalera del Pabellón C hasta el cuarto piso.'),
    ('C-402', 2, 'Gira hacia el ala este.'),
    ('C-402', 3, 'El aula C-402 es la última puerta del pasillo.'),

    ('D-105', 1, 'Ingresa al Pabellón D por el acceso lateral.'),
    ('D-105', 2, 'Sigue el pasillo de talleres hasta el fondo.'),
    ('D-105', 3, 'El taller D-105 está a mano derecha, con puerta corrediza.'),

    ('D-203', 1, 'Sube al segundo piso del Pabellón D.'),
    ('D-203', 2, 'Gira a la izquierda junto a la escalera de emergencia.'),
    ('D-203', 3, 'El aula D-203 es la tercera puerta del pasillo.'),

    ('D-401', 1, 'Toma el ascensor del Pabellón D hasta el cuarto piso.'),
    ('D-401', 2, 'Camina hacia el ala sur.'),
    ('D-401', 3, 'La sala D-401 tiene una placa indicadora en la puerta.')
) as v(code, step_order, instruction)
join public.classrooms c on c.code = v.code
on conflict (classroom_id, step_order) do update
  set instruction = excluded.instruction;

-- ------------------------- Categorías de ticket -------------------------

insert into public.ticket_categories (slug, name, description, sla_hours, sort_order)
values
  ('infraestructura', 'Infraestructura',
   'Aulas, puertas, iluminación, mobiliario o señalización.', 24, 1),
  ('equipos', 'Equipos y tecnología',
   'Proyector, computadoras, red Wi-Fi o audio.', 12, 2),
  ('limpieza', 'Limpieza y servicios',
   'Baños, aulas, áreas comunes o residuos.', 8, 3),
  ('acceso', 'Accesos y seguridad',
   'Credenciales, puertas con lector o incidencias de seguridad.', 6, 4),
  ('otro', 'Otro',
   'Cualquier situación que no encaje en las categorías anteriores.', 48, 5)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      sla_hours = excluded.sla_hours,
      sort_order = excluded.sort_order;

-- ------------------------- Base de conocimiento -------------------------

insert into public.help_articles (slug, title, excerpt, body, category, is_popular, sort_order)
values
  ('recuperar-contrasena', '¿Cómo recupero mi contraseña?',
   'Restablece el acceso a tu cuenta con tu correo institucional.',
   array[
     'En la pantalla de ingreso selecciona "¿Olvidaste tu contraseña?".',
     'Escribe tu correo @utp.edu.pe y revisa la bandeja de entrada, incluida la carpeta de spam.',
     'El enlace de recuperación tiene una vigencia de 30 minutos. Si expira, solicita uno nuevo.',
     'Si no recibes el correo, comunícate con la mesa de ayuda para validar tu identidad.'
   ], 'Cuenta y acceso', true, 1),

  ('encontrar-aula', '¿Cómo encuentro mi aula si no ubico el pabellón?',
   'Usa el buscador de aulas y sigue la ruta paso a paso.',
   array[
     'Abre Camino UTP y entra a "Buscar aula" desde el inicio.',
     'Escribe el código del aula (por ejemplo A-201) o el nombre del curso.',
     'Revisa el pabellón, el piso y la referencia antes de salir.',
     'Presiona "Cómo llegar" para ver la ruta guiada con los pasos del recorrido.'
   ], 'Campus', true, 2),

  ('tiempo-de-respuesta', '¿Cuánto demora la atención de un ticket?',
   'El tiempo estimado depende de la categoría de la incidencia.',
   array[
     'Cada categoría tiene un tiempo de atención (SLA) definido por el SAE.',
     'Accesos y seguridad: hasta 6 horas. Limpieza: hasta 8 horas.',
     'Equipos y tecnología: hasta 12 horas. Infraestructura: hasta 24 horas.',
     'Otros casos: hasta 48 horas. El plazo corre en horario de atención.'
   ], 'Tickets', true, 3),

  ('actualizar-datos', '¿Cómo actualizo mis datos personales?',
   'Mantén actualizado tu teléfono y correo de contacto.',
   array[
     'Ingresa a tu perfil desde el menú lateral o la barra inferior.',
     'Selecciona "Editar perfil".',
     'Actualiza los campos y presiona "Guardar cambios".',
     'Verás una confirmación cuando la información se haya registrado correctamente.'
   ], 'Cuenta y acceso', false, 4),

  ('proyector-no-funciona', '¿Qué hago si el proyector del aula no funciona?',
   'Reporta la incidencia y avisa al responsable del pabellón.',
   array[
     'Verifica que el cable HDMI esté conectado y que la fuente correcta esté seleccionada.',
     'Si el problema continúa, registra un ticket con la categoría "Equipos y tecnología".',
     'Indica el código del aula y una descripción breve del fallo.',
     'Adjunta una foto si es posible: ayuda a priorizar la atención.'
   ], 'Campus', false, 5),

  ('alto-contraste', '¿Cómo activo el modo de alto contraste?',
   'Ajusta colores y tamaño de texto desde el módulo de accesibilidad.',
   array[
     'Abre "Accesibilidad" desde el menú lateral o desde tu perfil.',
     'Activa el interruptor de alto contraste.',
     'También puedes aumentar el tamaño de la fuente hasta un 125%.',
     'Los cambios se aplican a toda la aplicación y se guardan en este dispositivo.'
   ], 'Accesibilidad', false, 6),

  ('reportar-desde-celular', '¿Puedo reportar una incidencia desde el celular?',
   'Sí, la interfaz se adapta a pantallas pequeñas.',
   array[
     'Abre el navegador de tu celular e ingresa a Camino UTP.',
     'Usa el botón "Ayuda" del inicio y elige "Reportar incidencia".',
     'Completa el formulario y envía el ticket. Recibirás un código de seguimiento.',
     'Puedes consultar el estado del ticket desde cualquier dispositivo con tu cuenta.'
   ], 'Tickets', false, 7),

  ('que-es-sae', '¿Qué es el SAE?',
   'El área que atiende servicios e incidencias del campus.',
   array[
     'El Servicio de Atención al Estudiante (SAE) atiende consultas y reportes sobre el campus.',
     'Gestiona tickets de infraestructura, equipos, limpieza y accesos.',
     'También brinda orientación sobre trámites y servicios académicos.',
     'Los tickets que registres llegan directamente a su bandeja de atención.'
   ], 'Tickets', false, 8)
on conflict (slug) do update
  set title = excluded.title,
      excerpt = excluded.excerpt,
      body = excluded.body,
      category = excluded.category,
      is_popular = excluded.is_popular,
      sort_order = excluded.sort_order;

-- ------------------------- Canales de atención -------------------------

insert into public.support_channels (name, type, value, hours, description, sort_order)
select v.name, v.type, v.value, v.hours, v.description, v.sort_order
from (
  values
    ('Mesa de ayuda telefónica', 'phone'::public.support_channel_type,
     '+51 1 315 9600', 'Lunes a viernes, 08:00 - 20:00',
     'Atención inmediata para casos urgentes o bloqueo de cuenta.', 1),
    ('Correo del SAE', 'email'::public.support_channel_type,
     'sae.limasur@utp.edu.pe', 'Respuesta en 24 horas hábiles',
     'Envíanos capturas o documentos si tu caso requiere detalle.', 2),
    ('WhatsApp SAE', 'whatsapp'::public.support_channel_type,
     '+51 999 888 777', 'Lunes a sábado, 09:00 - 18:00',
     'Consultas rápidas sobre ubicación de aulas y servicios.', 3),
    ('Oficina de atención', 'office'::public.support_channel_type,
     'Pabellón A, primer piso, oficina A-105', 'Lunes a viernes, 08:00 - 18:00',
     'Atención presencial con tu carné universitario.', 4)
) as v(name, type, value, hours, description, sort_order)
where not exists (
  select 1 from public.support_channels sc where sc.name = v.name
);

-- ------------------------- Avisos -------------------------

insert into public.announcements (title, body, tag, icon, tone, is_published)
select v.title, v.body, v.tag, v.icon, v.tone, true
from (
  values
    ('Mantenimiento de Wi-Fi en el Pabellón C',
     'El sábado de 08:00 a 12:00 se realizarán trabajos de red. Usa el Pabellón B como alternativa.',
     'Red', 'wifi', 'info'),
    ('Feria de prácticas profesionales',
     'Jueves 21, 11:00 a 15:00 en el patio central. Habrá 18 empresas y asesoría de CV.',
     'Evento', 'megaphone', 'info')
) as v(title, body, tag, icon, tone)
where not exists (
  select 1 from public.announcements a where a.title = v.title
);
