import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { eur, madridWhen, PALO_LABEL, ShowCard } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main class="page wrap">
      <p class="hero-kicker">Zambra</p>
      <h1>La cueva enciende el cante. Tú eliges la silla.</h1>
      <p class="muted">Cartelera de la quincena. El número de libres es el del propio pase, no un hueco genérico del día.</p>
      @if (loading()) {
        <div class="grid-shows"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No pudimos cargar la cartelera</h2>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!shows().length) {
        <section class="screen">
          <h2>Esta quincena aún no tiene pases</h2>
          <p>Vuelve más tarde o escribe al umbral.</p>
        </section>
      } @else {
        <div class="grid-shows">
          @for (s of shows(); track s.id) {
            <a class="show-card" [routerLink]="['/pases', s.id]">
              <img [src]="s.photoUrl" [alt]="s.title" />
              <div class="body">
                <span class="palo">{{ palo(s.palo) }}</span>
                <strong>{{ s.title }}</strong>
                <span class="muted">{{ s.company }} · {{ when(s.startsAt) }}</span>
                <span class="free">{{ s.freeCount }} libres · desde {{ money(4500) }}</span>
              </div>
            </a>
          }
        </div>
      }
    </main>
  `,
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);
  readonly shows = signal<ShowCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly palo = (p: string) => PALO_LABEL[p] || p;
  readonly when = madridWhen;
  readonly money = eur;

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.shows.set(await this.api.listShows());
    } catch {
      this.error.set('La cartelera no responde.');
    } finally {
      this.loading.set(false);
    }
  }
}
