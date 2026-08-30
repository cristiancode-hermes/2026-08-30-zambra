import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { eur, humanizeApiError, OrderView } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [FormsModule],
  template: `
    <main class="page wrap">
      <h1>Umbral</h1>
      <p class="muted">Pega el código o la URL del QR.</p>
      <label class="field">Código o URL
        <input [ngModel]="raw()" (ngModelChange)="raw.set($event)" name="raw" autocomplete="off" />
      </label>
      @if (ctaError()) {
        <p class="cta-error" id="scan-action">{{ ctaError() }}</p>
      }
      <button class="btn btn-primary" id="scan-action" type="button" [disabled]="busy()" (click)="scan()">
        {{ busy() ? 'Leyendo…' : 'Marcar entrada' }}
      </button>
      @if (last(); as o) {
        <aside class="summary" style="margin-top:20px">
          <p class="code">{{ o.code }}</p>
          <p>{{ o.show?.title }} · {{ o.status }}</p>
          <p>{{ money(o.totalCents) }}</p>
        </aside>
      }
    </main>
  `,
})
export class StaffPage {
  private readonly api = inject(ApiService);
  readonly raw = signal('');
  readonly busy = signal(false);
  readonly ctaError = signal('');
  readonly last = signal<OrderView | null>(null);
  readonly money = eur;

  async scan() {
    this.busy.set(true);
    this.ctaError.set('');
    try {
      const res = await this.api.scan(this.raw());
      this.last.set(res.order);
    } catch (e) {
      this.ctaError.set(humanizeApiError(e));
      document.getElementById('scan-action')?.scrollIntoView({ block: 'center' });
    } finally {
      this.busy.set(false);
    }
  }
}
