import { html, css, LitElement, PropertyDeclarations, query, } from 'lit-element';
import '@material/mwc-select';
import '@material/mwc-list/mwc-list-item';

export class AccordionGraph extends LitElement {  
  static get properties(): PropertyDeclarations {
    return {
      hideInfoBox: { type: Boolean, },
      namespaceList: { type: Array, },
    }
  }

  hideInfoBox = false;
  namespaceList = [`namespace 1`, `namespace 2`];

  @query(`mwc-select`) protected selectBox!: HTMLElement|null;

  protected updated(): void {
    this.setCustomStyleMwcSelect();
  }

  // NOTE: mwc-select dont' have a custom-property, height.
  async setCustomStyleMwcSelect(): Promise<void> {
    await this.updateComplete;
    const selectBox = this.selectBox;
    const selectBoxShadowRoot = selectBox?.shadowRoot;
    const sheet = new CSSStyleSheet();
    const cssStyle = css`
    .mdc-select .mdc-select__anchor {
      height: 30px;
    }
    `;
    
    if (!selectBox) {
      return;
    }			

    (sheet as any).replaceSync(cssStyle.cssText);
    (selectBoxShadowRoot as any).adoptedStyleSheets = [...(selectBoxShadowRoot as any).adoptedStyleSheets, sheet];
  }

  render() {
    return html`
    <div class="accordion-graph">
      <div class="toolbar">
        <!-- NOTE: Namespace Filter -->
        <mwc-select class="namespace-filter" outlined label="namespace">
          <mwc-list-item></mwc-list-item>
          ${this.namespaceList.map(namespace => html`<mwc-list-item value="0">${namespace}</mwc-list-item>`)}
          
        </mwc-select>
        <!-- TODO: Graph Type Filter -->
        <!-- TODO: Find / Hide Search Input -->
        <!-- TODO: Option Button -->
        <!-- TODO: Refresh Button -->
      </div>
      <div class="graph-or-info">
        <div class="graph">

        </div>

        <div class="info ${this.hideInfoBox ? `hide` : ``}">
        
        </div>
      </div>
    </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      background-color: #fff;      
    }

    .hide {
      display: none;
    }

    .accordion-graph {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .toolbar {
      display: flex;
      align-items: flex-end;
      flex: 0 0 60px;
    }

    .graph-or-info {
      flex: 1 1 auto;

      display: flex;
      flex-direction: row;
    }

    .graph {
      flex: 1 1 auto;
    }

    .info {
      flex: 0 0 300px;
    }

    .accordion-graph,
    .toolbar,
    .graph,
    .info {
      box-sizing: border-box;
      border: 1px solid rgb(224, 224, 224);
    }

    .namespace-filter {
      margin-left: 10px;
    }

    mwc-list-item {
      height: 30px;
    }
  `;
}
