var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/* Toast notification — shown briefly via window.dispatchEvent('nv-toast', detail). */
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
let NvToast = class NvToast extends LitElement {
    constructor() {
        super(...arguments);
        this.visible = false;
        this.msg = '';
        this.icon = '✓';
        this.timer = null;
        this.onToast = (e) => {
            const detail = e.detail;
            this.msg = detail.msg ?? 'Done';
            this.icon = detail.icon ?? '✓';
            this.visible = true;
            this.setAttribute('visible', '');
            if (this.timer !== null)
                window.clearTimeout(this.timer);
            this.timer = window.setTimeout(() => {
                this.visible = false;
                this.removeAttribute('visible');
            }, 1800);
        };
    }
    static { this.styles = css `
    :host {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: var(--bg-2);
      border: 1px solid var(--line-2);
      border-radius: var(--radius);
      padding: 10px 14px;
      font-size: 12.5px;
      box-shadow: var(--shadow);
      z-index: 100;
      opacity: 0; pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      display: flex; align-items: center; gap: 8px;
    }
    :host([visible]) {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }
    .icon { color: var(--accent); }
  `; }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('nv-toast', this.onToast);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('nv-toast', this.onToast);
    }
    render() {
        return html `<span class="icon">${this.icon}</span><span>${this.msg}</span>`;
    }
};
__decorate([
    state()
], NvToast.prototype, "visible", void 0);
__decorate([
    state()
], NvToast.prototype, "msg", void 0);
__decorate([
    state()
], NvToast.prototype, "icon", void 0);
NvToast = __decorate([
    customElement('nv-toast')
], NvToast);
export { NvToast };
export function toast(msg, icon = '✓') {
    window.dispatchEvent(new CustomEvent('nv-toast', { detail: { msg, icon } }));
}
