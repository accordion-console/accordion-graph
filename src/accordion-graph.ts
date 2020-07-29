import { html, css, LitElement, PropertyDeclarations } from 'lit-element';

export class AccordionGraph extends LitElement {  
  static get properties(): PropertyDeclarations {
    return {
    }
  }

  render() {
    return html`
    <div class="accordion-graph">
      <div class="toolbar"></div>
      <div class="graph-or-info">
        <div class="graph">

        </div>

        <div class="info">
        
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

    .accordion-graph {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .toolbar {
      flex: 0 0 40px;
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
  `;
}
