import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { eur, madridWhen, OrderView } from '../shared/models';
import { QrBlockComponent } from '../shared/qr-block.component';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink, QrBlockComponent],
  template: `
    <main class="page wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h1>No está esa confirmación</h1>
          <p>{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mis-entradas">Mis entradas</a>
        </section>
      } @else if (order(); as o) {
        <p class="hero-kicker">Pagado</p>
        <h1>Tu umbral</h1>
        <p class="muted">{{ o.show?.title }} · {{ o.show ? when(o.show.startsAt) : '' }}</p>
        <p class="code">{{ o.code }}</p>
        <app-qr-block [qrSvg]="o.qrSvg" [qrUrl]="o.qrUrl" />
        <p>Total {{ money(o.totalCents) }}</p>
        <a class="btn btn-secondary" [routerLink]="['/mis-entradas', o.code]">Ver detalle</a>
      }
    </main>
  `,
})
export class ConfirmPage implements OnInit {
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
      this.order.set(await this.api.byCode(code));
    } catch {
      this.error.set('Esa entrada no es tuya o no existe.');
    } finally {
      this.loading.set(false);
    }
  }
}
