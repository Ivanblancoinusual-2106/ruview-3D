var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/* Modal dialog — opened via window.dispatchEvent('nv-modal', { title, body, buttons }). */
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
let NvModal = class NvModal extends LitElement {
    constructor() {
        super(...arguments);
        this.open = false;
        this.mTitle = '';
        this.mBody = '';
        this.buttons = [];
        this.onModal = (e) => {
            const r = e.detail;
            this.mTitle = r.title;
            this.mBody = r.body;
            this.buttons = r.buttons ?? [{ label: 'Close', variant: 'primary' }];
            this.open = true;
            this.setAttribute('open', '');
            // a11y: focus the first interactive element inside the modal so keyboard
            // users land in the dialog rather than behind it. Light focus trap via
            // the keydown handler below catches Tab cycling.
            requestAnimationFrame(() => {
                const root = this.shadowRoot;
                if (!root)
                    return;
                const first = root.querySelector('input, select, textarea, button:not(.close)');
                first?.focus();
            });
        };
        this.onKey = (e) => {
            if (e.key === 'Escape' && this.open)
                this.close();
        };
    }
    static { this.styles = css `
    :host {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px);
      z-index: 200;
      display: grid; place-items: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.18s;
    }
    :host([open]) { opacity: 1; pointer-events: auto; }
    .modal {
      background: var(--bg-1);
      border: 1px solid var(--line-2);
      border-radius: var(--radius);
      box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7);
      width: min(520px, 92vw);
      max-height: 86vh;
      display: flex; flex-direction: column;
      transform: translateY(12px) scale(0.98);
      transition: transform 0.22s cubic-bezier(0.2,0.7,0.3,1);
    }
    :host([open]) .modal { transform: translateY(0) scale(1); }
    .h {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      display: flex; align-items: center; justify-content: space-between;
    }
    .h .ttl { font-size: 14px; font-weight: 600; }
    .body { padding: 16px; overflow-y: auto; font-size: 13px; color: var(--ink-2); line-height: 1.55; }
    .f {
      padding: 12px 16px;
      border-top: 1px solid var(--line);
      display: flex; gap: 8px; justify-content: flex-end;
    }
    button {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      cursor: pointer;
      font-family: inherit;
      border: 1px solid var(--line);
      background: var(--bg-2); color: var(--ink);
    }
    button.ghost { background: transparent; }
    button.primary { background: var(--accent); border-color: var(--accent); color: #1a0f00; }
    button.danger { background: var(--bad); border-color: var(--bad); color: #fff; }
    .close {
      width: 28px; height: 28px;
      background: transparent; border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--ink-2);
    }
  `; }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('nv-modal', this.onModal);
        window.addEventListener('keydown', this.onKey);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('nv-modal', this.onModal);
        window.removeEventListener('keydown', this.onKey);
    }
    updated() {
        if (!this.open)
            return;
        const root = this.shadowRoot;
        if (!root)
            return;
        // Trap Tab inside the modal while open.
        const trap = (e) => {
            if (e.key !== 'Tab')
                return;
            const focusables = Array.from(root.querySelectorAll('input, select, textarea, button, [href]')).filter((el) => !el.hasAttribute('disabled'));
            if (focusables.length === 0)
                return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = root.activeElement ?? null;
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            }
            else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };
        root.removeEventListener('keydown', trap);
        root.addEventListener('keydown', trap);
    }
    close() { this.open = false; this.removeAttribute('open'); }
    clickBtn(b) { b.onClick?.(); this.close(); }
    render() {
        return html `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="h">
          <div class="ttl">${this.mTitle}</div>
          <button class="close" @click=${() => this.close()}>×</button>
        </div>
        <div class="body" .innerHTML=${this.mBody}></div>
        <div class="f">
          ${this.buttons.map((b) => html `
            <button class=${b.variant ?? ''} @click=${() => this.clickBtn(b)}>${b.label}</button>
          `)}
        </div>
      </div>
    `;
    }
};
__decorate([
    state()
], NvModal.prototype, "open", void 0);
__decorate([
    state()
], NvModal.prototype, "mTitle", void 0);
__decorate([
    state()
], NvModal.prototype, "mBody", void 0);
__decorate([
    state()
], NvModal.prototype, "buttons", void 0);
NvModal = __decorate([
    customElement('nv-modal')
], NvModal);
export { NvModal };
export function openModal(req) {
    window.dispatchEvent(new CustomEvent('nv-modal', { detail: req }));
}
