export const TOKEN_KEY = 'zambra.token';
export const THEME_KEY = 'zambra-theme';
export const SELECT_KEY = 'zambra.selection';
export const API = '/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'client' | 'staff';
  displayName: string | null;
}

export interface ShowCard {
  id: string;
  palo: string;
  title: string;
  company: string;
  startsAt: string;
  durationMin: number;
  photoUrl: string;
  freeCount: number;
  totalSeats: number;
}

export interface SeatView {
  showSeatId: string;
  seatId: string;
  status: 'free' | 'sold';
  label: string;
  tableLabel: string;
  chairIndex: number;
  x: number;
  y: number;
  zoneSlug: string;
  zoneName: string;
  priceCents: number;
}

export interface ShowDetail extends ShowCard {
  seats: SeatView[];
}

export interface Addon {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
}

export interface Zone {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
}

export interface OrderLine {
  id: string;
  kind: 'seat' | 'addon';
  seatId: string | null;
  addonId: string | null;
  label: string;
  unitPriceCents: number;
  qty: number;
  subtotalCents: number;
}

export interface OrderView {
  id: string;
  code: string;
  status: 'paid' | 'used' | 'cancelled';
  totalCents: number;
  linesSumCents: number;
  createdAt: string;
  cancelledAt: string | null;
  showId: string;
  show: {
    id: string;
    title: string;
    palo: string;
    company: string;
    startsAt: string;
    photoUrl: string;
    durationMin: number;
  } | null;
  lines: OrderLine[];
  qrSvg?: string;
  qrUrl?: string;
}

export const PALO_LABEL: Record<string, string> = {
  solea: 'Soleá',
  seguiriyas: 'Seguiriyas',
  bulerias: 'Bulerías',
  alegrias: 'Alegrías',
};

export function eur(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function madridWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function humanizeApiError(err: unknown): string {
  const COPY: Record<string, string> = {
    SEAT_TAKEN: 'Esa silla ya tiene dueño en este pase. Elige otra.',
    ALREADY_BOOKED: 'Ya tienes entrada para este pase. Ábrela en Mis entradas.',
    SHOW_STARTED: 'Este pase ya empezó.',
    TOO_LATE: 'Faltan menos de 24 h; no se puede cancelar.',
    ALREADY_USED: 'Esta entrada ya se usó.',
    ALREADY_REVIEWED: 'Ya contaste este pase.',
    NO_SEATS: 'Elige al menos una silla.',
    NOT_FOUND: 'No encontramos esa entrada.',
    CANCELLED: 'Esta entrada está cancelada.',
  };
  const e = err as { error?: { code?: string; message?: string }; message?: string };
  const code = e?.error?.code;
  if (code && COPY[code]) return COPY[code];
  const raw = e?.error?.message || '';
  const head = raw.split(':')[0];
  if (head && COPY[head]) return COPY[head];
  if (raw && !raw.includes(':')) return raw;
  return 'No se pudo completar. Inténtalo de nuevo.';
}
