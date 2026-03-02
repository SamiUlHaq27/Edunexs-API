import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Edunexs Backend API</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, sans-serif;
        background: #f4f7fb;
        color: #0f172a;
      }

      .card {
        width: min(92vw, 560px);
        padding: 2rem;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        text-align: center;
      }

      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.8rem;
      }

      p {
        margin: 0;
        font-size: 1rem;
        color: #334155;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Edunexs Backend API</h1>
      <p>API is running successfully ✅</p>
    </main>
  </body>
</html>`;
  }
}
