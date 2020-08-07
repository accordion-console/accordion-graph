import { html, LitElement, PropertyDeclarations, } from 'lit-element';
import { css, injectGlobal, } from 'emotion';
import { IconOption, IconRefresh, } from './components/icon-element';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import popper from 'cytoscape-popper';
import cyCanvas from 'cytoscape-canvas';
import tippy, { sticky, } from 'tippy.js';
import TrafficRender from './components/traffic-renderer';
import './components/context-menu';
import { AccordionGraphContextMenu } from './components/context-menu';
import './components/accordion-select';
import './components/option-modal';
import { AccordionOptionModal } from './components/option-modal';

cytoscape.use(dagre);
cytoscape.use(popper);
cytoscape.use(cyCanvas);

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

export const isCore = (target: cytoscape.NodeSingular | cytoscape.EdgeSingular | cytoscape.Core): target is cytoscape.Core => {
  return !('cy' in target);
};

export const isNode = (target: cytoscape.NodeSingular | cytoscape.EdgeSingular | cytoscape.Core): target is cytoscape.NodeSingular => {
  return !isCore(target) && target.isNode();
};

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
  private data: any;
  private trafficRenderer?: TrafficRender;  

  selectBoxs!: NodeListOf<Element>|null;
  optionModal!: AccordionOptionModal|null;

  disconnectedCallback(): void {
    this.cy?.destroy();
    this.cy = undefined;
    this.data = undefined;
    this.selectBoxs = undefined;
    this.optionModal = undefined;
    super.disconnectedCallback();
  }

  protected async firstUpdated(): Promise<void> {
    this.selectBoxs = this.querySelectorAll(`mwc-select`);
    this.optionModal = this.querySelector(`accordion-option-modal`);

    // NOTE: Kiali Graph API Parameter
    // duration, graphType, injectServiceNodes, groupBy, appenders, namespaces    
    this.data = await fetch('/kiali/namespaces/graph?duration=21600s&graphType=app&injectServiceNodes=true&groupBy=app&appenders=deadNode,sidecarsCheck,serviceEntry,istio,unusedNode,securityPolicy&namespaces=book-info').then( res => res.json() );

    this.initCytoscape();
  }

  protected updated(): void {
    this.setCustomStyleMwcSelect();
  }

  // ISSUE: https://github.com/cytoscape/cytoscape.js/issues/2081
  // don't use shadow dom
  createRenderRoot() {
    return this;
  }

  async initCytoscape(): Promise<void> {    
    const { elements } = this.data;
    const { nodes } = elements;
    console.log(this.data);

    this.addDataNodeType(nodes);
    this.addDataOpacity(nodes);

    this.cy = cytoscape({
      container: this?.querySelector(`.graph`),
      elements: elements,
      boxSelectionEnabled: false,
      autounselectify: true,
      style: [      
        {
          "selector": "node",
          "style": {
            ["shape" as any]: "data(type)",
          }
        },
        {
          "selector": ":child",          
          "style": {            
            'content': 'data(nodeType)',
            'text-valign': 'center',
            'color': 'white',
            'font-size': 8,
            'text-outline-width': 0.7,
            'text-transform': 'uppercase',
            'text-outline-color': '#666',
            'background-color': '#fff',
            'border-width': 1,
            'border-color': '#666',
            'width': 30,
            'height': 30,
            ['opacity' as any]: 'data(opacity)',
            ["border-style" as any]: 'data(borderStyle)',
          }
        }, 
        {
          "selector": ":parent",
          "style": {
            'background-color': 'rgba(255, 255, 255, 0.8)',
            'border-width': 1,
            'border-color': 'rgba(206, 205, 206, 0.5)',
          }
        },
        {
          "selector": "edge",
          "style": {
            'curve-style': 'straight',
            'target-arrow-shape': 'triangle-backcurve',
            "arrow-scale": 0.5,
            'width': 1,
            'color': 'white',
            'font-size': 8,
            'text-outline-width': 0.7,
            'text-transform': 'uppercase',
            'text-outline-color': '#666',
            'text-wrap': 'wrap',
          },
        },
      ],    
      layout: {
        name: 'dagre',
        fit: true,
        nodeDimensionsIncludeLabels: true,
        rankDir: 'LR'
      }    
    });  

    this.cy.autolock(true);

    this.addZoomEventListener();
    this.addMouseEventListeners();

    this.initTippy(elements.nodes);    

    this.trafficRenderer = new TrafficRender(this.cy, this.cy.edges());

    this.trafficRenderer!.start();

    this.cy.on('destroy', (_event: cytoscape.EventObject) => {
      this.trafficRenderer!.stop();
      this.cy = undefined;
    });
  }

  addDataNodeType(nodes: any): void {
    nodes.forEach((node: any) => {
      switch (node.data.nodeType) {
        case `app`:
          node.data.type = `round-rectangle`;
          break;        
        case `service`:
          node.data.type = `round-triangle`;
          break;
        case `workload`:
          node.data.type = `ellipse`;
          break;
        case `unknown`:
          node.data.type = `round-diamond`;
          break;
        default:
          node.data.type = `round-tag`;
      }      
    });
  }

  addDataOpacity(nodes: any): void {
    nodes.forEach((node: any) => {
      if (node.data.isUnused) {
        node.data.opacity = 0.5;
        node.data.borderStyle = `dashed`;
        return;
      }
      node.data.opacity = 1;
      node.data.borderStyle = `solid`;
    });
  }

  initTippy(datas: NodesData[]): void {
    console.log(datas);
    datas.forEach((each, index) => {
      const { data } = each;
      const node = this.cy!.nodes().eq(index);   
      if (!data.parent) {                     
        const tippy = this.makeTippy(node, (data.app as string), `parent`);

        tippy.show();
        return;
      }
      const tippy = this.makeTippy(node, (data.app as string), `child`);
      tippy.show();
    });    
  }

  // Tippy.js v6+ is not compatible with Popper v1. so, Tippy you can use is v5.
  makeTippy(node: cytoscape.NodeSingular, text: string, theme?: string ) {
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
      placement: theme === `parent` ? `top` : `bottom`,
      hideOnClick: false,
      multiple: false,
      sticky: true,
      interactive: false,
      theme: theme,
      boundary: this.querySelector(`.graph`) as HTMLElement,
      appendTo: document.body,
      popperOptions: {
        modifiers: {
          preventOverflow: {
            boundariesElement: this.querySelector(`.graph`) as HTMLElement,
          }
        }
      },
      zIndex: 1,
    });

    return tip;
  }

  addZoomEventListener(): void {
    this.cy.on('zoom', (event) => {
      const zoom = event.cy.zoom();

      document.querySelectorAll(`body > .tippy-popper:not([x-placement="right"]) .tippy-content`).forEach(tooltip => {
        (tooltip as HTMLElement).style.transform = `scale(${zoom / 1.7})`;
      });
    });
  }

  addMouseEventListeners(): void {
    this.cy.on('mouseover', 'node,edge', (event) => {    
      const blurColor = `#dfe4ea`;

      this.setBlurStyle(this.cy, {
        'background-color': blurColor,
        'line-color': blurColor,
        'source-arrow-color': blurColor,
        'color': blurColor
      });

      this.setFocus(event.target);
    });    

    this.cy.on('mouseout', 'node,edge', () => {    
      this.setResetFocus();
    }); 

    this.cy.on(`cxttap`, `node`, (node) => {
      const tippy = this.makeContextMenu(node.target);
      tippy.show();
    });
  }

  makeContextMenu(node: cytoscape.NodeSingular) {
    const ref = node.popperRef();
    const dummyDomEle = document.createElement('div');

    const tip = tippy(dummyDomEle, {
      onCreate: (instance) => {
        instance.popperInstance.reference = ref;
      },
      lazy: false,
      trigger: 'manual',

      content: () => {
        const contextMenu: AccordionGraphContextMenu = (document.createElement('accordion-graph-context-menu') as AccordionGraphContextMenu);

        contextMenu.name = node.data().app;

        return contextMenu;
      },
      plugins: [
        sticky,
      ],
      arrow: true,
      placement: `right`,
      hideOnClick: false,
      multiple: false,
      sticky: true,
      interactive: false,
      boundary: this.querySelector(`.graph`) as HTMLElement,
      appendTo: document.body,
      popperOptions: {
        modifiers: {
          preventOverflow: {
            boundariesElement: this.querySelector(`.graph`) as HTMLElement,
          }
        }
      },
      zIndex: 1,
    });

    return tip;
  }
  
  // NOTE: mwc-select dont' have a custom-property, height.
  async setCustomStyleMwcSelect(): Promise<void> {
    await this.updateComplete;
    const selectBoxs = this.selectBoxs;
    selectBoxs.forEach(selectBox => {
      // NOTE: fix ie11 css
      (selectBox?.shadowRoot?.querySelector(`.mdc-select__anchor`) as HTMLElement).style.height = `30px`;      
    });    
  }

  setBlurStyle(cy: cytoscape.Core, style: any) {
    cy.nodes().forEach((target) => {
        target.style(style);        
    });

    cy.edges().forEach((target) => {
      target.addClass(`mousedim`);
      this.setOpacityElement(target, 0.5);
  });
  }

  setFocus(target: any) {
    const selectedColor = 'rgb(222, 243, 255)';
    const successorColor = selectedColor;
    const predecessorsColor = selectedColor;
    const nodeColor = '#fff';
    const nodeActiveColor = selectedColor;

    target.style('background-color', nodeActiveColor);
    target.style('color', nodeColor);
    target.removeClass(`mousedim`);
    this.setOpacityElement(target, 1);    

    if (target.isParent()) {      
      target.style('background-color', `#fff`);

      target.children().each((target2: any) => {        
        target2.style('color', nodeColor);
        target2.style('background-color', successorColor);

        target2.connectedEdges().each((target3: any) => {
          const protocol = target3.data().traffic.protocol;
          const rates = target3.data().traffic.rates?.[protocol] ? `\n(${target3.data().traffic.rates?.[protocol]})` : ``;
          // TODO: add PercentReq, responses

          target3.style(`opacity`, 1);
          target3.style(`label`, protocol + rates);
          target3.removeClass(`mousedim`);
        });

        target2.neighborhood().each((target3: any) => {
          target3.style('color', nodeColor);
          target3.style('background-color', successorColor);
        });
      });          
    }

    if (target.isEdge()) {
      const protocol = target.data().traffic.protocol;
      const rates = target.data().traffic.rates?.[protocol] ? `\n(${target.data().traffic.rates?.[protocol]})` : ``;
      // TODO: add PercentReq, responses

      target.style(`opacity`, 1);
      target.style(`label`, protocol + rates);
      target.removeClass(`mousedim`);
    }

    target.connectedNodes().each((event: any) => {
      event.style('color', nodeColor);
      event.style('background-color', successorColor);
    });

    target.connectedEdges().each((target2: any) => {
      const protocol = target2.data().traffic.protocol;
      const rates = target2.data().traffic.rates?.[protocol] ? `\n(${target2.data().traffic.rates?.[protocol]})` : ``;
      // TODO: add PercentReq, responses

      target2.style(`opacity`, 1);
      target2.style(`label`, protocol + rates);
      target2.removeClass(`mousedim`);
    });

    target.neighborhood().each((event: any) => {
        // 이웃한 엣지와 노드
        event.style('color', nodeColor);
        event.style('background-color', predecessorsColor);
        this.setOpacityElement(event, 1);
    });
  }

  setOpacityElement(target: any, degree: number) {
    target.style('opacity', degree);
  }

  setResetFocus() {
    this.cy.nodes().forEach((target) => {
        target.style('background-color', `#fff`);
        target.style('color', `#fff`);
        target.style('opacity', 1);
    });
    this.cy.edges().forEach((target) => {
        target.style('opacity', 1);
        if (!target.hasClass(`mousedim`)) {
          target.style(`label`, ``);
        }        
        target.removeClass(`mousedim`);
    });
  }

  render() {
    return html`    
    <div class="graph-wrap ${this.styles()}">
      <div class="toolbar">
        <accordion-select class="namespace-filter" title="namespace" .data="${this.namespaceList}"></accordion-select>        

        <accordion-select class="namespace-filter" title="Graph Type" .data="${this.graphType}"></accordion-select>        

        <!-- NOTE: Find / Hide Search Input -->
        <!-- <div class="find-or-hide">
          <input class="search--find" type="search" placeholder="Find"/>
          <input class="search--hide" type="search" placeholder="Hide"/>
        </div> -->

        <button 
          class="option-button"
          @click=${() => this.optionModal.show = !this.optionModal.show || true}
        >${IconOption}</button>

        <button class="refresh-button">${IconRefresh}</button>
      </div>
      <div class="graph-or-info">
        <div class="graph">
        </div>

        <div class="info ${this.hideInfoBox ? `hide` : ``}">
        
        </div>
      </div>
      <accordion-option-modal></accordion-option-modal>
    </div>    
    `;
  }

  styles() {
    return css`
    .hide {
      display: none;
    }

    &.graph-wrap {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background-color: #fff;
      position: relative;
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
      background-color: rgb(242, 242, 242);
      position: relative;
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
      align-items: center;
      justify-content: center;
      background-color: transparent;
      cursor: pointer;
      color: #666;
      width: 60px;
      height: 40px;
      outline: none;
      border-radius: 4px;

      border: none;
      margin-top: auto;
      margin-bottom: auto;      
    }

    .option-button:hover,
    .refresh-button:hover {
      color: #777a;
      background-color: #eeea;
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

    .tippy-tooltip[data-out-of-boundaries] {
      opacity: 0;
    }

    .parent-theme .tippy-content {
      border-radius: 3px;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 2px 8px 0 rgba(0, 0, 0, 0.19);
      display: flex;
      background-color: #393f44;
      color: #fff;
      font-size: 11px;
      padding: 3px 5px;
      border-radius: 3px;
      border-width: 1px;
    }
    
    .child-theme .tippy-content {
      align-items: center;
      background-color: #fff;
      color: #030303;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 2px 8px 0 rgba(0, 0, 0, 0.19);
      border-radius: 3px;
      border-width: 1px;
      display: flex;
      font-size: 8px;
      padding: 3px 5px;
    }    

    mwc-button {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  }
}

// ISSUE: https://github.com/cytoscape/cytoscape.js/issues/2081
// don't use shadow dom
injectGlobal`
accordion-graph {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: #fff;  
}

.tippy-tooltip[data-out-of-boundaries] {
  opacity: 0;
}

.parent-theme .tippy-content {
  border-radius: 3px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 2px 8px 0 rgba(0, 0, 0, 0.19);
  display: flex;
  background-color: #393f44;
  color: #fff;
  font-size: 11px;
  padding: 3px 5px;
  border-radius: 3px;
  border-width: 1px;
}

.child-theme .tippy-content {
  align-items: center;
  background-color: #fff;
  color: #030303;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 2px 8px 0 rgba(0, 0, 0, 0.19);
  border-radius: 3px;
  border-width: 1px;
  display: flex;
  font-size: 8px;
  padding: 3px 5px;
}    
`;