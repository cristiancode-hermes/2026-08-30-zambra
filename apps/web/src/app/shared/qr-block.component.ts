import { Component, inject, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-qr-block',
  template: `
    <div class="qr-block">
      @if (safe) {
        <div [innerHTML]="safe"></div>
      }
      @if (url) {
        <p><a [href]="url">{{ url }}</a></p>
      }
    </div>
  `,
})
export class QrBlockComponent {
  private readonly sanitizer = inject(DomSanitizer);
  safe: SafeHtml | null = null;
  url = '';

  @Input() set qrSvg(v: string | undefined) {
    this.safe = v ? this.sanitizer.bypassSecurityTrustHtml(v) : null;
  }
  @Input() set qrUrl(v: string | undefined) {
    this.url = v || '';
  }
}
