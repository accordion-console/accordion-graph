import { html, css, LitElement, PropertyDeclarations, queryAll, } from 'lit-element';
import '@material/mwc-select';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-button';
import { IconOption, IconRefresh, } from './components/icon-element';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import popper from 'cytoscape-popper';
import tippy, { sticky, } from 'tippy.js';

cytoscape.use(dagre);
cytoscape.use(popper);

export interface NodesData {
  data: {
    app?: string;
    id?: string;
    isGroup?: string;
    namespace?: string;
    nodeType?: string;
    parent?: string;
  };
}

export enum NodeType {
  AGGREGATE = 'aggregate',
  APP = 'app',
  SERVICE = 'service',
  UNKNOWN = 'unknown',
  WORKLOAD = 'workload'
}

export class AccordionGraph extends LitElement {  
  static get properties(): PropertyDeclarations {
    return {
      hideInfoBox: { type: Boolean, },
      namespaceList: { type: Array, },
      selectedNamespaceIndex: { type: Number, },
      graphType: { type: Array, },
      selectedGraphTypeIndex: { type: Number, },
    }
  }

  hideInfoBox = false;
  namespaceList = [`namespace 1`, `namespace 2`];
  selectedNamespaceIndex = 0;
  graphType = [`App`, `Versioned App`, `Service`, `Workload`];
  selectedGraphTypeIndex = 0;

  private cy?: cytoscape.Core;

  @queryAll(`mwc-select`) protected selectBoxs!: HTMLElement[]|null;

  disconnectedCallback(): void {
    this.cy?.destroy();
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    this.initCytoscape();
  }

  protected updated(): void {
    this.setCustomStyleMwcSelect();
  }

  async initCytoscape(): Promise<void> {
    // NOTE: Kiali Graph API Parameter
    // duration
    // graphType
    // injectServiceNodes
    // groupBy
    // appenders
    // namespaces
    const data = await fetch('/server/namespaces/graph?duration=21600s&graphType=app&injectServiceNodes=true&groupBy=app&appenders=deadNode,sidecarsCheck,serviceEntry,istio,unusedNode,securityPolicy&namespaces=book-info').then( res => res.json() );
    const elements = data.elements;
    console.log(data);    

    this.cy = cytoscape({
      container: this.shadowRoot?.querySelector(`.graph`),
      elements: elements,
      boxSelectionEnabled: false,
      autounselectify: true,
      style: [                
      ],    
      layout: {
        name: 'dagre',
        fit: true,
        nodeDimensionsIncludeLabels: true,
        rankDir: 'LR'
      }    
    });

    this.cy.autolock(true);

    this.initTippy(elements.nodes);  
    this.cy.on('zoom', (event) => {
      const zoom = event.cy.zoom();

      this.shadowRoot.querySelectorAll(`.tippy-tooltip`).forEach(tooltip => {
        (tooltip as HTMLElement).style.transform = `translateY(${zoom * 5}px) scale(${zoom * 0.8})`;
      });
    });
  }

  initTippy(datas: NodesData[]): void {
    console.log(datas);
    datas.forEach((each, index) => {
      const { data } = each;

      if (!data.parent) {
        const node = this.cy!.nodes().eq(index);        
        
        const tippy = this.makeTippy(node, (data.app as string));

        tippy.show();

        return;
      }
      
    });    
  }

  // Tippy.js v6+ is not compatible with Popper v1. so, Tippy you can use is v5.
  makeTippy(node: cytoscape.NodeSingular, text: string) {    
    const ref = node.popperRef();
    const dummyDomEle = document.createElement('div');

    const tip = tippy(dummyDomEle, {
      onCreate: (instance) => {
        instance.popperInstance.reference = ref;
      },
      lazy: false,
      trigger: 'manual',

      content: () => {
        const div = document.createElement('div');

        div.innerHTML = text;

        return div;
      },
      plugins: [
        sticky,
      ],
      arrow: true,
      placement: 'bottom',
      hideOnClick: false,
      multiple: false,
      sticky: true,
      interactive: false,
      theme: 'light-border',
      boundary: this.shadowRoot.querySelector(`.graph`) as HTMLElement,
      appendTo: this.shadowRoot.querySelector(`.graph`),
      popperOptions: {
        modifiers: {
          preventOverflow: {
            boundariesElement: this.shadowRoot.querySelector(`.graph`) as HTMLElement,
          }
        }
      }
    });

    return tip;
  }

  // NOTE: mwc-select dont' have a custom-property, height.
  async setCustomStyleMwcSelect(): Promise<void> {
    await this.updateComplete;
    const selectBoxs = this.selectBoxs;
    selectBoxs?.forEach(selectBox => {
      // NOTE: fix ie11 css
      (selectBox.shadowRoot?.querySelector(`.mdc-select__anchor`) as HTMLElement).style.width = `180px`;
      (selectBox.shadowRoot?.querySelector(`.mdc-select__anchor`) as HTMLElement).style.height = `30px`;      
    });    
  }

  render() {
    return html`
    <div class="graph-wrap">
      <div class="toolbar">

        <mwc-select class="namespace-filter" outlined label="namespace">
          ${this.namespaceList.map((item, index) => html`<mwc-list-item ?selected=${this.selectedNamespaceIndex === index} value="${index}">${item}</mwc-list-item>`)}          
        </mwc-select>

        <mwc-select class="graph-type" outlined label="Graph Type">
          ${this.graphType.map((item, index) => html`<mwc-list-item ?selected=${this.selectedNamespaceIndex === index} value="${index}">${item}</mwc-list-item>`)}          
        </mwc-select>

        <!-- NOTE: Find / Hide Search Input -->
        <!-- <div class="find-or-hide">
          <input class="search--find" type="search" placeholder="Find"/>
          <input class="search--hide" type="search" placeholder="Hide"/>
        </div> -->

        <mwc-button class="option-button" label="">${IconOption}</mwc-button>

        <mwc-button class="refresh-button" label="">${IconRefresh}</mwc-button>
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

    .graph-wrap {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .toolbar {
      display: flex;
      flex: 0 0 70px;
      flex-direction: row;
    }

    .graph-or-info {
      flex: 1 1 auto;

      display: flex;
      flex-direction: row;
    }

    .graph {
      flex: 1 1 auto;
      overflow: hidden;
    }

    .info {
      flex: 0 0 300px;
      width: 300px;
    }

    .toolbar,
    .graph,
    .info {
      box-sizing: border-box;
      border: 1px solid rgb(224, 224, 224);
    }

    .namespace-filter,
    .graph-type {      
      width: 180px;
      margin: 10px;
      margin-top: 30px;
      height: 30px;
    }

    mwc-select {
      --mdc-menu-item-height: 30px;
      --mdc-theme-primary: rgb(65, 61, 143);
      background-color: rgb(255, 255, 255);  
    }

    mwc-list-item {
      height: 30px;
    }

    .find-or-hide {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-evenly;
      width: 180px;
    }

    .search--find {
      margin-top: 10px;
    }

    .search--find,
    .search--hide {
      white-space: normal;
      align-items: center;
      font-size: 12px;
      color: rgb(51, 51, 51);
      position: relative;
      margin-bottom: 10px;
      border-width: 1px;
      border-style: solid;
      border-color: rgb(171, 180, 190);
      border-radius: 3px;
      padding: 5px 10px 5px 10px;
      outline: none;
    }

    .option-button,
    .refresh-button {
      display: flex;
      align-self: center;      
      color: #666;
      width: 60px;
      height: 40px;

      border: none;
      margin-top: auto;
      margin-bottom: auto;      
    }

    .icon-option,
    .icon-refresh {      
      color: #666;
      border: none;
      width: 20px;
      height: 20px;
    }
    
    .option-button {
      margin-left: auto;
    }

    .refresh-button {
      margin-right: 10px;
    }    

    .tippy-tooltip {
      background-color: #393f44;
      color: #fff;
      font-size: 11px;
      padding: 5px;
      border-radius: 10px;
      transform: translate3d(0, 8px, 0);
    }

    .tippy-tooltip[data-out-of-boundaries] {
      opacity: 0;
    }
  `;
}
