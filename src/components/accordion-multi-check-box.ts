import { html, TemplateResult, customElement, LitElement, PropertyDeclarations, CSSResult, css, eventOptions, } from 'lit-element';

const IconCheckbox = html`<svg class="svg-inline--fa fa-check fa-w-16" width="20" height="20" aria-hidden="true" data-prefix="fas" data-icon="check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><path fill="currentColor" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path></svg>`;

const remove = (arr: any[], func: any) =>
  Array.isArray(arr)
    ? arr.filter(func).reduce((acc: any, val: any) => {
      arr.splice(arr.indexOf(val), 1);
      return acc.concat(val);
    }, [])
    : [];

@customElement('accordion-multi-check-box')
export class AccordionMultiCheckBox extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      title: { type: String, },
      data: { type: Array, },
      selectedIndex: { type: Array, },
      clicked: { type: Boolean, },
    };
  }

  title: string;
  data: string[];
  selectedIndex: number[];
  clicked: boolean;
  width: string;

  constructor() {
    super();  
    this.title = `Title`;
    this.data = [`test1`,`test2`];
    this.selectedIndex = [];
    this.clicked = false;
  }

  disconnectedCallback() {
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

    if (this.selectedIndex.includes(index)) {
      remove(this.selectedIndex, (n: number) => n === index);
    } else {
      this.selectedIndex.push(index);
    }   

    this.requestUpdate();
  }

  protected render(): TemplateResult {
    return html`
      <button 
        class="custom-select"
        @click=${this.onClickSelect}
      >
        <div class="select-selected ${this.clicked ? `clicked` : ``}">
          ${this.title}
          <span class="data-count">${this.selectedIndex.length}/${this.data.length}</span>
          <div class="select-items ${this.clicked ? `` : `select-hide`}">
            ${this.data.map((text, index) => html`
              <div 
                @click=${(event: Event) => this.onClickItem(event, index)}
              >${text} ${this.selectedIndex.includes(index) ? IconCheckbox : null}</div>`)}
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

      width: var(--acc-width, 180px);
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
      background-color: #fff;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 99;
      box-shadow: 0 4px 10px 0 rgba(0,0,0,.35);

      position: fixed;
      top: auto;
      right: auto;
      left: auto;
      transform: translate3d(-17px, 10px, 0);
      width: var(--acc-width, 180px);
    }
    
    .select-hide {
      display: none;
    }
    
    .select-items div:hover, .same-as-selected {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .fa-check {
      width: 10px;
      height: 10px;
      float: right;
      color: #666a;
    }

    .data-count {
      border-radius: 100%;
      background-color: #ddda;
      width: auto;
      padding: 0 7px;
      height: 20px;
      text-align: center;
      line-height: 160%;
      font-size: 14px;
      color: #333;
      position: absolute;
      right: 30px;
      top: 50%;
      transform: translateY(-50%);
    }
    `;
  }
}
