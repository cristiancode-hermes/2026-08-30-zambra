import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <main class="page wrap screen">
      <h1>Ese recoveco no existe</h1>
      <p>La cueva no tiene esa sala.</p>
      <a class="btn btn-primary" routerLink="/">Volver a la cartelera</a>
    </main>
  `,
})
export class NotFoundPage {}
