import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { eur, madridWhen, OrderView } from '../shared/models';

@Component({
  selector: 'app-tickets',
  imports: [RouterLink],
  template: `
    <main class="page wrap">
      <h1>Mis entradas</h1>
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No cargaron las entradas</h2>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!orders().length) {
        <section class="screen">
          <h2>Todavía no tienes silla</h2>
          <p>La cartelera espera.</p>
          <a class="btn btn-primary" routerLink="/pases">Ver pases</a>
        </section>
      } @else {
        @for (o of orders(); track o.id) {
          <a class="show-card" style="margin-bottom:12px" [routerLink]="['/mis-entradas', o.code]">
            <div class="body">
              <strong>{{ o.show?.title }}</strong>
              <span class="muted">{{ o.show ? when(o.show.startsAt) : '' }} · {{ o.status }} · {{ o.code }}</span>
              <span>{{ money(o.totalCents) }}</span>
            </div>
          </a>
        }
      }
    </main>
  `,
})
export class TicketsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly orders = signal<OrderView[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = eur;
  readonly when = madridWhen;

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.orders.set(await this.api.mine());
    } catch {
      this.error.set('El listado no responde.');
    } finally {
      this.loading.set(false);
    }
  }
}
