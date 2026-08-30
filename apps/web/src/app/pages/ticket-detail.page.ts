import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { eur, humanizeApiError, madridWhen, OrderView } from '../shared/models';
import { QrBlockComponent } from '../shared/qr-block.component';

@Component({
  selector: 'app-ticket-detail',
  imports: [RouterLink, QrBlockComponent, FormsModule],
  template: `
    <main class="page wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h1>Entrada no encontrada</h1>
          <p>{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mis-entradas">Mis entradas</a>
        </section>
      } @else if (order(); as o) {
        <p><a routerLink="/mis-entradas">← Mis entradas</a></p>
        <h1>{{ o.show?.title }}</h1>
        <p class="muted">{{ o.show ? when(o.show.startsAt) : '' }} · {{ o.status }}</p>
        <p class="code">{{ o.code }}</p>
        <app-qr-block [qrSvg]="o.qrSvg" [qrUrl]="o.qrUrl" />
        @for (l of o.lines; track l.id) {
          <div class="row"><span>{{ l.label }}</span><span>{{ money(l.subtotalCents) }}</span></div>
        }
        <div class="row"><strong>Total</strong><strong>{{ money(o.totalCents) }}</strong></div>
        @if (ctaError()) {
          <p class="cta-error" id="pay-action">{{ ctaError() }}</p>
        }
        @if (o.status === 'paid') {
          <button class="btn btn-secondary" type="button" (click)="cancel(o)" style="margin-top:12px">Cancelar (hasta 24 h antes)</button>
        }
        @if (o.status === 'used') {
          <form (ngSubmit)="review(o)" style="margin-top:24px">
            <h2>Reseña</h2>
            <label class="field">Nota 1–5
              <input type="number" min="1" max="5" [ngModel]="rating()" (ngModelChange)="rating.set(+$event)" name="rating" />
            </label>
            <label class="field">Texto
              <input [ngModel]="body()" (ngModelChange)="body.set($event)" name="body" autocomplete="off" />
            </label>
            <button class="btn btn-primary" type="submit">Publicar</button>
          </form>
        }
      }
    </main>
  `,
})
export class TicketDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly order = signal<OrderView | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly ctaError = signal('');
  readonly rating = signal(5);
  readonly body = signal('');
  readonly money = eur;
  readonly when = madridWhen;

  ngOnInit() {
    void this.load();
  }

  async load() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.loading.set(true);
    this.error.set('');
    try {
      this.order.set(await this.api.byCode(code));
    } catch {
      this.error.set('Esa entrada no está en tu cuenta.');
    } finally {
      this.loading.set(false);
    }
  }

  async cancel(o: OrderView) {
    this.ctaError.set('');
    try {
      this.order.set(await this.api.cancel(o.id));
    } catch (e) {
      this.ctaError.set(humanizeApiError(e));
      document.getElementById('pay-action')?.scrollIntoView({ block: 'center' });
    }
  }

  async review(o: OrderView) {
    this.ctaError.set('');
    try {
      await this.api.addReview(o.showId, this.rating(), this.body());
      this.body.set('Publicada.');
    } catch (e) {
      this.ctaError.set(humanizeApiError(e));
    }
  }
}
