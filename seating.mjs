const validId = value => typeof value === 'string' && /^[\w:-]{1,100}$/.test(value);
export function seatingGuests(records, names = {}) {
  return records.filter(record => record.attendance === 'yes').flatMap(record => Array.from({ length: record.guests }, (_, i) => {
    const id = record.id + ':' + (i + 1);
    const defaultName = i === 0 ? record.name : record.companions?.[i - 1] || `Acompañante ${i} de ${record.name}`;
    return { id, rsvpId: record.id, position: i + 1, name: names[id] || defaultName, defaultName, group: record.name };
  }));
}
export function validateSeating(input, current, records) {
  if (!input || !Number.isInteger(input.revision) || input.revision !== current.revision) return { status: 409, error: 'La distribución cambió en otra ventana. Actualiza antes de guardar.' };
  if (!Array.isArray(input.tables) || input.tables.length > 200 || !Array.isArray(input.assignments) || input.assignments.length > 80000 || !input.names || typeof input.names !== 'object' || Array.isArray(input.names)) return { status: 400, error: 'La distribución no es válida.' };
  const tables = new Map(), numbers = new Set(), people = new Set(), seats = new Set();
  const guests = new Set(seatingGuests(records).map(guest => guest.id));
  for (const table of input.tables) {
    if (!table || !validId(table.id) || tables.has(table.id) || !Number.isInteger(table.number) || table.number < 1 || table.number > 999 || numbers.has(table.number) || typeof table.name !== 'string' || table.name.length > 80 || !Number.isInteger(table.capacity) || table.capacity < 1 || table.capacity > 20) return { status: 400, error: 'Cada mesa necesita un número único y entre 1 y 20 sillas.' };
    tables.set(table.id, { id: table.id, number: table.number, name: table.name.trim(), capacity: table.capacity }); numbers.add(table.number);
  }
  const assignments = [];
  for (const assignment of input.assignments) {
    if (!assignment || !guests.has(assignment.guestId) || !tables.has(assignment.tableId) || !Number.isInteger(assignment.seat) || assignment.seat < 1 || assignment.seat > tables.get(assignment.tableId).capacity || people.has(assignment.guestId) || seats.has(assignment.tableId + ':' + assignment.seat)) return { status: 400, error: 'Hay una silla duplicada, fuera de capacidad o una persona sin confirmación.' };
    people.add(assignment.guestId); seats.add(assignment.tableId + ':' + assignment.seat);
    assignments.push({ guestId: assignment.guestId, tableId: assignment.tableId, seat: assignment.seat });
  }
  const names = {};
  for (const [id, name] of Object.entries(input.names)) {
    if (!guests.has(id) || typeof name !== 'string' || name.length > 100) return { status: 400, error: 'Revisa los nombres de los invitados.' };
    if (name.trim()) names[id] = name.trim();
  }
  return { value: { revision: current.revision + 1, tables: [...tables.values()].sort((a, b) => a.number - b.number), assignments, names } };
}
