/**
 * Normaliza la entidad `Atraccion` de la API de Atracciones.
 * Campos reales del backend (src/modules/atracciones/entities/atraccion.entity.ts):
 * id, nombre, descripcion, precio_base, capacidad_diaria, codigo_aeropuerto,
 * foto_url, estado, duracion_horas, incluye[], itinerario,
 * created_at, updated_at, deleted_at.
 */
export function normalizeAtraccion(raw) {
  if (!raw) return null;
  const horas = raw.duracion_horas ?? null;
  return {
    id: raw.id,
    nombre: raw.nombre ?? raw.name ?? 'Experiencia',
    descripcion: raw.descripcion ?? raw.long_description ?? '',
    precio_base: Number(raw.precio_base ?? raw.price?.amount ?? raw.price ?? 0),
    capacidad_diaria:
      raw.capacidad_diaria != null ? Number(raw.capacidad_diaria) : null,
    codigo_aeropuerto: raw.codigo_aeropuerto ?? raw.locations?.[0]?.code ?? 'ECU',
    estado: raw.estado ?? 'ACTIVA',
    duracion_horas: horas != null ? Number(horas) : null,
    duracion: horas != null ? `${Number(horas)} h` : (raw.duracion ?? raw.duration ?? null),
    incluye: Array.isArray(raw.incluye) ? raw.incluye : raw.includes ?? [],
    itinerario: raw.itinerario ?? raw.itinerary ?? null,
    foto: raw.foto_url ?? raw.foto ?? raw.photos?.[0]?.url ?? null,
  };
}

export function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

/** Imagen de la atracción; si no existe `foto_url`, usa un placeholder estable por id. */
export function attractionImageUrl(atraccion, width = 800) {
  const a = normalizeAtraccion(atraccion);
  if (!a) return '';
  if (a.foto) return a.foto;
  return `https://images.unsplash.com/photo-1590496889812-706f9d371457?auto=format&fit=crop&w=${width}&q=75&sig=${encodeURIComponent(a.id ?? 'ec')}`;
}

export function attractionThumbUrl(atraccion) {
  return attractionImageUrl(atraccion, 600);
}
