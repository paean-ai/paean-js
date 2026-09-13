export interface InputOptions {
  /** Map action names to KeyboardEvent.code values. */
  bindings?: Record<string, readonly string[]>;
  preventDefault?: boolean;
}

/** Keyboard actions and pointer state scoped to a focusable game surface. */
export class Input {
  readonly pointer = { x: 0, y: 0, down: false, id: -1 };
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private readonly virtual = new Set<string>();
  private readonly bindings: Record<string, readonly string[]>;
  private readonly disposers: (() => void)[] = [];

  constructor(readonly element: HTMLElement, options: InputOptions = {}) {
    this.bindings = options.bindings ?? {
      left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
      up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], jump: ['Space'],
    };
    const oldTabIndex = element.getAttribute('tabindex');
    if (element.tabIndex < 0) element.tabIndex = 0;
    this.disposers.push(() => oldTabIndex === null ? element.removeAttribute('tabindex') : element.setAttribute('tabindex', oldTabIndex));
    const key = (down: boolean) => (event: Event): void => {
      const e = event as KeyboardEvent;
      const bound = Object.values(this.bindings).some(codes => codes.includes(e.code));
      if (!bound) return;
      if (options.preventDefault !== false) e.preventDefault();
      this.change(() => down ? this.held.add(e.code) : this.held.delete(e.code));
    };
    this.listen(element, 'keydown', key(true)); this.listen(element, 'keyup', key(false));
    this.listen(element, 'blur', () => this.reset());
    this.listen(element.ownerDocument, 'visibilitychange', () => {
      if (element.ownerDocument.hidden) this.reset();
    });
    const point = (event: Event): void => {
      const e = event as PointerEvent;
      if (this.pointer.down && this.pointer.id !== e.pointerId) return;
      const rect = element.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left; this.pointer.y = e.clientY - rect.top;
    };
    this.listen(element, 'pointermove', point);
    this.listen(element, 'pointerdown', event => {
      const e = event as PointerEvent;
      if (this.pointer.down || e.button !== 0) return;
      point(event); this.pointer.down = true; this.pointer.id = e.pointerId;
      element.focus({ preventScroll: true }); element.setPointerCapture?.(e.pointerId);
    });
    const release = (event: Event): void => {
      if ((event as PointerEvent).pointerId !== this.pointer.id) return;
      point(event); this.pointer.down = false; this.pointer.id = -1;
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) this.listen(element, name, release);
  }

  down(action: string): boolean {
    return this.virtual.has(action) || (this.bindings[action]?.some(code => this.held.has(code)) ?? false);
  }
  justPressed(action: string): boolean { return this.pressed.has(action); }
  justReleased(action: string): boolean { return this.released.has(action); }
  axis(negative: string, positive: string): number { return Number(this.down(positive)) - Number(this.down(negative)); }
  /** Feed touch controls, gamepad mappings, or a replay into the same action interface. */
  setAction(action: string, down: boolean): void {
    this.change(() => down ? this.virtual.add(action) : this.virtual.delete(action), action);
  }
  /** Call once after each simulation step, not each display frame. */
  endFrame(): void { this.pressed.clear(); this.released.clear(); }
  reset(): void {
    this.held.clear(); this.virtual.clear(); this.endFrame();
    if (this.pointer.id >= 0 && this.element.hasPointerCapture?.(this.pointer.id)) this.element.releasePointerCapture(this.pointer.id);
    this.pointer.down = false; this.pointer.id = -1;
  }
  dispose(): void { this.reset(); for (const dispose of this.disposers.splice(0)) dispose(); }

  private change(mutate: () => unknown, extra?: string): void {
    const actions = new Set([...Object.keys(this.bindings), ...this.virtual, ...(extra ? [extra] : [])]);
    const before = new Map([...actions].map(action => [action, this.down(action)]));
    mutate();
    for (const action of actions) {
      if (!before.get(action) && this.down(action)) this.pressed.add(action);
      if (before.get(action) && !this.down(action)) this.released.add(action);
    }
  }
  private listen(target: EventTarget, name: string, callback: EventListener): void {
    target.addEventListener(name, callback);
    this.disposers.push(() => target.removeEventListener(name, callback));
  }
}
