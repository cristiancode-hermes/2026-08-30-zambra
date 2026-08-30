import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import {
  Addon,
  Order,
  OrderLine,
  Review,
  Seat,
  Show,
  ShowSeat,
  User,
  Zone,
} from '../entities/entities';
import { addMadridDays, madridDate, madridParts } from '../time/madrid';

const PALOS = [
  { palo: 'solea', title: 'Soleá de umbral', company: 'Cuadro La Candela' },
  { palo: 'seguiriyas', title: 'Seguiriyas del pozo', company: 'Hermanas del Yeso' },
  { palo: 'bulerias', title: 'Bulerías de patio', company: 'Los del Anillo' },
  { palo: 'alegrias', title: 'Alegrías de cal', company: 'Compañía Encarnado' },
] as const;

const PHOTOS = [
  '/assets/cueva-solea.svg',
  '/assets/cueva-seguiriyas.svg',
  '/assets/cueva-bulerias.svg',
  '/assets/cueva-alegrias.svg',
];

type SeatDef = {
  zone: string;
  tableLabel: string;
  chairIndex: number;
  label: string;
  x: number;
  y: number;
};

function layout(): SeatDef[] {
  const out: SeatDef[] = [];
  const candil: Array<[string, number, number, number]> = [
    ['C1', 1, 44, 28],
    ['C1', 2, 56, 28],
    ['C2', 1, 68, 40],
    ['C2', 2, 68, 52],
    ['C3', 1, 44, 64],
    ['C3', 2, 56, 64],
    ['C4', 1, 32, 40],
    ['C4', 2, 32, 52],
  ];
  for (const [t, i, x, y] of candil) {
    out.push({ zone: 'candil', tableLabel: t, chairIndex: i, label: `${t}-${i}`, x, y });
  }
  const anilloTables: Array<[string, number, number]> = [
    ['A1', 74, 24],
    ['A2', 74, 68],
    ['A3', 26, 68],
    ['A4', 26, 24],
  ];
  const offsets = [
    [-6, -5],
    [6, -5],
    [-6, 5],
    [6, 5],
  ];
  for (const [t, cx, cy] of anilloTables) {
    offsets.forEach(([dx, dy], idx) => {
      out.push({
        zone: 'anillo',
        tableLabel: t,
        chairIndex: idx + 1,
        label: `${t}-${idx + 1}`,
        x: cx + dx,
        y: cy + dy,
      });
    });
  }
  for (let i = 0; i < 8; i++) {
    out.push({
      zone: 'grada',
      tableLabel: 'G',
      chairIndex: i + 1,
      label: `G-${String(i + 1).padStart(2, '0')}`,
      x: 18 + i * 9,
      y: 8,
    });
  }
  for (let i = 0; i < 6; i++) {
    out.push({
      zone: 'barra',
      tableLabel: 'B',
      chairIndex: i + 1,
      label: `B-${String(i + 1).padStart(2, '0')}`,
      x: 22 + i * 11,
      y: 91,
    });
  }
  return out;
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(ShowSeat) private readonly showSeats: Repository<ShowSeat>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async onModuleInit() {
    if (this.config.get('SEED_DB', 'true') !== 'true') return;
    const n = await this.users.count();
    if (n > 0) {
      this.log.log('Seed skipped (users already present)');
      return;
    }
    await this.seed();
  }

  async reset() {
    await this.reviews.clear();
    await this.lines.clear();
    await this.orders.clear();
    await this.showSeats.clear();
    await this.seats.clear();
    await this.shows.clear();
    await this.addons.clear();
    await this.zones.clear();
    await this.users.clear();
    await this.seed();
    return { ok: true };
  }

  async seed() {
    const hash = await bcrypt.hash('demo1234', 10);
    const demo = (await this.users.save({
      username: 'demo',
      email: 'demo@zambra.dev',
      passwordHash: hash,
      role: 'client',
      displayName: 'Lola del Yeso',
    } as any)) as User;
    const staff = (await this.users.save({
      username: 'umbral',
      email: 'staff@zambra.dev',
      passwordHash: hash,
      role: 'staff',
      displayName: 'Portero del umbral',
    } as any)) as User;
    const other = (await this.users.save({
      username: 'rafa',
      email: 'rafa@zambra.dev',
      passwordHash: hash,
      role: 'client',
      displayName: 'Rafa Anillo',
    } as any)) as User;
    void staff;
    void other;

    const zoneRows: Zone[] = [];
    const zoneDefs = [
      { slug: 'candil', name: 'Candil', priceCents: 4500, tags: { ring: 'inner' } },
      { slug: 'anillo', name: 'Anillo', priceCents: 3200, tags: { ring: 'mid' } },
      { slug: 'grada', name: 'Grada', priceCents: 2200, tags: { ring: 'rear' } },
      { slug: 'barra', name: 'Barra', priceCents: 1800, tags: { ring: 'bar' } },
    ];
    for (const z of zoneDefs) {
      zoneRows.push((await this.zones.save(z as any)) as Zone);
    }
    const zoneBy = new Map(zoneRows.map((z) => [z.slug, z]));

    const seatRows: Seat[] = [];
    for (const d of layout()) {
      const z = zoneBy.get(d.zone)!;
      seatRows.push(
        (await this.seats.save({
          zoneId: z.id,
          tableLabel: d.tableLabel,
          chairIndex: d.chairIndex,
          label: d.label,
          x: d.x,
          y: d.y,
        } as any)) as Seat,
      );
    }

    await this.addons.save({ slug: 'copa', name: 'Copa de jerez', priceCents: 600 } as any);
    await this.addons.save({ slug: 'racion', name: 'Ración de mojama', priceCents: 900 } as any);

    const now = new Date();
    const today = madridParts(now);
    const hours = [19, 21, 22];
    const showRows: Show[] = [];

    // Two past nights (for used tickets / points)
    for (const back of [-2, -1]) {
      const day = addMadridDays(now, back);
      const pal = PALOS[(back + 8) % PALOS.length];
      showRows.push(
        (await this.shows.save({
          palo: pal.palo,
          title: pal.title,
          company: pal.company,
          startsAt: madridDate(day.y, day.m, day.day, 21, 0),
          durationMin: 80,
          photoUrl: PHOTOS[(back + 8) % PHOTOS.length],
          notes: { paloNotes: pal.palo },
        } as any)) as Show,
      );
    }

    for (let d = 0; d < 14; d++) {
      const day = addMadridDays(now, d);
      const nShows = d % 3 === 0 ? 2 : 1;
      for (let i = 0; i < nShows; i++) {
        const pal = PALOS[(d + i) % PALOS.length];
        const hour = hours[(d + i) % hours.length];
        // skip if today and hour already passed
        if (d === 0 && hour <= today.h) continue;
        showRows.push(
          (await this.shows.save({
            palo: pal.palo,
            title: pal.title,
            company: pal.company,
            startsAt: madridDate(day.y, day.m, day.day, hour, 0),
            durationMin: 75 + (i % 2) * 10,
            photoUrl: PHOTOS[(d + i) % PHOTOS.length],
            notes: { paloNotes: pal.palo, cuadro: pal.company },
          } as any)) as Show,
        );
      }
    }

    for (const show of showRows) {
      for (const seat of seatRows) {
        await this.showSeats.save({
          showId: show.id,
          seatId: seat.id,
          status: 'free',
          orderId: null,
        } as any);
      }
    }

    const origin = (this.config.get<string>('WEB_ORIGIN') || 'http://localhost:3079').replace(/\/$/, '');

    const past = showRows[0];
    const future = showRows.find((s) => s.startsAt.getTime() > Date.now() + 26 * 3600 * 1000) || showRows[showRows.length - 1];

    const candilSeats = seatRows.filter((s) => s.label.startsWith('C1'));
    await this.placeOrder(demo, past, candilSeats, 'used', origin, 'ZAMBDEMO');
    const anillo = seatRows.filter((s) => s.label.startsWith('A1')).slice(0, 2);
    await this.placeOrder(demo, future, anillo, 'paid', origin, 'ZAMBPAGO');

    const rafaSeats = seatRows.filter((s) => s.label.startsWith('G-')).slice(0, 1);
    const otherUser = await this.users.findOne({ where: { username: 'rafa' } });
    if (otherUser && rafaSeats.length) {
      await this.placeOrder(otherUser, future, rafaSeats, 'paid', origin, 'ZAMBRAFA');
    }

    await this.reviews.save({
      userId: demo.id,
      showId: past.id,
      rating: 5,
      body: 'El cante rozaba el yeso. Mesa C1, no se cambia.',
    } as any);

    this.log.log(`Seeded ${showRows.length} pases, ${seatRows.length} sillas, demo@zambra.dev`);
  }

  private async placeOrder(
    user: User,
    show: Show,
    seats: Seat[],
    status: 'paid' | 'used',
    origin: string,
    code: string,
  ) {
    const qrUrl = `${origin}/entrada/${code}`;
    const raw = await QRCode.toString(qrUrl, { type: 'svg', margin: 1, width: 240 });
    const qrSvg = raw.replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
    let total = 0;
    const zoneCache = new Map<string, Zone>();
    const order = (await this.orders.save({
      userId: user.id,
      showId: show.id,
      code,
      status,
      totalCents: 0,
      qrSvg,
      qrUrl,
      cancelledAt: null,
    } as any)) as Order;

    for (const seat of seats) {
      let zone = zoneCache.get(seat.zoneId);
      if (!zone) {
        zone = (await this.zones.findOne({ where: { id: seat.zoneId } })) as Zone;
        zoneCache.set(seat.zoneId, zone);
      }
      const price = zone.priceCents;
      total += price;
      await this.lines.save({
        orderId: order.id,
        kind: 'seat',
        seatId: seat.id,
        addonId: null,
        label: `${seat.label} · ${zone.name}`,
        unitPriceCents: price,
        qty: 1,
      } as any);
      const ss = await this.showSeats.findOne({ where: { showId: show.id, seatId: seat.id } });
      if (ss) {
        ss.status = 'sold';
        ss.orderId = order.id;
        await this.showSeats.save(ss);
      }
    }
    order.totalCents = total;
    await this.orders.save(order);
  }
}
