import { html, TemplateResult, customElement, LitElement, PropertyDeclarations, CSSResult, css, } from 'lit-element';

@customElement('accordion-graph-context-menu')
export class AccordionGraphContextMenu extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      name: { type: String, },
    };
  }

  name: string;

  connectedCallback() {
    super.connectedCallback();
  }

  protected firstUpdated(): void {
    const button = this.shadowRoot.querySelector(`button`);

    button.focus();

    button.addEventListener(`blur`, () => {    
      this.closest(`.tippy-popper`).remove();
    }, { once: true, });
  }

  protected render(): TemplateResult {
    return html`
      <button class="wrap">
        <strong class="title">${this.name}</strong>
        <ul>
          <li>Show Details</li>
          <li>Show Traffic</li>
          <li>Show InBound Metrics</li>
          <li>Show OutBound Metrics</li>
        </ul>
      </button>
    `;
  }

  static get styles(): CSSResult {
    return css`
    .wrap {
      margin-left: 10px;
      outline: none;
      background-color: #fff;      
      box-shadow: 0 3px 14px -0.5px rgba(0,8,16,.08);
      border: 1px solid rgba(0,8,16,.15);
    }   

    .title {
      text-align: left;
      font-size: 14px;
      font-family: auto;

      display: block;
      margin: 5px 0;
      font-weight: 600;
    }

    ul {
      list-style: none;
      padding: 0;

      text-align: left;
      font-size: 12px;
      font-family: auto;
    }

    li {
      margin: 3px auto;
    }

    li:hover {
      cursor: pointer;
      background-color: rgb(222, 243, 255);
    }
    `;
  }
}
