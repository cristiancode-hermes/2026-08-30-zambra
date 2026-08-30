import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Addon, Seat, Show, ShowSeat, Zone } from '../entities/entities';
import { addMadridDays, madridDate, madridParts } from '../time/madrid';

@Injectable()
export class ShowsService {
  constructor(
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(ShowSeat) private readonly showSeats: Repository<ShowSeat>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
  ) {}

  async list() {
    const now = new Date();
    const start = madridParts(now);
    const from = madridDate(start.y, start.m, start.day, 0, 0);
    const endDay = addMadridDays(now, 14);
    const to = madridDate(endDay.y, endDay.m, endDay.day, 23, 59);
    const rows = await this.shows
      .createQueryBuilder('s')
      .where('s.startsAt >= :from AND s.startsAt <= :to', { from, to })
      .orderBy('s.startsAt', 'ASC')
      .getMany();
    const fromPriceCents = await this.minZonePriceCents();
    return this.withFreeCounts(rows, fromPriceCents);
  }

  async detail(id: string) {
    const show = await this.shows.findOne({ where: { id } });
    if (!show) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ese pase no está en cartelera.' });
    const seats = await this.showSeats.find({
      where: { showId: id },
      relations: { seat: { zone: true } },
    });
    const freeCount = seats.filter((s) => s.status === 'free').length;
    const seatPrices = seats
      .map((ss) => ss.seat?.zone?.priceCents)
      .filter((n): n is number => typeof n === 'number');
    const fromPriceCents = seatPrices.length
      ? Math.min(...seatPrices)
      : await this.minZonePriceCents();
    return {
      ...this.serializeShow(show, freeCount, seats.length, fromPriceCents),
      seats: seats.map((ss) => ({
        showSeatId: ss.id,
        seatId: ss.seatId,
        status: ss.status,
        label: ss.seat?.label,
        tableLabel: ss.seat?.tableLabel,
        chairIndex: ss.seat?.chairIndex,
        x: ss.seat?.x,
        y: ss.seat?.y,
        zoneSlug: ss.seat?.zone?.slug,
        zoneName: ss.seat?.zone?.name,
        priceCents: ss.seat?.zone?.priceCents,
      })),
    };
  }

  async zonesAll() {
    return this.zones.find({ order: { priceCents: 'DESC' } });
  }

  async addonsAll() {
    return this.addons.find({ order: { priceCents: 'ASC' } });
  }

  private async minZonePriceCents(): Promise<number> {
    const zones = await this.zones.find();
    if (!zones.length) return 0;
    return Math.min(...zones.map((z) => z.priceCents));
  }

  private async withFreeCounts(rows: Show[], fromPriceCents: number) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const seats = await this.showSeats.find({ where: { showId: In(ids) } });
    const byShow = new Map<string, { free: number; total: number }>();
    for (const id of ids) byShow.set(id, { free: 0, total: 0 });
    for (const ss of seats) {
      const b = byShow.get(ss.showId);
      if (!b) continue;
      b.total += 1;
      if (ss.status === 'free') b.free += 1;
    }
    return rows.map((s) => {
      const b = byShow.get(s.id) || { free: 0, total: 0 };
      return this.serializeShow(s, b.free, b.total, fromPriceCents);
    });
  }

  serializeShow(s: Show, freeCount: number, totalSeats: number, fromPriceCents: number) {
    return {
      id: s.id,
      palo: s.palo,
      title: s.title,
      company: s.company,
      startsAt: s.startsAt.toISOString(),
      durationMin: s.durationMin,
      photoUrl: s.photoUrl,
      notes: s.notes,
      freeCount,
      totalSeats,
      fromPriceCents,
    };
  }
}
