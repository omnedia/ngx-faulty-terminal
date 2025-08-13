import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {Color, Mesh, Program, Renderer, Triangle, Vec3} from 'ogl';

type Vec2 = [number, number];

@Component({
  selector: 'om-faulty-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ngx-faulty-terminal.component.html',
  styleUrl: './ngx-faulty-terminal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxFaultyTerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wrapper', {static: true}) wrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('container', {static: true}) containerRef!: ElementRef<HTMLDivElement>;

  @Input() scale = 1.2;
  @Input() gridMul: Vec2 = [2, 1];
  @Input() digitSize = 1.5;
  @Input() timeScale = 0.8;
  @Input() pause = false;
  @Input() scanlineIntensity = 0.3;
  @Input() glitchAmount = 1;
  @Input() flickerAmount = 1;
  @Input() noiseAmp = 1;
  @Input() chromaticAberration = 0;
  @Input() dither: number | boolean = 0;
  @Input() curvature = 0.2;
  @Input() tint = '#84bd7d';
  @Input() mouseReact = true;
  @Input() mouseStrength = 0.2;
  @Input() dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2);
  @Input() pageLoadAnimation = true;
  @Input() brightness = 1;
  @Input() styleClass?: string;

  private renderer?: Renderer;
  private program?: Program;
  private mesh?: Mesh;
  private rafId: number | null = null;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;

  private timeOffset = Math.random() * 100;
  private frozenTime = 0;
  private loadAnimStart = 0;

  private mouse = {x: 0.5, y: 0.5};
  private smoothMouse = {x: 0.5, y: 0.5};

  private onMouseMove?: (e: MouseEvent) => void;

  isInView = signal(false);
  private _cleanupFns: Array<() => void> = [];

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
  }

  private readonly vert = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  private readonly frag = `
    precision mediump float;

    varying vec2 vUv;

    uniform float iTime;
    uniform vec3  iResolution;
    uniform float uScale;

    uniform vec2  uGridMul;
    uniform float uDigitSize;
    uniform float uScanlineIntensity;
    uniform float uGlitchAmount;
    uniform float uFlickerAmount;
    uniform float uNoiseAmp;
    uniform float uChromaticAberration;
    uniform float uDither;
    uniform float uCurvature;
    uniform vec3  uTint;
    uniform vec2  uMouse;
    uniform float uMouseStrength;
    uniform float uUseMouse;
    uniform float uPageLoadProgress;
    uniform float uUsePageLoadAnimation;
    uniform float uBrightness;

    float time;

    float hash21(vec2 p){
      p = fract(p * 234.56);
      p += dot(p, p + 34.56);
      return fract(p.x * p.y);
    }

    float noise(vec2 p)
    {
      return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
    }

    mat2 rotate(float angle)
    {
      float c = cos(angle);
      float s = sin(angle);
      return mat2(c, -s, s, c);
    }

    float fbm(vec2 p)
    {
      p *= 1.1;
      float f = 0.0;
      float amp = 0.5 * uNoiseAmp;

      mat2 modify0 = rotate(time * 0.02);
      f += amp * noise(p);
      p = modify0 * p * 2.0;
      amp *= 0.454545; // 1/2.2

      mat2 modify1 = rotate(time * 0.02);
      f += amp * noise(p);
      p = modify1 * p * 2.0;
      amp *= 0.454545;

      mat2 modify2 = rotate(time * 0.08);
      f += amp * noise(p);

      return f;
    }

    float pattern(vec2 p, out vec2 q, out vec2 r) {
      vec2 offset1 = vec2(1.0);
      vec2 offset0 = vec2(0.0);
      mat2 rot01 = rotate(0.1 * time);
      mat2 rot1 = rotate(0.1);

      q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
      r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
      return fbm(p + r);
    }

    float digit(vec2 p){
        vec2 grid = uGridMul * 15.0;
        vec2 s = floor(p * grid) / grid;
        p = p * grid;
        vec2 q, r;
        float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

        if(uUseMouse > 0.5){
            vec2 mouseWorld = uMouse * uScale;
            float distToMouse = distance(s, mouseWorld);
            float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
            intensity += mouseInfluence;

            float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
            intensity += ripple;
        }

        if(uUsePageLoadAnimation > 0.5){
            float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
            float cellDelay = cellRandom * 0.8;
            float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);

            float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
            intensity *= fadeAlpha;
        }

        p = fract(p);
        p *= uDigitSize;

        float px5 = p.x * 5.0;
        float py5 = (1.0 - p.y) * 5.0;
        float x = fract(px5);
        float y = fract(py5);

        float i = floor(py5) - 2.0;
        float j = floor(px5) - 2.0;
        float n = i * i + j * j;
        float f = n * 0.0625;

        float isOn = step(0.1, intensity - f);
        float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

        return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
    }

    float onOff(float a, float b, float c)
    {
      return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
    }

    float displace(vec2 look)
    {
        float y = look.y - mod(iTime * 0.25, 1.0);
        float window = 1.0 / (1.0 + 50.0 * y * y);
        return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
    }

    vec3 getColor(vec2 p){
        float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
        bar *= uScanlineIntensity;

        float displacement = displace(p);
        p.x += displacement;

        if (uGlitchAmount != 1.0) {
          float extra = displacement * (uGlitchAmount - 1.0);
          p.x += extra;
        }

        float middle = digit(p);

        const float off = 0.002;
        float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                    digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                    digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));

        vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
        return baseColor;
    }

    vec2 barrel(vec2 uv){
      vec2 c = uv * 2.0 - 1.0;
      float r2 = dot(c, c);
      c *= 1.0 + uCurvature * r2;
      return c * 0.5 + 0.5;
    }

    void main() {
        time = iTime * 0.333333;
        vec2 uv = vUv;

        if(uCurvature != 0.0){
          uv = barrel(uv);
        }

        vec2 p = uv * uScale;
        vec3 col = getColor(p);

        if(uChromaticAberration != 0.0){
          vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
          col.r = getColor(p + ca).r;
          col.b = getColor(p - ca).b;
        }

        col *= uTint;
        col *= uBrightness;

        if(uDither > 0.0){
          float rnd = hash21(gl_FragCoord.xy);
          col += (rnd - 0.5) * (uDither * 0.003922);
        }

        gl_FragColor = vec4(col, 1.0);
    }
  `;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.isInView.set(entry.isIntersecting);
        if (entry.isIntersecting) this.initAndStart();
        else this.stopAndCleanup();
      },
      {threshold: 0.1}
    );
    this.io.observe(this.wrapperRef.nativeElement);
    this._cleanupFns.push(() => this.io?.disconnect());
  }

  private initAndStart() {
    this.stopAndCleanup();

    const container = this.containerRef.nativeElement;

    this.renderer = new Renderer({dpr: this.dpr});
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const tintVec = this.hexToRgb(this.tint);
    const ditherValue = typeof this.dither === 'boolean' ? (this.dither ? 1 : 0) : this.dither;

    this.program = new Program(gl, {
      vertex: this.vert,
      fragment: this.frag,
      uniforms: {
        iTime: {value: 0},
        iResolution: {value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)},
        uScale: {value: this.scale},

        uGridMul: {value: new Float32Array(this.gridMul)},
        uDigitSize: {value: this.digitSize},
        uScanlineIntensity: {value: this.scanlineIntensity},
        uGlitchAmount: {value: this.glitchAmount},
        uFlickerAmount: {value: this.flickerAmount},
        uNoiseAmp: {value: this.noiseAmp},
        uChromaticAberration: {value: this.chromaticAberration},
        uDither: {value: ditherValue as number},
        uCurvature: {value: this.curvature},
        uTint: {value: new Color(tintVec[0], tintVec[1], tintVec[2])},
        uMouse: {value: new Float32Array([this.smoothMouse.x, this.smoothMouse.y])},
        uMouseStrength: {value: this.mouseStrength},
        uUseMouse: {value: this.mouseReact ? 1 : 0},
        uPageLoadProgress: {value: this.pageLoadAnimation ? 0 : 1},
        uUsePageLoadAnimation: {value: this.pageLoadAnimation ? 1 : 0},
        uBrightness: {value: this.brightness},
      },
    });

    this.mesh = new Mesh(gl, {geometry, program: this.program});

    const resize = () => {
      if (!this.renderer || !this.program) return;
      this.renderer.setSize(container.offsetWidth, container.offsetHeight);
      const w = gl.canvas.width;
      const h = gl.canvas.height;
      (this.program.uniforms['iResolution'].value as Vec3).set(w, h, w / h);
    };
    this.ro = new ResizeObserver(resize);
    this.ro.observe(container);
    this._cleanupFns.push(() => this.ro?.disconnect());
    resize();

    if (this.mouseReact) {
      this.onMouseMove = (e: MouseEvent) => {
        const rect = this.wrapperRef.nativeElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - (e.clientY - rect.top) / rect.height;
        this.mouse = {x, y};
      };
      this.wrapperRef.nativeElement.addEventListener('mousemove', this.onMouseMove, {passive: true});
      this._cleanupFns.push(() => this.wrapperRef.nativeElement.removeEventListener('mousemove', this.onMouseMove!));
    }

    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (!this.renderer || !this.program || !this.mesh) return;

      if (this.pageLoadAnimation && this.loadAnimStart === 0) {
        this.loadAnimStart = t;
      }

      if (!this.pause) {
        const elapsed = (t * 0.001 + this.timeOffset) * this.timeScale;
        this.program.uniforms['iTime'].value = elapsed;
        this.frozenTime = elapsed;
      } else {
        this.program.uniforms['iTime'].value = this.frozenTime;
      }

      if (this.pageLoadAnimation && this.loadAnimStart > 0) {
        const dur = 2000;
        this.program.uniforms['uPageLoadProgress'].value = Math.min((t - this.loadAnimStart) / dur, 1);
      }

      if (this.mouseReact) {
        const k = 0.08;
        this.smoothMouse.x += (this.mouse.x - this.smoothMouse.x) * k;
        this.smoothMouse.y += (this.mouse.y - this.smoothMouse.y) * k;
        const mu = this.program.uniforms['uMouse'].value as Float32Array;
        mu[0] = this.smoothMouse.x;
        mu[1] = this.smoothMouse.y;
      }

      this.program.uniforms['uScale'].value = this.scale;
      (this.program.uniforms['uGridMul'].value as Float32Array).set(this.gridMul);
      this.program.uniforms['uDigitSize'].value = this.digitSize;
      this.program.uniforms['uScanlineIntensity'].value = this.scanlineIntensity;
      this.program.uniforms['uGlitchAmount'].value = this.glitchAmount;
      this.program.uniforms['uFlickerAmount'].value = this.flickerAmount;
      this.program.uniforms['uNoiseAmp'].value = this.noiseAmp;
      this.program.uniforms['uChromaticAberration'].value = this.chromaticAberration;
      this.program.uniforms['uCurvature'].value = this.curvature;
      this.program.uniforms['uMouseStrength'].value = this.mouseStrength;
      this.program.uniforms['uUseMouse'].value = this.mouseReact ? 1 : 0;
      this.program.uniforms['uUsePageLoadAnimation'].value = this.pageLoadAnimation ? 1 : 0;
      this.program.uniforms['uBrightness'].value = this.brightness;

      const tvec = this.hexToRgb(this.tint);
      (this.program.uniforms['uTint'].value as Color).set(tvec[0], tvec[1], tvec[2]);

      try {
        this.renderer.render({scene: this.mesh});
      } catch {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopAndCleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this._cleanupFns.splice(0).forEach((fn) => fn());

    if (this.renderer) {
      try {
        const lose = this.renderer.gl.getExtension('WEBGL_lose_context');
        lose?.loseContext();
        const canvas = this.renderer.gl.canvas;
        canvas?.parentNode?.removeChild(canvas);
      } catch {
      }
    }

    this.mesh = undefined;
    this.program = undefined;
    this.renderer = undefined;
    this.loadAnimStart = 0;
    this.timeOffset = Math.random() * 100;
  }

  ngOnDestroy(): void {
    this.stopAndCleanup();
  }

  private hexToRgb(hex: string): [number, number, number] {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const num = parseInt(h, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }
}
