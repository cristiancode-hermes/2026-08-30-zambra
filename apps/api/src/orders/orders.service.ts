import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import {
  Addon,
  CheckIn,
  Order,
  OrderLine,
  Review,
  Seat,
  Show,
  ShowSeat,
  User,
} from '../entities/entities';

const COPY = {
  SEAT_TAKEN: 'Esa silla ya tiene dueño en este pase. Elige otra.',
  ALREADY_BOOKED: 'Ya tienes entrada para este pase. Ábrela en Mis entradas.',
  SHOW_STARTED: 'Este pase ya empezó.',
  TOO_LATE: 'Faltan menos de 24 h; no se puede cancelar.',
  ALREADY_USED: 'Esta entrada ya se usó.',
  ALREADY_REVIEWED: 'Ya contaste este pase.',
  NO_SEATS: 'Elige al menos una silla.',
  NOT_FOUND: 'No encontramos esa entrada.',
};

function conflict(code: keyof typeof COPY) {
  throw new HttpException({ code, message: COPY[code] }, 409);
}

let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(ShowSeat) private readonly showSeats: Repository<ShowSeat>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  webOrigin(): string {
    return (this.config.get<string>('WEB_ORIGIN') || 'http://localhost:3079').replace(/\/$/, '');
  }

  async buildQr(qrUrl: string): Promise<string> {
    const svg = await QRCode.toString(qrUrl, { type: 'svg', margin: 1, width: 240 });
    return svg.replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
  }

  async checkout(userId: string, dto: { showId: string; seatIds: string[]; addonIds?: string[] }) {
    const seatIds = [...new Set((dto.seatIds || []).filter(Boolean))];
    if (!seatIds.length) {
      throw new BadRequestException({ code: 'NO_SEATS', message: COPY.NO_SEATS });
    }
    return withLock(() => this.checkoutLocked(userId, dto.showId, seatIds, dto.addonIds || []));
  }

  private async checkoutLocked(userId: string, showId: string, seatIds: string[], addonIds: string[]) {
    const show = await this.shows.findOne({ where: { id: showId } });
    if (!show) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ese pase no está en cartelera.' });
    if (show.startsAt.getTime() <= Date.now()) conflict('SHOW_STARTED');

    const existing = await this.orders.findOne({
      where: [
        { userId, showId, status: 'paid' },
        { userId, showId, status: 'used' },
      ],
    });
    if (existing) conflict('ALREADY_BOOKED');

    const supportsLock = this.ds.options.type !== 'better-sqlite3';

    return this.ds.transaction(async (manager) => {
      let qb = manager
        .getRepository(ShowSeat)
        .createQueryBuilder('ss')
        .where('ss.showId = :showId AND ss.seatId IN (:...seatIds)', { showId, seatIds });
      if (supportsLock) qb = qb.setLock('pessimistic_write');
      const rows = await qb.getMany();
      if (rows.length !== seatIds.length) {
        throw new BadRequestException({ code: 'NO_SEATS', message: 'Alguna silla no pertenece a este pase.' });
      }
      if (rows.some((r) => r.status !== 'free')) conflict('SEAT_TAKEN');

      const seatEntities = await manager.getRepository(Seat).find({
        where: { id: In(seatIds) },
        relations: { zone: true },
      });
      const seatMap = new Map(seatEntities.map((s) => [s.id, s]));

      const uniqueAddons = [...new Set(addonIds.filter(Boolean))];
      const addonEntities = uniqueAddons.length
        ? await manager.getRepository(Addon).find({ where: { id: In(uniqueAddons) } })
        : [];

      let total = 0;
      const lineDefs: Array<{
        kind: 'seat' | 'addon';
        seatId: string | null;
        addonId: string | null;
        label: string;
        unitPriceCents: number;
        qty: number;
      }> = [];
      for (const sid of seatIds) {
        const seat = seatMap.get(sid);
        if (!seat || !seat.zone) throw new BadRequestException('Silla desconocida');
        const price = seat.zone.priceCents;
        total += price;
        lineDefs.push({
          kind: 'seat',
          seatId: sid,
          addonId: null,
          label: `${seat.label} · ${seat.zone.name}`,
          unitPriceCents: price,
          qty: 1,
        });
      }
      for (const ad of addonEntities) {
        total += ad.priceCents;
        lineDefs.push({
          kind: 'addon',
          seatId: null,
          addonId: ad.id,
          label: ad.name,
          unitPriceCents: ad.priceCents,
          qty: 1,
        });
      }

      let code = randomCode();
      for (let i = 0; i < 6; i++) {
        const clash = await manager.getRepository(Order).findOne({ where: { code } });
        if (!clash) break;
        code = randomCode();
      }
      const qrUrl = `${this.webOrigin()}/entrada/${code}`;
      const qrSvg = await this.buildQr(qrUrl);

      const order = (await manager.getRepository(Order).save({
        userId,
        showId,
        code,
        status: 'paid',
        totalCents: total,
        qrSvg,
        qrUrl,
        cancelledAt: null,
      } as any)) as Order;

      for (const def of lineDefs) {
        await manager.getRepository(OrderLine).save({
          orderId: order.id,
          ...def,
        } as any);
      }
      for (const row of rows) {
        row.status = 'sold';
        row.orderId = order.id;
        await manager.getRepository(ShowSeat).save(row);
      }

      return this.serialize(await this.reload(manager, order.id), true);
    });
  }

  private async reload(manager: { getRepository: DataSource['getRepository'] } | DataSource, id: string) {
    const repo = 'getRepository' in manager ? manager.getRepository(Order) : this.orders;
    const order = await repo.findOne({
      where: { id },
      relations: { lines: true, show: true, user: true },
    });
    if (!order) throw new NotFoundException(COPY.NOT_FOUND);
    return order;
  }

  async mine(userId: string) {
    const list = await this.orders.find({
      where: { userId },
      relations: { lines: true, show: true },
      order: { createdAt: 'DESC' },
    });
    return list.map((o) => this.serialize(o, true));
  }

  async byCodeForUser(userId: string, code: string) {
    const order = await this.orders.findOne({
      where: { code: code.toUpperCase() },
      relations: { lines: true, show: true },
    });
    if (!order || order.userId !== userId) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
    return this.serialize(order, true);
  }

  async publicByCode(code: string) {
    const order = await this.orders.findOne({
      where: { code: this.extractCode(code) },
      relations: { lines: true, show: true },
    });
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
    return this.serialize(order, true);
  }

  extractCode(raw: string): string {
    const t = (raw || '').trim();
    const m = t.match(/entrada\/([A-Z0-9]{6,12})/i);
    return (m ? m[1] : t).toUpperCase();
  }

  async cancel(userId: string, id: string) {
    return withLock(async () => {
      const order = await this.orders.findOne({
        where: { id },
        relations: { show: true, lines: true },
      });
      if (!order || order.userId !== userId) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
      if (order.status === 'used') conflict('ALREADY_USED');
      if (order.status === 'cancelled') return this.serialize(order, true);
      if (!order.show) throw new NotFoundException(COPY.NOT_FOUND);
      const ms = order.show.startsAt.getTime() - Date.now();
      if (ms < 24 * 3600 * 1000) conflict('TOO_LATE');

      await this.ds.transaction(async (manager) => {
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        await manager.getRepository(Order).save(order);
        const sold = await manager.getRepository(ShowSeat).find({ where: { orderId: order.id } });
        for (const ss of sold) {
          ss.status = 'free';
          ss.orderId = null;
          await manager.getRepository(ShowSeat).save(ss);
        }
      });
      const fresh = await this.orders.findOne({
        where: { id: order.id },
        relations: { lines: true, show: true },
      });
      return this.serialize(fresh!, true);
    });
  }

  async points(userId: string) {
    const used = await this.orders.find({
      where: { userId, status: 'used' },
      relations: { lines: true },
    });
    let usedSeats = 0;
    for (const o of used) {
      for (const l of o.lines || []) {
        if (l.kind === 'seat') usedSeats += l.qty;
      }
    }
    return { points: usedSeats * 10, usedSeats };
  }

  async occupancy() {
    const shows = await this.shows.find({ order: { startsAt: 'ASC' } });
    const seats = await this.showSeats.find();
    const by = new Map<string, { free: number; total: number }>();
    for (const s of shows) by.set(s.id, { free: 0, total: 0 });
    for (const ss of seats) {
      const b = by.get(ss.showId);
      if (!b) continue;
      b.total += 1;
      if (ss.status === 'free') b.free += 1;
    }
    return shows.map((s) => {
      const b = by.get(s.id) || { free: 0, total: 0 };
      const pct = b.total ? Math.round((100 * (b.total - b.free)) / b.total) : 0;
      return {
        showId: s.id,
        title: s.title,
        palo: s.palo,
        date: s.startsAt.toISOString(),
        free: b.free,
        total: b.total,
        pct,
      };
    });
  }

  async scan(staffId: string, codeOrUrl: string) {
    const code = this.extractCode(codeOrUrl);
    return withLock(async () => {
      const order = await this.orders.findOne({
        where: { code },
        relations: { lines: true, show: true },
      });
      if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
      if (order.status === 'cancelled') {
        throw new BadRequestException({ code: 'CANCELLED', message: 'Esta entrada está cancelada.' });
      }
      if (order.status === 'used') conflict('ALREADY_USED');
      order.status = 'used';
      await this.orders.save(order);
      await this.checkIns.save({
        orderId: order.id,
        staffId,
        rawInput: codeOrUrl,
        scannedAt: new Date(),
      } as any);
      const fresh = await this.orders.findOne({
        where: { id: order.id },
        relations: { lines: true, show: true },
      });
      return { order: this.serialize(fresh!, true), status: 'used' };
    });
  }

  async addReview(userId: string, showId: string, rating: number, body?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('La nota va de 1 a 5.');
    const used = await this.orders.findOne({ where: { userId, showId, status: 'used' } });
    if (!used) throw new ForbiddenException('Solo se reseña un pase que ya viviste.');
    const prev = await this.reviews.findOne({ where: { userId, showId } });
    if (prev) conflict('ALREADY_REVIEWED');
    const row = (await this.reviews.save({
      userId,
      showId,
      rating,
      body: body?.trim() || null,
    } as any)) as Review;
    return row;
  }

  async reviewsForShow(showId: string) {
    return this.reviews.find({ where: { showId }, order: { createdAt: 'DESC' } });
  }

  serialize(order: Order, withQr: boolean) {
    const lines = (order.lines || []).map((l) => ({
      id: l.id,
      kind: l.kind,
      seatId: l.seatId,
      addonId: l.addonId,
      label: l.label,
      unitPriceCents: l.unitPriceCents,
      qty: l.qty,
      subtotalCents: l.unitPriceCents * l.qty,
    }));
    const sum = lines.reduce((a, l) => a + l.subtotalCents, 0);
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      totalCents: order.totalCents,
      linesSumCents: sum,
      createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
      showId: order.showId,
      show: order.show
        ? {
            id: order.show.id,
            title: order.show.title,
            palo: order.show.palo,
            company: order.show.company,
            startsAt: order.show.startsAt.toISOString(),
            photoUrl: order.show.photoUrl,
            durationMin: order.show.durationMin,
          }
        : null,
      lines,
      qrSvg: withQr ? order.qrSvg : undefined,
      qrUrl: withQr ? order.qrUrl : undefined,
    };
  }
}
