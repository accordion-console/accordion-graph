import { html, TemplateResult, customElement, LitElement, PropertyDeclarations, CSSResult, css, } from 'lit-element';

@customElement('accordion-select')
export class AccordionSelect extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      title: { type: String, },
      data: { type: Array, },
    };
  }

  title: string;
  data: string[];

  constructor() {
    super();  
    this.title = `Title`;
    this.data = [`test1`,`test2`];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {    
    this.init();
  }

  init(): void {
    const customSelectDiv = this.shadowRoot.querySelector(`.custom-select`);
    const selects = this.shadowRoot.querySelector(`select`);
    const selectedItem = document.createElement(`div`);
    selectedItem.classList.add(`select-selected`);
    selectedItem.textContent = selects.options[selects.selectedIndex].textContent;    
    customSelectDiv.appendChild(selectedItem);

    const hideItem = document.createElement(`div`);
    hideItem.classList.add(`select-items`);
    hideItem.classList.add(`select-hide`);      

    for (let i = 0; i < selects.length; i++) {
      const div = document.createElement(`div`);
      div.textContent = selects.options[i].textContent;
      div.addEventListener(`click`, (event: Event) => {
        const { target } = event;
        const selectElement = selects;
        const length = selectElement.length;
        const h = (target as HTMLElement).parentNode.previousSibling;
        let sameSelected: NodeListOf<HTMLElement>;

        for (let j = 0; j < length; j++) {
          if (selectElement.options[j].textContent === (target as HTMLElement).textContent) {
            selectElement.selectedIndex = j;
            h.textContent = (target as HTMLElement).textContent;
            sameSelected = (target as HTMLElement).parentNode.querySelectorAll(`.same-as-selected`);

            for (let k = 0; k < sameSelected.length; k++) {
              sameSelected[k].removeAttribute(`class`);
            }
            (target as HTMLElement).classList.add(`same-as-selected`);
            break;
          }          
        }        
        (h as HTMLInputElement).click();
      });

      hideItem.appendChild(div);  
    }
    customSelectDiv.appendChild(hideItem);
    selectedItem.addEventListener(`click`, (event: Event) => {
      const { target } = event;
      event.stopPropagation();
      this.closeAllSelect((event.target as HTMLElement));
      ((target as HTMLElement).nextSibling as HTMLElement).classList.toggle(`select-hide`);
      (target as HTMLElement).classList.toggle(`select-arrow-active`);
    });
  }

  closeAllSelect(element: HTMLElement): void {
    const items = this.shadowRoot.querySelectorAll(`.select-items`);
    const selectedItems = this.shadowRoot.querySelectorAll(`.select-selected`);
    const array = [];
    
    for (let i = 0; i < selectedItems.length; i++) {
      if (element === selectedItems[i]) {
        array.push(i);
      } else {
        selectedItems[i].classList.remove(`select-arrow-active`);
      }
    }

    for (let i = 0; i < items.length; i++) {
      if (array.indexOf(i)) {
        items[i].classList.add(`select-hide`);
      }
    }
  }

  getValue(): string {
    return this.shadowRoot.querySelector(`.select-selected`).textContent;
  }

  protected render(): TemplateResult {
    return html`
      <div class="custom-select">
        <strong class="title">${this.title}</strong>
        <select>
          ${this.data.map((text, index) => html`<option value="${index}">${text}</option>`)}          
        </select>
      </div>
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
      background-color: rgba(0, 0, 0, 0.1);
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
    
    .select-selected.select-arrow-active:after {
      border-color: transparent transparent #666 transparent;
      top: 10px;
    }
        
    .select-selected {
      background-color: #fff;
      padding: 8px 16px;
      color: #333;
      border: 1px solid rgba(0, 0, 0, 0.38);
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      padding-right: 50px;
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
