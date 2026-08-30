import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { eur, madridWhen, PALO_LABEL, SeatView, ShowDetail } from '../shared/models';

@Component({
  selector: 'app-show-detail',
  imports: [RouterLink],
  template: `
    <main class="page wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h1>Ese pase no está</h1>
          <p>{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/pases">Volver a pases</a>
        </section>
      } @else if (show(); as s) {
        <p class="palo">{{ palo(s.palo) }} · {{ s.company }}</p>
        <h1>{{ s.title }}</h1>
        <p class="muted">{{ when(s.startsAt) }} · {{ s.durationMin }} min · {{ s.freeCount }} libres de {{ s.totalSeats }}</p>
        <img [src]="s.photoUrl" [alt]="s.title" style="width:min(640px,100%);border-radius:12px;margin:16px 0;aspect-ratio:3/2;object-fit:cover" />

        <h2>Mapa de esta función</h2>
        <p class="muted">Mesas alrededor del óvalo, grada arriba, barra abajo. No es un cine.</p>
        <div class="seat-map" role="group" aria-label="Mapa de sillas">
          <div class="tablao-oval">óvalo</div>
          @for (seat of s.seats; track seat.seatId) {
            <button
              type="button"
              class="seat-btn"
              [class.sold]="seat.status === 'sold'"
              [class.picked]="picked().includes(seat.seatId)"
              [disabled]="seat.status === 'sold'"
              [style.left.%]="seat.x"
              [style.top.%]="seat.y"
              (click)="toggle(seat)"
            >
              {{ seat.label }}
              <small>{{ seat.status === 'sold' ? 'Ocupada' : 'Libre' }}</small>
            </button>
          }
        </div>

        <aside class="summary">
          <h3>Resumen</h3>
          @if (!pickedSeats().length) {
            <p class="muted">Elige al menos una silla para ver el total.</p>
          } @else {
            @for (seat of pickedSeats(); track seat.seatId) {
              <div class="row"><span>{{ seat.label }} · {{ seat.zoneName }}</span><span>{{ money(seat.priceCents) }}</span></div>
            }
            <div class="row"><strong>Total</strong><strong>{{ money(liveTotal()) }}</strong></div>
          }
          <div style="margin-top:12px">
            <button class="btn btn-primary" type="button" [disabled]="!picked().length" (click)="goCheckout()">
              Continuar al cobro
            </button>
          </div>
        </aside>
      }
    </main>
  `,
})
export class ShowDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly show = signal<ShowDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly picked = signal<string[]>([]);
  readonly palo = (p: string) => PALO_LABEL[p] || p;
  readonly when = madridWhen;
  readonly money = eur;
  readonly pickedSeats = computed(() => {
    const ids = this.picked();
    return (this.show()?.seats || []).filter((s) => ids.includes(s.seatId));
  });
  readonly liveTotal = computed(() => this.pickedSeats().reduce((a, s) => a + s.priceCents, 0));

  ngOnInit() {
    void this.load();
  }

  async load() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading.set(true);
    this.error.set('');
    try {
      this.show.set(await this.api.show(id));
    } catch {
      this.error.set('Ese pase no está en cartelera.');
    } finally {
      this.loading.set(false);
    }
  }

  toggle(seat: SeatView) {
    if (seat.status === 'sold') return;
    const cur = this.picked();
    this.picked.set(cur.includes(seat.seatId) ? cur.filter((id) => id !== seat.seatId) : [...cur, seat.seatId]);
  }

  goCheckout() {
    const s = this.show();
    if (!s || !this.picked().length) return;
    this.api.saveSelection(s.id, this.picked());
    if (!this.auth.getToken()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    void this.router.navigateByUrl('/checkout');
  }
}
