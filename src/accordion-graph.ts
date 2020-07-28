import { html, css, LitElement, PropertyDeclarations } from 'lit-element';

export class AccordionGraph extends LitElement {  
  static get properties(): PropertyDeclarations {
    return {
      title: { type: String, },
      counter: { type: Number, },
    }
  }

  title = 'Hey there';
  counter = 5;

  __increment() {
    this.counter += 1;
  }

  render() {
    return html`
      <h2>${this.title} Nr. ${this.counter}!</h2>
      <button @click=${this.__increment}>increment</button>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 25px;
      color: var(--accordion-graph-text-color, #000);
    }
  `;
}
