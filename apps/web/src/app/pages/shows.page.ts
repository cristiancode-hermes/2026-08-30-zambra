import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { eur, madridWhen, PALO_LABEL, ShowCard } from '../shared/models';

@Component({
  selector: 'app-shows',
  imports: [RouterLink],
  template: `
    <main class="page wrap">
      <h1>Pases</h1>
      <p class="muted">Mismo aforo libre que en la portada. Filtra por palo si quieres.</p>
      <div class="filters">
        <button type="button" class="chip" [class.on]="palo() === ''" (click)="palo.set('')">Todos</button>
        @for (p of palos; track p) {
          <button type="button" class="chip" [class.on]="palo() === p" (click)="palo.set(p)">{{ label(p) }}</button>
        }
      </div>
      @if (loading()) {
        <div class="grid-shows"><div class="sk"></div><div class="sk"></div></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No hay cartelera</h2>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!filtered().length) {
        <section class="screen">
          <h2>Ningún pase con ese palo</h2>
          <p>Quita el filtro o mira otra noche.</p>
          <button class="btn btn-secondary" type="button" (click)="palo.set('')">Ver todos</button>
        </section>
      } @else {
        <div class="grid-shows">
          @for (s of filtered(); track s.id) {
            <a class="show-card" [routerLink]="['/pases', s.id]">
              <img [src]="s.photoUrl" [alt]="s.title" />
              <div class="body">
                <span class="palo">{{ label(s.palo) }}</span>
                <strong>{{ s.title }}</strong>
                <span class="muted">{{ s.company }} · {{ when(s.startsAt) }}</span>
                <span class="free">{{ s.freeCount }} libres</span>
              </div>
            </a>
          }
        </div>
      }
    </main>
  `,
})
export class ShowsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly shows = signal<ShowCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly palo = signal('');
  readonly palos = ['solea', 'seguiriyas', 'bulerias', 'alegrias'];
  readonly filtered = computed(() => {
    const p = this.palo();
    return p ? this.shows().filter((s) => s.palo === p) : this.shows();
  });
  readonly label = (p: string) => PALO_LABEL[p] || p;
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
