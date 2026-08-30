import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { eur, madridWhen, OrderView } from '../shared/models';
import { QrBlockComponent } from '../shared/qr-block.component';

@Component({
  selector: 'app-public-ticket',
  imports: [RouterLink, QrBlockComponent],
  template: `
    <main class="page wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h1>Entrada no encontrada</h1>
          <p>Ese código no abre el umbral.</p>
          <a class="btn btn-primary" routerLink="/">Cartelera</a>
        </section>
      } @else if (order(); as o) {
        <p class="hero-kicker">Pase de cueva</p>
        <h1>{{ o.show?.title }}</h1>
        <p class="muted">{{ o.show ? when(o.show.startsAt) : '' }} · {{ o.status }}</p>
        <p class="code">{{ o.code }}</p>
        <app-qr-block [qrSvg]="o.qrSvg" [qrUrl]="o.qrUrl" />
        @for (l of o.lines; track l.id) {
          <div class="row"><span>{{ l.label }}</span><span>{{ money(l.subtotalCents) }}</span></div>
        }
        <div class="row"><strong>Total</strong><strong>{{ money(o.totalCents) }}</strong></div>
      }
    </main>
  `,
})
export class PublicTicketPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly order = signal<OrderView | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = eur;
  readonly when = madridWhen;

  ngOnInit() {
    void this.load();
  }

  async load() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.loading.set(true);
    try {
      this.order.set(await this.api.publicTicket(code));
    } catch {
      this.error.set('missing');
    } finally {
      this.loading.set(false);
    }
  }
}
