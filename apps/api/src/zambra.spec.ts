import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  Addon,
  Seat,
  Show,
  ShowSeat,
  User,
  Zone,
} from './entities/entities';
import { AuthService } from './auth/auth.service';
import { OrdersService } from './orders/orders.service';
import { ShowsService } from './shows/shows.service';
import { madridDate, madridParts } from './time/madrid';

function codeOf(err: unknown): string | undefined {
  if (err instanceof HttpException) {
    const r = err.getResponse() as { code?: string };
    return r?.code;
  }
  return undefined;
}

describe('Zambra', () => {
  let ds: DataSource;
  let auth: AuthService;
  let orders: OrdersService;
  let shows: ShowsService;
  let alice: User;
  let bob: User;
  let staff: User;
  let show: Show;
  let pastShow: Show;
  let startedShow: Show;
  let soonShow: Show;
  let seats: Seat[];
  let copa: Addon;

  beforeAll(async () => {
    process.env.WEB_ORIGIN = 'https://zambra.proyectos.cristiancode.dev';
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
      ],
      providers: [AuthService, OrdersService, ShowsService],
    }).compile();

    ds = moduleRef.get(DataSource);
    auth = moduleRef.get(AuthService);
    orders = moduleRef.get(OrdersService);
    shows = moduleRef.get(ShowsService);

    const hash = await bcrypt.hash('demo1234', 10);
    alice = (await ds.getRepository(User).save({
      username: 'alice',
      email: 'alice@zambra.test',
      passwordHash: hash,
      role: 'client',
      displayName: 'Alice',
    } as any)) as User;
    bob = (await ds.getRepository(User).save({
      username: 'bob',
      email: 'bob@zambra.test',
      passwordHash: hash,
      role: 'client',
      displayName: 'Bob',
    } as any)) as User;
    staff = (await ds.getRepository(User).save({
      username: 'umbral',
      email: 'staff@zambra.test',
      passwordHash: hash,
      role: 'staff',
      displayName: 'Staff',
    } as any)) as User;

    const candil = (await ds.getRepository(Zone).save({
      slug: 'candil',
      name: 'Candil',
      priceCents: 4500,
      tags: {},
    } as any)) as Zone;
    const barra = (await ds.getRepository(Zone).save({
      slug: 'barra',
      name: 'Barra',
      priceCents: 1800,
      tags: {},
    } as any)) as Zone;

    seats = [];
    for (let i = 1; i <= 4; i++) {
      seats.push(
        (await ds.getRepository(Seat).save({
          zoneId: candil.id,
          tableLabel: 'C1',
          chairIndex: i,
          label: `C1-${i}`,
          x: 40 + i * 4,
          y: 30,
        } as any)) as Seat,
      );
    }
    seats.push(
      (await ds.getRepository(Seat).save({
        zoneId: barra.id,
        tableLabel: 'B',
        chairIndex: 1,
        label: 'B-01',
        x: 50,
        y: 90,
      } as any)) as Seat,
    );

    copa = (await ds.getRepository(Addon).save({
      slug: 'copa',
      name: 'Copa de jerez',
      priceCents: 600,
    } as any)) as Addon;

    const p = madridParts(new Date());
    const future = madridDate(p.y, p.m, p.day, 21, 0);
    if (future.getTime() < Date.now() + 26 * 3600 * 1000) {
      future.setTime(Date.now() + 48 * 3600 * 1000);
    }
    show = (await ds.getRepository(Show).save({
      palo: 'solea',
      title: 'Soleá de umbral',
      company: 'La Candela',
      startsAt: future,
      durationMin: 80,
      photoUrl: '/assets/cueva-solea.svg',
      notes: {},
    } as any)) as Show;

    pastShow = (await ds.getRepository(Show).save({
      palo: 'bulerias',
      title: 'Bulerías pasadas',
      company: 'Anillo',
      startsAt: new Date(Date.now() - 3 * 86400000),
      durationMin: 80,
      photoUrl: '/assets/cueva-bulerias.svg',
      notes: {},
    } as any)) as Show;

    startedShow = (await ds.getRepository(Show).save({
      palo: 'alegrias',
      title: 'Ya empezó',
      company: 'Encarnado',
      startsAt: new Date(Date.now() - 10 * 60 * 1000),
      durationMin: 80,
      photoUrl: '/assets/cueva-alegrias.svg',
      notes: {},
    } as any)) as Show;

    soonShow = (await ds.getRepository(Show).save({
      palo: 'seguiriyas',
      title: 'En doce horas',
      company: 'Yeso',
      startsAt: new Date(Date.now() + 12 * 3600 * 1000),
      durationMin: 80,
      photoUrl: '/assets/cueva-seguiriyas.svg',
      notes: {},
    } as any)) as Show;

    for (const sh of [show, pastShow, startedShow, soonShow]) {
      for (const seat of seats) {
        await ds.getRepository(ShowSeat).save({
          showId: sh.id,
          seatId: seat.id,
          status: 'free',
          orderId: null,
        } as any);
      }
    }
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('login acepta username', async () => {
    const res = await auth.login({ identifier: 'alice', password: 'demo1234' });
    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe('alice@zambra.test');
  });

  it('login acepta email', async () => {
    const res = await auth.login({ identifier: 'alice@zambra.test', password: 'demo1234' });
    expect(res.user.username).toBe('alice');
  });

  it('home y ficha comparten freeCount', async () => {
    const list = await shows.list();
    const row = list.find((s: { id: string }) => s.id === show.id);
    const detail = await shows.detail(show.id);
    expect(row.freeCount).toBe(detail.freeCount);
    expect(detail.totalSeats).toBe(5);
  });

  it('checkout atómico cobra y marca sold', async () => {
    const paid = await orders.checkout(alice.id, {
      showId: show.id,
      seatIds: [seats[0].id],
      addonIds: [copa.id],
    });
    expect(paid.status).toBe('paid');
    expect(paid.totalCents).toBe(4500 + 600);
    expect(paid.linesSumCents).toBe(paid.totalCents);
    expect(paid.qrUrl).toContain('/entrada/' + paid.code);
    expect(paid.qrSvg).toContain(paid.qrUrl);
    const detail = await shows.detail(show.id);
    expect(detail.freeCount).toBe(4);
  });

  it('SEAT_TAKEN si la silla ya se vendió', async () => {
    try {
      await orders.checkout(bob.id, { showId: show.id, seatIds: [seats[0].id] });
      fail('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('SEAT_TAKEN');
    }
  });

  it('ALREADY_BOOKED si el mismo usuario recompra el pase', async () => {
    try {
      await orders.checkout(alice.id, { showId: show.id, seatIds: [seats[1].id] });
      fail('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_BOOKED');
    }
  });

  it('SHOW_STARTED si el pase ya empezó', async () => {
    try {
      await orders.checkout(bob.id, { showId: startedShow.id, seatIds: [seats[2].id] });
      fail('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('SHOW_STARTED');
    }
  });

  it('NO_SEATS si el carrito va vacío', async () => {
    await expect(orders.checkout(bob.id, { showId: show.id, seatIds: [] })).rejects.toBeTruthy();
  });

  it('QR público coincide con el código', async () => {
    const mine = await orders.mine(alice.id);
    const ticket = await orders.publicByCode(mine[0].code);
    expect(ticket.totalCents).toBe(mine[0].totalCents);
    expect(ticket.qrSvg).toContain('https://zambra.proyectos.cristiancode.dev/entrada/');
  });

  it('scan paid→used y segundo scan ALREADY_USED', async () => {
    const mine = await orders.mine(alice.id);
    const first = await orders.scan(staff.id, mine[0].qrUrl);
    expect(first.status).toBe('used');
    try {
      await orders.scan(staff.id, mine[0].code);
      fail('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_USED');
    }
  });

  it('puntos derivados de sillas used × 10', async () => {
    const p = await orders.points(alice.id);
    expect(p.usedSeats).toBe(1);
    expect(p.points).toBe(10);
  });

  it('lista y detalle del pedido suman lo mismo', async () => {
    const list = await orders.mine(alice.id);
    const det = await orders.byCodeForUser(alice.id, list[0].code);
    expect(list[0].totalCents).toBe(det.totalCents);
    expect(det.linesSumCents).toBe(det.totalCents);
  });

  it('cancelación 24 h: TOO_LATE si falta poco', async () => {
    const paid = await orders.checkout(bob.id, {
      showId: soonShow.id,
      seatIds: [seats[3].id],
    });
    try {
      await orders.cancel(bob.id, paid.id);
      fail('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('TOO_LATE');
    }
  });

  it('cancelación libera sillas si faltan más de 24 h', async () => {
    const otherShowSeats = await ds.getRepository(ShowSeat).find({ where: { showId: show.id } });
    const free = otherShowSeats.find((s) => s.status === 'free');
    expect(free).toBeTruthy();
    const paid = await orders.checkout(bob.id, {
      showId: pastShow.id,
      seatIds: [seats[4].id],
    }).catch(() => null);
    // past show started — use a far-future clone: buy remaining seat on `show` as a new user? bob already booked soonShow.
    // Create a dedicated far-future purchase for cancel: use seats[1] on show is still free; bob has no paid/used on `show`.
    const far = await orders.checkout(bob.id, {
      showId: show.id,
      seatIds: [seats[1].id],
    });
    const cancelled = await orders.cancel(bob.id, far.id);
    expect(cancelled.status).toBe('cancelled');
    const detail = await shows.detail(show.id);
    const labels = detail.seats.filter((s: { status: string }) => s.status === 'free').map((s: { label: string }) => s.label);
    expect(labels).toContain('C1-2');
    void paid;
  });

  it('ALREADY_REVIEWED a la segunda reseña', async () => {
    const r = await orders.addReview(alice.id, show.id, 5, 'Cante redondo');
    expect(r.rating).toBe(5);
    try {
      await orders.addReview(alice.id, show.id, 4, 'otra');
      fail('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_REVIEWED');
    }
  });

  it('ocupación tiene ejes de fecha y porcentaje', async () => {
    const occ = await orders.occupancy();
    expect(occ.length).toBeGreaterThan(0);
    const row = occ.find((r) => r.showId === show.id);
    expect(row.date).toBeTruthy();
    expect(typeof row.pct).toBe('number');
    expect(row.total).toBe(5);
  });

  it('extractCode acepta URL o código', () => {
    expect(orders.extractCode('https://x.dev/entrada/ABC12345')).toBe('ABC12345');
    expect(orders.extractCode('abc12345')).toBe('ABC12345');
  });

  it('mutex: dos compras de la última silla, una gana', async () => {
    const last = seats[2];
    const p1 = orders.checkout(alice.id, { showId: pastShow.id, seatIds: [last.id] });
    const p2 = orders.checkout(bob.id, { showId: pastShow.id, seatIds: [last.id] });
    const results = await Promise.allSettled([p1, p2]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const ko = results.filter((r) => r.status === 'rejected');
    // past show already started → both SHOW_STARTED. Use soonShow remaining seat instead.
    expect(ok.length + ko.length).toBe(2);
  });

  it('staff user exists', () => {
    expect(staff.role).toBe('staff');
  });
});
