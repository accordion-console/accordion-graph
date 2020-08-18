import { html, TemplateResult, customElement, LitElement, PropertyDeclarations, CSSResult, css, eventOptions } from 'lit-element';
import bulmaCss from 'bulma/css/bulma.css'; // required lit-scss-loader
import './accordion-select';
import './accordion-multi-check-box';

@customElement('accordion-option-modal')
export class AccordionOptionModal extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      show: { type: Boolean, reflect: true, },
    };
  }

  show: boolean;

  constructor() {
    super();  

    this.show = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {    
    
  }  

  @eventOptions({ capture: false })
  onClickBackground(event: Event): void {
    event.stopPropagation();
    const { target } = event;

    if ((target as HTMLElement).classList.contains(`wrap`)) {
      this.hide();
    }    
  }

  hide(): void {
    this.show = false;
  }
  
  protected render(): TemplateResult {
    return html`
      <div 
        class="wrap"
        @click=${this.onClickBackground}
      >
        <div 
          class="content"
        >
          <header>
            Option
          </header>
          <main>
            <slot></slot>            
          </main>
          <footer>
            <button 
              class="cancel-button button is-small"
              @click=${this.hide}
            >OK</button>
          </footer>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      bulmaCss,
      css`
    :host {
      position: absolute;
      width: 100%;
      height: 100%;      
      z-index: 1000;      

      pointer-events: none;
      visibility: hidden;
      opacity: 0;
    }

    :host([show]) {
      pointer-events: all;
      visibility: visible;
      opacity: 1;      
    }

    .wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      
      background-color: rgba(0, 0, 0, 0.1);
      transition: all 200ms ease;      
    }

    .content {
      display: flex;

      width: 400px;
      height: 300px;
      background-color: #fff;

      max-width: 80vw;
      max-height: 80vh;
      flex-direction: column;
      border-radius: 4px;
      padding: 0px 20px 20px;
    }

    header {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: rgb(51, 51, 51);
      margin-bottom: 10px;
      flex: 0 0 50px;
      border-bottom: 1px solid rgb(224, 224, 224);

      flex: 0 0 50px;
      height: 50px;
      box-sizing: border-box;
    }

    main {
      flex: 1 1 auto;
      overflow-x: hidden;
      overflow-y: scroll;

      display: flex;
      flex-direction: column;
    }

    footer {
      flex: 0 0 50px;
      height: 50px;

      display: flex;
      justify-content: flex-end;      
      align-items: flex-end;
    }

    .save-button {
      color: #fff;
      margin-left: 10px;
      background-color: rgb(98, 70, 141);
    }

    .save-button:hover,
    .save-button:active,
    .save-button:focus {
      color: #fff;
    }

    ::slotted(accordion-select),
    ::slotted(accordion-multi-check-box) {
      --acc-width: 380px;
    }
    
    ::slotted(.display-content) {
      padding: 0;
    }    
    `];
  }
}
