import { html, TemplateResult, customElement, LitElement, PropertyDeclarations, CSSResult, css, eventOptions, } from 'lit-element';

@customElement('accordion-select')
export class AccordionSelect extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      title: { type: String, },
      data: { type: Array, },
      selectedIndex: { type: Number, },
      clicked: { type: Boolean, },
    };
  }

  title: string;
  data: string[];
  selectedIndex: number;
  clicked: boolean;

  private handler: any;

  constructor() {
    super();  
    this.title = `Title`;
    this.data = [`test1`,`test2`];
    this.selectedIndex = 0;
    this.clicked = false;

    this.handler = {};
  }

  disconnectedCallback() {
    document.removeEventListener(`click`, this.handler.onClickCloseAll);
    this.handler = undefined;
    super.disconnectedCallback();
  }

  @eventOptions({ capture: false, })
  onClickSelect(event: Event): void {
    const { currentTarget, target } = event;
    
    if (this.clicked && (target as HTMLElement).classList.contains(`custom-select`)) {      
      this.clicked = false;
      return;
    }

    this.clicked = !this.clicked;
    (currentTarget as HTMLButtonElement).focus();
    
    currentTarget.addEventListener(`blur`, () => {
      this.clicked = false;
    }, { once: true, });
  }

  @eventOptions({})
  onClickItem(event: Event, index: number): void {
    event.stopImmediatePropagation();

    this.selectedIndex = index;
    this.clicked = false;
  }

  protected render(): TemplateResult {
    return html`
      <button 
        class="custom-select"
        @click=${this.onClickSelect}
      >
        <strong class="title">${this.title}</strong>
        <!-- <select>
          ${this.data.map((text, index) => html`<option value="${index}">${text}</option>`)}          
        </select> -->

        <div class="select-selected ${this.clicked ? `clicked` : ``}">
          ${this.data[this.selectedIndex]}
          <div class="select-items ${this.clicked ? `` : `select-hide`}">
            ${this.data.map((text, index) => html`<div @click=${(event: Event) => this.onClickItem(event, index)}>${text}</div>`)}
          </div>
        </div>
      </button>
    `;
  }

  static get styles(): CSSResult {
    return css`
    :host {
      display: flex;
      align-items: flex-end;
    }

    .title {
      position: absolute;
      top: -10px;
      left: 10px;
      font-weight: normal;
      font-size: 12px;
      color: #777;
      background-color: #fff;
      padding: 0 10px;
      font-family: auto;
      white-space: nowrap;
    }

    .custom-select {
      position: relative;
      font-family: auto;
      margin: 10px;
      min-width: 180px;
    }
    
    .custom-select select {
      display: none;
    }
    
    .select-selected {
      color: #666;
      background-color: rgba(0, 0, 0, 0.1);
      text-align: left;
    }
    
    .select-selected:after {
      position: absolute;
      content: "";
      top: 14px;
      right: 10px;
      width: 0;
      height: 0;
      border: 4px solid transparent;
      border-color: #666 transparent transparent transparent;
    }
    
    .select-selected.clicked:after {
      border-color: transparent transparent #666 transparent;
      top: 10px;
    }
        
    .custom-select {
      background-color: #fff;
      padding: 8px 16px;
      color: #333;
      border: 1px solid rgba(0, 0, 0, 0.38);
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      padding-right: 50px;

      width: 180px;
      box-sizing: border-box;
    }

    .select-selected {
      border: none;
      outline: none;
      background-color: transparent;
    }

    .select-items > div:first-child {
      margin-top: 10px;
    }

    .select-items > div {
      background-color: #fff;
      padding: 8px 16px;
      color: #333;
      cursor: pointer;
      user-select: none;
      text-align: left;
      padding-left: 20px;
    }
    
    .select-items {
      position: absolute;
      background-color: #fff;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 99;
      box-shadow: 0 4px 10px 0 rgba(0,0,0,.35);
    }
    
    .select-hide {
      display: none;
    }
    
    .select-items div:hover, .same-as-selected {
      background-color: rgba(0, 0, 0, 0.1);
    }
    `;
  }
}
