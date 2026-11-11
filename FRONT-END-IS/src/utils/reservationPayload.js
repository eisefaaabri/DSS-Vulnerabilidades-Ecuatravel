import { isUuidV4 } from './jwt';

function throwValidation(msg) {
  const e = new Error(msg);
  e.name = 'ReservationValidationError';
  throw e;
}

/** Payload alineado con ReservationRequestDto (class-validator / IsInt). */
export function buildReservationPayload({ date, time, ticketCount, customerName, customerEmail }) {
  const trimmedDate = String(date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    throwValidation('Selecciona una fecha válida (AAAA-MM-DD).');
  }

  const tickets = parseInt(String(ticketCount), 10);
  if (!Number.isInteger(tickets) || tickets < 1) {
    throwValidation('La cantidad de pasajeros debe ser un número entero mayor o igual a 1.');
  }

  const name = String(customerName ?? '').trim();
  if (name.length < 2) {
    throwValidation('Indica el nombre del titular (mínimo 2 caracteres).');
  }

  const payload = {
    date: trimmedDate,
    ticket_count: tickets,
    customer_name: name,
  };

  const slot = String(time ?? '').trim();
  if (slot) {
    payload.time = slot;
  }

  const email = String(customerEmail ?? '').trim();
  if (email) {
    payload.customer_email = email;
  }

  return payload;
}

export function assertAtraccionIdUuid(atraccionId) {
  if (!isUuidV4(atraccionId)) {
    throwValidation('ID de atracción inválido (se esperaba UUID v4).');
  }
}
