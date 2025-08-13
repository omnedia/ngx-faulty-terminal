# ngx-faulty-terminal

<a href="https://ngxui.com" target="_blank" style="display: flex;gap: .5rem;align-items: center;cursor: pointer; padding: 0 0 0 0; height: fit-content;">
  <img src="https://ngxui.com/assets/img/ngxui-logo.png" style="width: 64px;height: 64px;">
</a>

This library is part of the NGXUI ecosystem. <br>
View all available components at [https://ngxui.com](https://ngxui.com)

`@omnedia/ngx-faulty-terminal` is an Angular library that renders a retro-styled, animated "faulty terminal" background using WebGL. It supports glitch effects, scanlines, mouse interaction, curvature, and multiple customizable visual parameters. You can layer content above the effect using `ng-content`.

---

## Features

* Animated CRT/faulty terminal visual effect.
* Adjustable grid, digit size, scanlines, curvature, glitching, flicker, and more.
* Mouse reactive distortions with adjustable strength.
* Optional page-load animation.
* Custom tint and brightness.
* Works as a standalone Angular component with `ng-content` overlay.

---

## Installation

```bash
npm install @omnedia/ngx-faulty-terminal ogl
```

---

## Usage

Import the `NgxFaultyTerminalComponent` in your Angular component or page:

```typescript
import {NgxFaultyTerminalComponent} from '@omnedia/ngx-faulty-terminal';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgxFaultyTerminalComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent {
}
```

In your template:

```html

<om-faulty-terminal [tint]="'#ff5555'" [glitchAmount]="1.5">
  <h1>ACCESS DENIED</h1>
</om-faulty-terminal>
```

---

## How It Works

* The faulty terminal effect is drawn in a `<canvas>` element using WebGL.
* `<ng-content>` lets you overlay UI or text on top of the animation.
* The animation can react to mouse movement, creating ripple-like distortion.
* All behavior and appearance are controlled via `@Input()` bindings.

---

## API

```html

<om-faulty-terminal
  [scale]="1.2"
  [gridMul]="[2, 1]"
  [digitSize]="1.5"
  [timeScale]="0.8"
  [pause]="false"
  [scanlineIntensity]="0.3"
  [glitchAmount]="1"
  [flickerAmount]="1"
  [noiseAmp]="1"
  [chromaticAberration]="0"
  [dither]="0"
  [curvature]="0.2"
  [tint]="'#84bd7d'"
  [mouseReact]="true"
  [mouseStrength]="0.2"
  [dpr]="2"
  [pageLoadAnimation]="true"
  [brightness]="1"
  styleClass="custom-class"
>
  <ng-content></ng-content>
</om-faulty-terminal>
```

### Inputs & Defaults

* `scale` — **1.2** — Scene scaling factor.
* `gridMul` — **\[2, 1]** — Grid multiplier for digit layout.
* `digitSize` — **1.5** — Size of digits in the grid.
* `timeScale` — **0.8** — Animation speed multiplier.
* `pause` — **false** — Stops animation if `true`.
* `scanlineIntensity` — **0.3** — Intensity of horizontal scanlines.
* `glitchAmount` — **1** — Multiplier for glitch displacement.
* `flickerAmount` — **1** — Screen flicker intensity.
* `noiseAmp` — **1** — Noise effect amplitude.
* `chromaticAberration` — **0** — RGB separation strength.
* `dither` — **0** — Dithering amount (0 disables).
* `curvature` — **0.2** — Barrel distortion strength.
* `tint` — **'#84bd7d'** — Hex color tint applied to the display.
* `mouseReact` — **true** — Enables mouse interaction.
* `mouseStrength` — **0.2** — Intensity of mouse reaction.
* `dpr` — **min(window\.devicePixelRatio, 2)** — Device pixel ratio for rendering.
* `pageLoadAnimation` — **true** — Enables page-load "fade-in" animation.
* `brightness` — **1** — Brightness multiplier.
* `styleClass` — *optional* — Custom CSS class for outer container.

---

## Example

```html

<om-faulty-terminal [tint]="'#00ffaa'" [curvature]="0.4" [glitchAmount]="2">
  <div class="terminal-text">
    <h2>BOOT SEQUENCE INITIATED...</h2>
  </div>
</om-faulty-terminal>
```

**SCSS:**

```scss
.terminal-text {
  text-align: center;
  color: #00ffaa;
  font-family: 'Courier New', monospace;
  padding-top: 3rem;
}
```

---

## Styling

Default structure:

```html

<div class="om-faulty-terminal">
  <div class="om-faulty-terminal-background"></div>
  <div class="content-inside">
    <ng-content></ng-content>
  </div>
</div>
```

`.om-faulty-terminal-background` has `pointer-events: none` so it won't block interaction with overlaid content.

---

## Contributing

Contributions are welcome via PR or issue submission.

## License

MIT License
