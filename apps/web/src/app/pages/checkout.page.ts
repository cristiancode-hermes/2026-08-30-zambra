import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Addon, eur, humanizeApiError, SeatView, ShowDetail } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [RouterLink],
  template: `
    <main class="page wrap">
      @if (errorLoad()) {
        <section class="screen">
          <h1>No hay sillas en el cobro</h1>
          <p>Vuelve al mapa y elige de nuevo.</p>
          <a class="btn btn-primary" routerLink="/pases">Ir a pases</a>
        </section>
      } @else if (show(); as s) {
        <h1>Cobro</h1>
        <p class="muted">{{ s.title }} — total en vivo, sin reloj de quince minutos.</p>
        <aside class="summary">
          @for (seat of selected(); track seat.seatId) {
            <div class="row"><span>{{ seat.label }} · {{ seat.zoneName }}</span><span>{{ money(seat.priceCents) }}</span></div>
          }
          <p style="margin:12px 0 6px">Extras</p>
          @for (a of addons(); track a.id) {
            <label class="row" style="cursor:pointer">
              <span>
                <input type="checkbox" [checked]="addonIds().includes(a.id)" (change)="toggleAddon(a.id)" />
                {{ a.name }}
              </span>
              <span>{{ money(a.priceCents) }}</span>
            </label>
          }
          <div class="row"><strong>Total</strong><strong>{{ money(liveTotal()) }}</strong></div>
          @if (ctaError()) {
            <p class="cta-error" id="pay-action">{{ ctaError() }}</p>
          }
          <div id="pay-action" style="margin-top:12px">
            <button class="btn btn-primary" type="button" [disabled]="paying() || !selected().length" (click)="pay()">
              {{ paying() ? 'Cobrando…' : 'Pagar ahora' }}
            </button>
          </div>
        </aside>
      }
    </main>
  `,
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly show = signal<ShowDetail | null>(null);
  readonly addons = signal<Addon[]>([]);
  readonly seatIds = signal<string[]>([]);
  readonly addonIds = signal<string[]>([]);
  readonly errorLoad = signal(false);
  readonly ctaError = signal('');
  readonly paying = signal(false);
  readonly money = eur;
  readonly selected = computed(() => {
    const ids = this.seatIds();
    return (this.show()?.seats || []).filter((s: SeatView) => ids.includes(s.seatId));
  });
  readonly liveTotal = computed(() => {
    const seats = this.selected().reduce((a, s) => a + s.priceCents, 0);
    const extras = this.addons()
      .filter((a) => this.addonIds().includes(a.id))
      .reduce((a, x) => a + x.priceCents, 0);
    return seats + extras;
  });

  ngOnInit() {
    void this.boot();
  }

  async boot() {
    const sel = this.api.readSelection();
    if (!sel?.showId || !sel.seatIds?.length) {
      this.errorLoad.set(true);
      return;
    }
    this.seatIds.set(sel.seatIds);
    try {
      const [show, addons] = await Promise.all([this.api.show(sel.showId), this.api.addons()]);
      this.show.set(show);
      this.addons.set(addons);
    } catch {
      this.errorLoad.set(true);
    }
  }

  toggleAddon(id: string) {
    const cur = this.addonIds();
    this.addonIds.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  async pay() {
    const s = this.show();
    if (!s) return;
    this.paying.set(true);
    this.ctaError.set('');
    try {
      const order = await this.api.checkout({
        showId: s.id,
        seatIds: this.seatIds(),
        addonIds: this.addonIds(),
      });
      await this.router.navigate(['/confirmacion', order.code]);
    } catch (e) {
      this.ctaError.set(humanizeApiError(e));
      queueMicrotask(() => document.getElementById('pay-action')?.scrollIntoView({ block: 'center' }));
    } finally {
      this.paying.set(false);
    }
  }
}
