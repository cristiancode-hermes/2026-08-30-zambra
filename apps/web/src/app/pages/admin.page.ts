import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { madridWhen } from '../shared/models';

interface Occ {
  showId: string;
  title: string;
  palo: string;
  date: string;
  free: number;
  total: number;
  pct: number;
}

@Component({
  selector: 'app-admin',
  template: `
    <main class="page wrap">
      <h1>Ocupación</h1>
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No hay cifras</h2>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else {
        <svg class="chart" viewBox="0 0 640 280" role="img" [attr.aria-label]="'Ocupación por pase'">
          <line x1="48" y1="16" x2="48" y2="240" stroke="currentColor" stroke-width="1" />
          <line x1="48" y1="240" x2="620" y2="240" stroke="currentColor" stroke-width="1" />
          <text x="8" y="24" font-size="11" fill="currentColor">100%</text>
          <text x="8" y="132" font-size="11" fill="currentColor">50%</text>
          <text x="16" y="244" font-size="11" fill="currentColor">0</text>
          @for (r of rows(); track r.showId; let i = $index) {
            <rect
              [attr.x]="barX(i)"
              [attr.y]="barY(r.pct)"
              [attr.width]="barW()"
              [attr.height]="240 - barY(r.pct)"
              fill="var(--color-primary)"
            >
              <title>{{ r.title }} · {{ when(r.date) }} · {{ r.total - r.free }}/{{ r.total }} ({{ r.pct }}%)</title>
            </rect>
            @if (i % 3 === 0) {
              <text
                [attr.x]="barX(i) + barW() / 2"
                y="258"
                font-size="9"
                text-anchor="middle"
                fill="currentColor"
              >{{ shortDate(r.date) }}</text>
            }
          }
        </svg>
        <ul>
          @for (r of rows(); track r.showId) {
            <li class="row">
              <span>{{ r.title }} · {{ when(r.date) }}</span>
              <span>{{ r.total - r.free }}/{{ r.total }} · {{ r.pct }}%</span>
            </li>
          }
        </ul>
      }
    </main>
  `,
})
export class AdminPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly rows = signal<Occ[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly when = madridWhen;

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.rows.set(await this.api.occupancy());
    } catch {
      this.error.set('El gráfico no responde.');
    } finally {
      this.loading.set(false);
    }
  }

  barW(): number {
    const n = Math.max(this.rows().length, 1);
    return Math.max(8, Math.min(28, (560 / n) * 0.7));
  }

  barX(i: number): number {
    const n = Math.max(this.rows().length, 1);
    const slot = 560 / n;
    return 56 + i * slot + (slot - this.barW()) / 2;
  }

  barY(pct: number): number {
    return 240 - (pct / 100) * 224;
  }

  shortDate(iso: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  }
}
