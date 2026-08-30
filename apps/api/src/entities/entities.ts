import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'client' })
  role: 'client' | 'staff';

  @Column({ type: 'varchar', length: 80, nullable: true })
  displayName: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Order, (o) => o.user)
  orders?: Order[];
}

@Entity({ name: 'zones' })
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'simple-json', default: '{}' })
  tags: Record<string, string>;

  @OneToMany(() => Seat, (s) => s.zone)
  seats?: Seat[];
}

@Entity({ name: 'seats' })
@Unique(['label'])
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  zoneId: string;

  @ManyToOne(() => Zone, (z) => z.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zoneId' })
  zone?: Zone;

  @Column({ type: 'varchar' })
  tableLabel: string;

  @Column({ type: 'int' })
  chairIndex: number;

  @Column({ type: 'varchar', unique: true })
  label: string;

  @Column({ type: 'real' })
  x: number;

  @Column({ type: 'real' })
  y: number;
}

@Entity({ name: 'shows' })
@Index(['startsAt'])
export class Show {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  palo: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  company: string;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'int' })
  durationMin: number;

  @Column({ type: 'varchar' })
  photoUrl: string;

  @Column({ type: 'simple-json', default: '{}' })
  notes: Record<string, string>;

  @OneToMany(() => ShowSeat, (ss) => ss.show)
  showSeats?: ShowSeat[];
}

@Entity({ name: 'show_seats' })
@Unique(['showId', 'seatId'])
@Index(['showId', 'status'])
export class ShowSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  showId: string;

  @ManyToOne(() => Show, (s) => s.showSeats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showId' })
  show?: Show;

  @Column({ type: 'varchar' })
  seatId: string;

  @ManyToOne(() => Seat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatId' })
  seat?: Seat;

  @Column({ type: 'varchar', default: 'free' })
  status: 'free' | 'sold';

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;
}

@Entity({ name: 'addons' })
export class Addon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;
}

@Entity({ name: 'orders' })
@Index(['userId', 'showId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u) => u.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  showId: string;

  @ManyToOne(() => Show, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showId' })
  show?: Show;

  @Column({ type: 'varchar', unique: true, length: 12 })
  code: string;

  @Column({ type: 'varchar' })
  status: 'paid' | 'used' | 'cancelled';

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ type: 'text' })
  qrSvg: string;

  @Column({ type: 'varchar' })
  qrUrl: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => OrderLine, (l) => l.order)
  lines?: OrderLine[];

  @OneToMany(() => CheckIn, (c) => c.order)
  checkIns?: CheckIn[];
}

@Entity({ name: 'order_lines' })
export class OrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'varchar' })
  kind: 'seat' | 'addon';

  @Column({ type: 'varchar', nullable: true })
  seatId: string | null;

  @Column({ type: 'varchar', nullable: true })
  addonId: string | null;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'int' })
  unitPriceCents: number;

  @Column({ type: 'int', default: 1 })
  qty: number;
}

@Entity({ name: 'reviews' })
@Unique(['userId', 'showId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  showId: string;

  @ManyToOne(() => Show, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showId' })
  show?: Show;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity({ name: 'check_ins' })
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'varchar' })
  staffId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff?: User;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  scannedAt: Date;

  @Column({ type: 'varchar' })
  rawInput: string;
}

export const ALL_ENTITIES = [
  User,
  Zone,
  Seat,
  Show,
  ShowSeat,
  Addon,
  Order,
  OrderLine,
  Review,
  CheckIn,
];
