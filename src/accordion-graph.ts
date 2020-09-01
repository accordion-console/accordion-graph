import { html, LitElement, PropertyDeclarations } from 'lit-element';
import { css, injectGlobal } from 'emotion';
import { IconOption, IconRefresh } from './components/icon-element';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import popper from 'cytoscape-popper';
import cyCanvas from 'cytoscape-canvas';
import tippy, { sticky } from 'tippy.js';
import TrafficRender from './components/traffic-renderer';
import './components/context-menu';
import { AccordionGraphContextMenu } from './components/context-menu';
import './components/accordion-select';
import './components/option-modal';
import { AccordionOptionModal } from './components/option-modal';
import { AccordionSelect } from './components/accordion-select';
import './components/graph-info';
import {
  getAccumulatedTrafficRateHttp,
  getAccumulatedTrafficRateGrpc,
} from './components/traffic-rate';
import { AccordionGraphInfo } from './components/graph-info';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeHtmlLabel = require('cy-node-html-label');

cytoscape.use(dagre);
cytoscape.use(popper);
cytoscape.use(cyCanvas);
nodeHtmlLabel(cytoscape);

export interface NodesData {
  data: {
    app?: string;
    service?: string;
    workload?: string;
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
  WORKLOAD = 'workload',
}

export const isCore = (
  target: cytoscape.NodeSingular | cytoscape.EdgeSingular | cytoscape.Core
): target is cytoscape.Core => {
  return !('cy' in target);
};

export const isNode = (
  target: cytoscape.NodeSingular | cytoscape.EdgeSingular | cytoscape.Core
): target is cytoscape.NodeSingular => {
  return !isCore(target) && target.isNode();
};

export class AccordionGraph extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      kialiUrl: { type: String },
      hideInfoBox: { type: Boolean },
      namespaceList: { type: Array },
      graphType: { type: Array },
      selectedGraphTypeIndex: { type: Number },

      injectServiceNodes: { type: Boolean },
      groupBy: { type: String },
      appenders: { type: Array },

      namespaces: { type: String },
      selectGraphType: { type: String },

      requestType: { type: String },
      duration: { type: String },
      intervalTime: { type: Number },

      appCount: { type: Number },
      versionedAppCount: { type: Number },
      serviceCount: { type: Number },
      edgeCount: { type: Number },
      workloadCount: { type: Number },
    };
  }

  duration = `60s`;
  selectGraphType = `App`;
  injectServiceNodes = true;
  groupBy = `app`;
  appenders = [
    `deadNode`,
    `sidecarsCheck`,
    `serviceEntry`,
    `istio`,
    `unusedNode`,
    `securityPolicy`,
    `responseTime`,
  ];
  namespaces = ``;
  kialiUrl = `/kiali/namespaces`;
  hideInfoBox = false;
  namespaceList = [`istio-system`, `namespace 2`];
  graphType = [`App`, `Versioned App`, `Service`, `Workload`];
  selectedGraphTypeIndex = 0;
  requestType:
    | `No Edge Labels`
    | `Requests per Seconds`
    | `Requests percentage`
    | `Response Time`;
  intervalTime: number | null = 10000;

  appCount = 0;
  versionedAppCount = 0;
  serviceCount = 0;
  edgeCount = 0;
  workloadCount = 0;

  incomingRateGrpc: any = null;
  incomingRateHttp: any = null;
  outgoingRateGrpc: any = null;
  outgoingRateHttp: any = null;
  totalRateHttp: any = null;
  totalRateGrpc: any = null;
  rps: number[] = [];
  errorRps: number[] = [];

  requestTypeIndex = `1`;
  lastRequestIndex = `1`;
  intervalTimeIndex = `1`;

  private cy?: cytoscape.Core;
  private data: any = {};
  private healthDataApp: any = {};
  private healthDataWorkload: any = {};
  private healthDataService: any = {};
  private metricsData: any = {};
  private trafficRenderer?: TrafficRender;
  private intervalId: number;

  graphInfo!: AccordionGraphInfo | null;
  selectBoxs!: NodeListOf<Element> | null;
  optionModal!: AccordionOptionModal | null;

  disconnectedCallback(): void {
    this.cy?.destroy();
    this.cy = undefined;
    this.data = undefined;
    this.selectBoxs = undefined;
    this.optionModal = undefined;
    clearInterval(this.intervalId);
    super.disconnectedCallback();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.loadLocalStorage();
  }

  protected async firstUpdated(): Promise<void> {
    this.graphInfo = this.querySelector(`accordion-graph-info`);
    this.selectBoxs = this.querySelectorAll(`mwc-select`);
    this.optionModal = this.querySelector(`accordion-option-modal`);
  }

  protected updated(): void {
    this.initCytoscape();

    this.setCustomStyleMwcSelect();
  }

  saveLocalStorage(): void {
    if (!window.localStorage) {
      return;
    }

    localStorage.setItem(`namespace`, this.namespaces);
    localStorage.setItem(`graphType`, this.selectGraphType);

    localStorage.setItem(`trafficView`, this.requestTypeIndex);
    localStorage.setItem(`lastRequest`, this.lastRequestIndex);
    localStorage.setItem(`intervalTime`, this.intervalTimeIndex);
  }

  loadLocalStorage(): void {
    if (!window.localStorage) {
      return;
    }

    this.namespaces = localStorage.getItem(`namespace`) || this.namespaces;
    this.selectGraphType =
      localStorage.getItem(`graphType`) || this.selectGraphType;
    this.requestTypeIndex =
      localStorage.getItem(`trafficView`) || this.requestTypeIndex;
    this.lastRequestIndex =
      localStorage.getItem(`lastRequest`) || this.lastRequestIndex;
    this.intervalTimeIndex =
      localStorage.getItem(`intervalTime`) || this.intervalTimeIndex;
  }

  // ISSUE: https://github.com/cytoscape/cytoscape.js/issues/2081
  // don't use shadow dom
  createRenderRoot() {
    return this;
  }

  async initData(): Promise<void> {
    const graphTypeElement: AccordionSelect = this.querySelector(
      `.graph-type-filter`
    );
    const graphTypeValue = graphTypeElement.getValue();
    const graphType =
      graphTypeValue === `App`
        ? `app`
        : graphTypeValue === `Versioned App`
        ? `versionedApp`
        : graphTypeValue === `Service`
        ? `service`
        : graphTypeValue === `Workload`
        ? `workload`
        : `app`;

    // NOTE: Kiali Graph API Parameter
    // duration, graphType, injectServiceNodes, groupBy, appenders, namespaces
    const [
      data,
      healthDataApp,
      healthDataWorkload,
      healthDataService,
    ] = await Promise.all([
      fetch(
        this.kialiUrl +
          `/graph` +
          `?` +
          `duration=${this.duration}` +
          `&` +
          `graphType=${graphType}` +
          `&` +
          `injectServiceNodes=${this.injectServiceNodes}` +
          `&` +
          `groupBy=${this.groupBy}` +
          `&` +
          `appenders=${this.appenders.join(`,`)}` +
          `&` +
          `namespaces=${this.namespaces}`
      ),
      fetch(
        `${this.kialiUrl}/${this.namespaces}/health?type=app&rateInterval=${this.duration}`
      ),
      fetch(
        `${this.kialiUrl}/${this.namespaces}/health?type=workload&rateInterval=${this.duration}`
      ),
      fetch(
        `${this.kialiUrl}/${this.namespaces}/health?type=service&rateInterval=${this.duration}`
      ),
    ]);

    this.data = await data.json();
    this.healthDataApp = await healthDataApp.json();
    this.healthDataWorkload = await healthDataWorkload.json();
    this.healthDataService = await healthDataService.json();

    const metricsData = await fetch(
      `${this.kialiUrl}/${
        this.namespaces
      }/metrics?filters[]=request_count&filters[]=request_error_count&queryTime=${
        this.data.timestamp
      }&duration=${parseInt(
        this.duration
      )}&step=30&rateInterval=30s&direction=inbound&reporter=destination`
    );

    this.metricsData = await metricsData.json();

    const elements = this.data?.elements;
    const edges = elements?.edges;
    const nodes = elements?.nodes;

    this.addEdgeData(edges);
    this.addNodeData(nodes);
  }

  async initCytoscape(): Promise<void> {
    await this.initData();

    const elements = this.data?.elements;

    this.cy = cytoscape({
      container: this?.querySelector(`.graph`),
      elements: elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            ['shape' as any]: 'data(type)',
            content: 'data(nodeType)',
            'text-valign': 'center',
            color: 'white',
            'font-size': 8,
            'text-outline-width': 0.7,
            'text-transform': 'uppercase',
            'text-outline-color': '#666',
            'background-color': '#fff',
            'border-width': 1,
            'border-color': '#666',
            width: 30,
            height: 30,
            ['opacity' as any]: 'data(opacity)',
            ['border-style' as any]: 'data(borderStyle)',
          },
        },
        {
          selector: ':parent',
          style: {
            content: '',
            'background-color': 'rgba(255, 255, 255, 0.8)',
            'border-width': 1,
            'border-color': 'rgba(206, 205, 206, 0.5)',
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle-backcurve',
            'arrow-scale': 0.5,
            width: 1,
            color: 'white',
            'font-size': 8,
            'text-outline-width': 0.7,
            'text-transform': 'uppercase',
            'text-outline-color': '#666',
            'text-wrap': 'wrap',
            label: 'data(label)',
          },
        },
        {
          selector: ':selected',
          style: {
            'background-color': 'rgb(222, 243, 255)',
            'border-width': 1,
          },
        },
      ],
      layout: {
        name: 'dagre',
        fit: true,
        nodeDimensionsIncludeLabels: true,
        rankDir: 'LR',
      },
    });

    this.cy.autolock(true);

    this.hilightNode();
    this.hilightEdge();

    this.addMouseEventListeners();

    this.initNodeLabel();

    this.initTrafficRenderer();

    this.initGraphInfo();

    window.clearInterval(this?.intervalId);

    if (this.intervalTime) {
      this.intervalId = window.setInterval(
        () => this.reload(),
        this.intervalTime
      );
    }

    this.saveLocalStorage();
  }

  hilightNode(): void {
    let appCount = 0;
    let serviceCount = 0;
    let workloadCount = 0;

    this.cy.nodes().forEach(node => {
      const warnColor = `rgb(241, 171, 33)`;
      const errorColor = `rgb(201, 24, 12)`;

      if (node.isParent()) {
        appCount += 1;
      }

      if (node.data().nodeType.includes(`service`)) {
        serviceCount += 1;
      }

      if (node.data().nodeType.includes(`workload`)) {
        workloadCount += 1;
      }

      if (node.data().app && node.data().isUnused !== true) {
        if (this.healthDataApp[node.data().app]?.requests.errorRatio > 0.001) {
          node.style(`border-color`, warnColor);
        }

        if (
          this.healthDataWorkload[node.data().workload]?.requests.errorRatio >
          0.001
        ) {
          node.style(`border-color`, warnColor);
        }

        if (
          this.healthDataService[node.data().service]?.requests.errorRatio >
          0.001
        ) {
          node.style(`border-color`, warnColor);
        }

        if (this.healthDataApp[node.data().app]?.requests.errorRatio > 0.2) {
          node.style(`border-color`, errorColor);
        }

        if (
          this.healthDataWorkload[node.data().workload]?.requests.errorRatio >
          0.2
        ) {
          node.style(`border-color`, errorColor);
        }

        if (
          this.healthDataService[node.data().service]?.requests.errorRatio > 0.2
        ) {
          node.style(`border-color`, errorColor);
        }
      }
    });
    this.appCount = appCount;
    this.serviceCount = serviceCount;
    this.workloadCount = workloadCount;
  }

  hilightEdge(): void {
    let edgeCount = 0;

    this.cy.edges().forEach(edge => {
      const successColor = `rgb(61, 134, 73)`;
      const tcpColor = `rgb(0, 67, 103)`;
      const warnColor = `rgb(241, 171, 33)`;
      const errorColor = `rgb(201, 24, 12)`;

      edgeCount += 1;
      const hilightProtocol = (
        _edge: cytoscape.EdgeSingular | cytoscape.SingularElementReturnValue
      ): void => {
        if (_edge.data()?.traffic?.protocol === `tcp`) {
          _edge.style(`line-color`, tcpColor);
          _edge.style(`target-arrow-color`, tcpColor);
          return;
        }

        if (_edge.data()?.traffic?.rates?.httpPercentErr) {
          if (_edge.data()?.traffic?.rates?.httpPercentErr < 20) {
            _edge.style(`line-color`, warnColor);
            _edge.style(`target-arrow-color`, warnColor);
            return;
          }
          _edge.style(`line-color`, errorColor);
          _edge.style(`target-arrow-color`, errorColor);
          return;
        }

        _edge.style(`line-color`, successColor);
        _edge.style(`target-arrow-color`, successColor);
      };

      edge
        .connectedNodes()
        .predecessors()
        .each(each => {
          if (each.isEdge()) {
            hilightProtocol(each);
          }
        });
      hilightProtocol(edge);
    });
    this.edgeCount = edgeCount;
  }

  reset() {
    this.cy?.autolock(false);
    this.cy?.edges().each(edge => {
      edge.style(`line-color`, `rgb(156, 156, 156)`);
      edge.style(`target-arrow-color`, `rgb(156, 156, 156)`);
      delete edge.data().responseTime;
    });
    this.cy?.json({ elements: this.data.elements });
    this.cy
      ?.layout({
        name: 'dagre',
        fit: false,
        nodeDimensionsIncludeLabels: true,
        rankDir: 'LR',
      })
      .run();

    this.cy?.autolock(true);
    this.trafficRenderer.setEdges(this.cy.edges());
  }

  initNodeLabel(): void {
    this.cy.nodeHtmlLabel([
      {
        query: `node`,
        valign: `bottom`,
        halign: `center`,
        valignBox: `bottom`,
        halignBox: `center`,
        tpl: (data: any) => {
          return `<span class="child tippy-content">${
            data[data.nodeType] || data[`service`]
          }</span>`;
        },
      },
      {
        query: `:parent`,
        valign: `top`,
        halign: `center`,
        valignBox: `top`,
        halignBox: `center`,
        tpl: (data: any) => {
          return `<span class="parent tippy-content">${
            data[data.nodeType]
          }</span>`;
        },
      },
    ]);
  }

  initTrafficRenderer(): void {
    this.trafficRenderer = new TrafficRender(this.cy, this.cy.edges());

    this.trafficRenderer!.start();

    this.cy.on('destroy', (_event: cytoscape.EventObject) => {
      this.trafficRenderer!.stop();
      this.cy = undefined;
    });
  }

  addEdgeData(edges: any): void {
    edges?.forEach((edge: any) => {
      this.addLabel(edge);
    });
  }

  addNodeData(nodes: any): void {
    nodes?.forEach((node: any) => {
      this.addNodeType(node);
      this.addOpacity(node);
    });
  }

  addLabel(node: any): void {
    const protocol = node.data?.traffic?.protocol;
    const rates = node.data?.traffic?.rates?.[protocol]
      ? node.data?.traffic?.rates?.[protocol]
      : ``;
    const percentage = node.data?.traffic?.rates?.[protocol]
      ? node.data?.traffic?.rates?.[protocol + `PercentReq`]
      : ``;
    const time = node.data?.responseTime ? node.data?.responseTime + `ms` : ``;

    if (this.requestType === `No Edge Labels`) {
      node.data.label = ``;
    } else if (this.requestType === `Requests per Seconds`) {
      node.data.label = rates;
    } else if (this.requestType === `Requests percentage`) {
      node.data.label = percentage + `%`;
    } else {
      node.data.label = time;
    }

    if (node.data.traffic?.rates?.httpPercentErr) {
      node.data.label += `\n ${node.data.traffic?.rates?.httpPercentErr}%`;
    }
  }

  addNodeType(node: any): void {
    switch (node.data.nodeType) {
      case `app`:
        node.data.type = `round-rectangle`;
        break;
      case `service`:
        node.data.type = `round-triangle`;
        if (node.data?.isServiceEntry) {
          node.data.nodeType = `service entry`;
          node.data.type = `round-tag`;
        }
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
  }

  addOpacity(node: any): void {
    if (node.data.isUnused) {
      node.data.opacity = 0.5;
      node.data.borderStyle = `dashed`;
      return;
    }
    node.data.opacity = 1;
    node.data.borderStyle = `solid`;
  }

  addMouseEventListeners(): void {
    this.cy.on('mouseover', 'node,edge', event => {
      const blurColor = `#dfe4ea`;

      this.setBlurStyle(this.cy, {
        'background-color': blurColor,
        'line-color': blurColor,
        'source-arrow-color': blurColor,
        color: blurColor,
      });

      this.setFocus(event.target);
    });

    this.cy.on('mouseout', 'node,edge', () => {
      this.setResetFocus();
    });

    this.cy.on(`cxttap`, `node`, node => {
      const tippy = this.makeContextMenu(node.target);
      tippy.show();
    });

    this.cy.on(`tap`, `node`, node => {
      const unselectAllNodes = (): void => {
        this.cy.$(':selected').selectify().unselect().unselectify();
      };

      const selectNode = (target: any): void => {
        target.selectify().select().unselectify();
      };

      const nodeType =
        node.target.data()?.nodeType === undefined
          ? ``
          : node.target.data().nodeType === `service entry`
          ? `SERVICE_ENTRY`
          : (node.target.data().nodeType as string).toLocaleUpperCase();

      const setTrafficInfo = function (
        root: AccordionGraph,
        target: any,
        graphInfo: AccordionGraphInfo
      ) {
        const getProtocol = (protocol: string): any =>
          target.data().traffic.find((each: any) => each.protocol === protocol);
        const isProtocol = (protocol: string): boolean =>
          Boolean(getProtocol(protocol));
        const isNodeType = (type: string): boolean =>
          Boolean(target.data().nodeType === type);

        return {
          isTraffic() {
            graphInfo.data = {};

            return target.data().traffic ? this : null;
          },
          setHttp() {
            if (isProtocol(`http`)) {
              const http = getProtocol(`http`);
              const outgoing = getAccumulatedTrafficRateHttp(
                target.edgesTo('*')
              );
              const httpIn3xx = http.rates.httpIn3xx || 0;
              const httpIn4xx = http.rates.httpIn4xx || 0;
              const httpIn5xx = http.rates.httpIn5xx || 0;
              const httpIn2xx =
                http.rates.httpIn - httpIn3xx - httpIn4xx - httpIn5xx || 0;
              const timestamp = ~~(new Date().getTime() / 1000);

              graphInfo.data.httpInTotal = http.rates.httpIn || 0;
              graphInfo.data.httpInSuccess =
                ((http.rates.httpIn - httpIn4xx - httpIn5xx) /
                  http.rates.httpIn) *
                  100 || 0;
              graphInfo.data.httpInError =
                ((httpIn4xx + httpIn5xx) / http.rates.httpIn) * 100 || 0;

              graphInfo.data.httpOutTotal = http.rates.httpOut || 0;
              graphInfo.data.httpOutSuccess =
                ((outgoing.rate - outgoing.rate4xx - outgoing.rate5xx) /
                  outgoing.rate) *
                  100 || 0;
              graphInfo.data.httpOutError =
                ((outgoing.rate4xx + outgoing.rate5xx) / outgoing.rate) * 100 ||
                0;

              graphInfo.data.httpIn2xx = httpIn2xx;
              graphInfo.data.httpIn3xx = httpIn3xx;
              graphInfo.data.httpIn4xx = httpIn4xx;
              graphInfo.data.httpIn5xx = httpIn5xx;

              graphInfo.data.httpOut2xx =
                outgoing.rate -
                outgoing.rate3xx -
                outgoing.rate4xx -
                outgoing.rate5xx;
              graphInfo.data.httpOut3xx = outgoing.rate3xx;
              graphInfo.data.httpOut4xx = outgoing.rate4xx;
              graphInfo.data.httpOut5xx = outgoing.rate5xx;

              if (isNodeType(`service entry`)) {
                return this;
              }

              Promise.all([
                // Outbound
                fetch(
                  `${root.kialiUrl}/${target.data().namespace}${
                    target.data().isRoot ? `` : `/${target.data().nodeType}s`
                  }/${
                    target.data().nodeType === `workload`
                      ? `${target.data().workload}`
                      : target.data().app
                  }/metrics?queryTime=${timestamp}&duration=${parseInt(
                    root.duration
                  )}&step=30&rateInterval=30s&filters[]=request_count&filters[]=request_error_count&filters[]=tcp_sent&filters[]=tcp_received&byLabels[]=request_protocol&direction=outbound&reporter=source`
                )
                  .then(res => res.json())
                  .then(json => {
                    graphInfo.data.httpOutRps =
                      json.metrics.request_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `http`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                    graphInfo.data.httpOutErrorRps =
                      json.metrics.request_error_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `http`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                  }),
                // Inbound
                fetch(
                  `${root.kialiUrl}/${target.data().namespace}${
                    target.data().isRoot ? `` : `/${target.data().nodeType}s`
                  }/${
                    target.data().nodeType === `workload`
                      ? `${target.data().workload}`
                      : target.data().app
                  }/metrics?queryTime=${timestamp}&duration=${parseInt(
                    root.duration
                  )}&step=30&rateInterval=30s&filters[]=request_count&filters[]=request_error_count&byLabels[]=request_protocol&direction=inbound&reporter=destination`
                )
                  .then(res => res.json())
                  .then(json => {
                    const isRoot = target.data().isRoot;
                    if (isRoot) {
                      graphInfo.data.httpOutRps = [];
                      graphInfo.data.httpOutErrorRps = [];
                      return;
                    }
                    graphInfo.data.httpInRps =
                      json.metrics.request_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `http`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                    graphInfo.data.httpInErrorRps =
                      json.metrics.request_error_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `http`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                  }),
              ]).then(() => {
                console.log(graphInfo.data);
                graphInfo.requestUpdate();
              });
            }

            return this;
          },
          setGrpc() {
            if (isProtocol(`grpc`)) {
              const grpc = getProtocol(`grpc`);
              const outgoing = getAccumulatedTrafficRateGrpc(
                target.edgesTo('*')
              );
              const grpcInErr = grpc.rates.grpcInErr || 0;
              const grpcInSuccess = grpc.rates.grpcIn - grpcInErr || 0;
              const timestamp = ~~(new Date().getTime() / 1000);

              graphInfo.data.grpcInTotal = grpc.rates.grpcIn || 0;
              graphInfo.data.grpcInSuccess =
                (grpcInSuccess / grpc.rates.grpcIn) * 100 || 0;
              graphInfo.data.grpcInError =
                (grpcInErr / grpc.rates.grpcIn) * 100 || 0;

              graphInfo.data.grpcOutTotal = grpc.rates.grpcOut || 0;
              graphInfo.data.grpcOutSuccess =
                ((outgoing.rate - outgoing.rateErr) / outgoing.rate) * 100 || 0;
              graphInfo.data.grpcOutError =
                (outgoing.rateErr / outgoing.rate) * 100 || 0;

              if (isNodeType(`service entry`)) {
                return this;
              }

              Promise.all([
                // Outbound
                fetch(
                  `${root.kialiUrl}/${target.data().namespace}${
                    target.data().isRoot
                      ? ``
                      : `/${target.data().nodeType}s/` + target.data().app
                  }/metrics?queryTime=${timestamp}&duration=${parseInt(
                    root.duration
                  )}&step=30&rateInterval=30s&filters[]=request_count&filters[]=request_error_count&filters[]=tcp_sent&filters[]=tcp_received&byLabels[]=request_protocol&direction=outbound&reporter=source`
                )
                  .then(res => res.json())
                  .then(json => {
                    graphInfo.data.grpcOutRps =
                      json.metrics.request_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `grpc`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                    graphInfo.data.grpcOutErrorRps =
                      json.metrics.request_error_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `grpc`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                  }),
                // Inbound
                fetch(
                  `${root.kialiUrl}/${target.data().namespace}${
                    target.data().isRoot
                      ? ``
                      : `/${target.data().nodeType}s/` + target.data().app
                  }/metrics?queryTime=${timestamp}&duration=${parseInt(
                    root.duration
                  )}&step=30&rateInterval=30s&filters[]=request_count&filters[]=request_error_count&byLabels[]=request_protocol&direction=inbound&reporter=destination`
                )
                  .then(res => res.json())
                  .then(json => {
                    const isRoot = target.data().isRoot;
                    if (isRoot) {
                      graphInfo.data.grpcOutRps = [];
                      graphInfo.data.grpcOutErrorRps = [];
                      return;
                    }
                    graphInfo.data.grpcInRps =
                      json.metrics.request_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `grpc`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                    graphInfo.data.grpcInErrorRps =
                      json.metrics.request_error_count.matrix
                        .find(
                          (each: any) => each.metric.request_protocol == `grpc`
                        )
                        ?.values?.map((each: any) => {
                          each[0] *= 1000;
                          return each;
                        }) || [];
                  }),
              ]).then(() => {
                console.log(graphInfo.data);
                graphInfo.requestUpdate();
              });
            }

            return this;
          },
          setServiceEntry() {
            const isServiceEntry = target.data().nodeType === `service entry`;
            if (!isServiceEntry) {
              return this;
            }

            graphInfo.data.serviceName = target.data().service;
            graphInfo.data.destination = target
              .data()
              .destServices.map((each: any) => each.name);

            return this;
          },
        };
      };

      unselectAllNodes();

      node.target.removeStyle(`background-color`);
      selectNode(node.target);

      this.graphInfo.tab = nodeType;

      console.log(node.target.isParent(), node.target);
      setTrafficInfo(this, node.target, this.graphInfo)
        .isTraffic()
        ?.setHttp()
        ?.setGrpc()
        ?.setServiceEntry();
    });

    this.cy.on(`tap`, event => {
      const { target } = event;
      const unselectAllNodes = (): void => {
        this.cy.$(':selected').selectify().unselect().unselectify();
      };

      if (target !== this.cy) {
        return;
      }

      unselectAllNodes();
      this.graphInfo.tab = ``;
    });
  }

  makeContextMenu(node: cytoscape.NodeSingular) {
    const ref = node.popperRef();
    const dummyDomEle = document.createElement('div');

    const tip = tippy(dummyDomEle, {
      onCreate: instance => {
        instance.popperInstance.reference = ref;
      },
      lazy: false,
      trigger: 'manual',

      content: () => {
        const contextMenu: AccordionGraphContextMenu = document.createElement(
          'accordion-graph-context-menu'
        ) as AccordionGraphContextMenu;

        contextMenu.name = node.data().app;

        return contextMenu;
      },
      plugins: [sticky],
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
          },
        },
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
      (selectBox?.shadowRoot?.querySelector(
        `.mdc-select__anchor`
      ) as HTMLElement).style.height = `30px`;
    });
  }

  setBlurStyle(cy: cytoscape.Core, style: any) {
    cy.nodes().forEach(target => {
      target.style(style);
    });

    cy.edges().forEach(target => {
      target.addClass(`mousedim`);
      this.setOpacityElement(target, 0.5);
    });
  }

  showTraffic(target: any): void {
    const protocol = target.data().traffic.protocol;
    const rates = target.data().traffic.rates?.[protocol]
      ? `\n(${target.data().traffic.rates?.[protocol]})`
      : ``;
    const percentage = target.data().traffic.rates?.[protocol + `PercentReq`]
      ? `\n(${target.data().traffic.rates?.[protocol + `PercentReq`]})%`
      : ``;
    const time = target.data()?.responseTime
      ? target.data()?.responseTime + `ms`
      : ``;

    if (this.requestType === `No Edge Labels`) {
      target.style(`label`, protocol);
    } else if (this.requestType === `Requests per Seconds`) {
      target.style(`label`, protocol + rates);
    } else if (this.requestType === `Requests percentage`) {
      target.style(`label`, protocol + percentage);
    } else {
      target.style(`label`, protocol + `\n` + time);
    }

    if (target.data()?.traffic?.rates?.httpPercentErr) {
      target.style(
        `label`,
        target.style(`label`) +
          `\n ${target.data()?.traffic?.rates?.httpPercentErr}%`
      );
    }

    target.style(`opacity`, 1);
    target.removeClass(`mousedim`);
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
          this.showTraffic(target3);
        });

        target2.neighborhood().each((target3: any) => {
          target3.style('color', nodeColor);
          target3.style('background-color', successorColor);
        });
      });
    }

    if (target.isEdge()) {
      this.showTraffic(target);
    }

    target.connectedNodes().each((event: any) => {
      event.style('color', nodeColor);
      event.style('background-color', successorColor);
    });

    target.connectedEdges().each((target2: any) => {
      this.showTraffic(target2);
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
    this.cy.nodes().forEach(target => {
      target.removeStyle('background-color');
      target.removeStyle('color');
      target.removeStyle('opacity');
    });
    this.cy.edges().forEach(target => {
      target.removeStyle('opacity');
      if (!target.hasClass(`mousedim`)) {
        target.style(`label`, ``);
      }
      target.removeClass(`mousedim`);
    });
  }

  changeIntervalTime(event: CustomEvent): void {
    this.intervalTimeIndex = event.detail.index;

    switch (event.detail.selected) {
      case `Pause`:
        this.intervalTime = null;
        break;
      case `Every 10s`:
        this.intervalTime = 10 * 1000;
        break;
      case `Every 15s`:
        this.intervalTime = 15 * 1000;
        break;
      case `Every 1m`:
        this.intervalTime = 60 * 1000;
        break;
      case `Every 5m`:
        this.intervalTime = 5 * 60 * 1000;
        break;
      case `Every 15m`:
        this.intervalTime = 15 * 60 * 1000;
        break;
      default:
        this.intervalTime = null;
    }
  }

  onChangeNamespace(event: CustomEvent): void {
    if (!event.detail.selected) {
      return;
    }
    this.namespaces = event.detail.selected;
  }

  onChangeLastRequest(event: CustomEvent): void {
    this.lastRequestIndex = event.detail.index;

    switch (event.detail.selected) {
      case `Last 1m`:
        this.duration = 1 * 60 + `s`;
        break;
      case `Last 5m`:
        this.duration = 5 * 60 + `s`;
        break;
      case `Last 10m`:
        this.duration = 10 * 60 + `s`;
        break;
      case `Last 30m`:
        this.duration = 30 * 60 + `s`;
        break;
      case `Last 1h`:
        this.duration = 60 * 60 + `s`;
        break;
      case `Last 3h`:
        this.duration = 3 * 60 * 60 + `s`;
        break;
      default:
        this.duration = 6 * 60 * 60 + `s`;
    }
  }

  async reload(): Promise<void> {
    await this.initData();
    this.reset();
    this.hilightEdge();
    this.hilightNode();
    this.initGraphInfo();
  }

  onClickReload(): void {
    this.reload();
    this.cy.fit();
  }

  initGraphInfo(): void {
    const nonServiceEdges = this.cy
      ?.$(`node[nodeType != "${NodeType.SERVICE}"][!isGroup]`)
      .edgesTo('*');
    const incomingEdges = this.cy?.$(`node[?isRoot]`).edgesTo('*');
    const outgoingEdges = this.cy
      ?.nodes()
      .leaves(`node[nodeType = "service entry"]`)
      .connectedEdges();

    this.incomingRateGrpc = getAccumulatedTrafficRateGrpc(incomingEdges);
    this.incomingRateHttp = getAccumulatedTrafficRateHttp(incomingEdges);

    this.outgoingRateGrpc = getAccumulatedTrafficRateGrpc(outgoingEdges);
    this.outgoingRateHttp = getAccumulatedTrafficRateHttp(outgoingEdges);

    this.totalRateHttp = getAccumulatedTrafficRateHttp(nonServiceEdges);
    this.totalRateGrpc = getAccumulatedTrafficRateGrpc(nonServiceEdges);

    this.rps = this.metricsData.metrics?.request_count?.matrix[0]?.values?.map(
      (each: any) => {
        each[0] *= 1000;
        return each;
      }
    );
    this.errorRps = this.metricsData.metrics?.request_error_count?.matrix[0]?.values?.map(
      (each: any) => {
        each[0] *= 1000;
        return each;
      }
    );

    this.graphInfo.http = this.totalRateHttp?.rate || 0;
    this.graphInfo.http2xx =
      this.totalRateHttp?.rate -
        this.totalRateHttp?.rate3xx -
        this.totalRateHttp?.rate4xx -
        this.totalRateHttp?.rate5xx || 0;
    this.graphInfo.http3xx = this.totalRateHttp?.rate3xx || 0;
    this.graphInfo.http4xx = this.totalRateHttp?.rate4xx || 0;
    this.graphInfo.http5xx = this.totalRateHttp?.rate5xx || 0;
    this.graphInfo.incomingHttp = this.incomingRateHttp;
    this.graphInfo.outgoingHttp = this.outgoingRateHttp;
    this.graphInfo.grpc = this.totalRateGrpc?.rate;
    this.graphInfo.grpcError = this.totalRateGrpc?.rateErr;
    this.graphInfo.incomingGrpc = this.incomingRateGrpc;
    this.graphInfo.outgoingGrpc = this.outgoingRateGrpc;
    this.graphInfo.rps = this.rps || [];
    this.graphInfo.errorRps = this.errorRps || [];
  }

  render() {
    return html`
      <div class="graph-wrap ${this.styles()}">
        <div class="toolbar">
          <accordion-select
            class="namespace-filter"
            title="namespace"
            .data="${this.namespaceList}"
            selectedIndex="${this.namespaces
              ? this.namespaceList.findIndex(each => each === this.namespaces)
              : 1}"
            @change-event=${this.onChangeNamespace}
          ></accordion-select>

          <accordion-select
            class="graph-type-filter"
            title="Graph Type"
            .data="${this.graphType}"
            selectedIndex="${this.graphType.findIndex(
              each => each === this.selectGraphType
            )}"
            @change-event=${(event: CustomEvent) =>
              (this.selectGraphType =
                event.detail.selected || this.selectGraphType)}
          ></accordion-select>

          <!-- NOTE: Find / Hide Search Input -->
          <!-- <div class="find-or-hide">
          <input class="search--find" type="search" placeholder="Find"/>
          <input class="search--hide" type="search" placeholder="Hide"/>
        </div> -->

          <button
            class="option-button"
            @click=${() =>
              (this.optionModal.show = !this.optionModal.show || true)}
          >
            ${IconOption}
          </button>

          <button class="refresh-button" @click=${this.onClickReload}>
            ${IconRefresh}
          </button>
        </div>
        <div class="graph-or-info">
          <div class="graph"></div>

          <div class="info ${this.hideInfoBox ? `hide` : ``}">
            <accordion-graph-info
              .appCount="${this.appCount}"
              .serviceCount="${this.serviceCount}"
              .workloadCount="${this.workloadCount}"
              .edgeCount="${this.edgeCount}"
              .versionedAppCount="${this.versionedAppCount}"
              .http="${this.totalRateHttp?.rate || 0}"
              .http2xx="${this.totalRateHttp?.rate -
                this.totalRateHttp?.rate3xx -
                this.totalRateHttp?.rate4xx -
                this.totalRateHttp?.rate5xx || 0}"
              .http3xx="${this.totalRateHttp?.rate3xx || 0}"
              .http4xx="${this.totalRateHttp?.rate4xx || 0}"
              .http5xx="${this.totalRateHttp?.rate5xx || 0}"
              .incomingHttp="${this.incomingRateHttp}"
              .outgoingHttp="${this.outgoingRateHttp}"
              .grpc="${this.totalRateGrpc?.rate}"
              .grpcError="${this.totalRateGrpc?.rateErr}"
              .incomingGrpc="${this.incomingRateGrpc}"
              .outgoingGrpc="${this.outgoingRateGrpc}"
              .rps="${this.rps || []}"
              .errorRps="${this.errorRps || []}"
            ></accordion-graph-info>
          </div>
        </div>
        <accordion-option-modal>
          <!-- NOTE: 1. Edge Label, selectBox -->
          <accordion-select
            title="Traffic View"
            .data="${[
              `No Edge Labels`,
              `Requests per Seconds`,
              `Requests percentage`,
              `Response Time`,
            ]}"
            selectedIndex="${this.requestTypeIndex}"
            @change-event=${(event: CustomEvent) => {
              this.requestTypeIndex = event.detail.index;
              this.requestType = event.detail.selected;
            }}
          ></accordion-select>
          <!-- NOTE: 3. Last, selectBox -->
          <accordion-select
            title="Last Request"
            .data="${[
              `Last 1m`,
              `Last 5m`,
              `Last 10m`,
              `Last 30m`,
              `Last 1h`,
              `Last 3h`,
              `Last 6h`,
            ]}"
            selectedIndex="${this.lastRequestIndex}"
            @change-event=${this.onChangeLastRequest}
          ></accordion-select>
          <!-- NOTE: 4. Every, selectBox -->
          <accordion-select
            title="Interval Time"
            .data="${[
              `Pause`,
              `Every 10s`,
              `Every 15s`,
              `Every 30s`,
              `Every 1m`,
              `Every 5m`,
              `Every 15m`,
            ]}"
            selectedIndex="${this.intervalTimeIndex}"
            @change-event=${this.changeIntervalTime}
          ></accordion-select>

          <!-- <div class="display-content content is-small">
          <h1 class="option-display">Display</h1>
          <accordion-multi-check-box 
            title="Display Option - Multi Select"
            .data="${[
            `Compress Hidden`,
            `Node Names`,
            `Service Nodes`,
            `Traffic Animation`,
            `Unused Nodes`,
          ]}"
          ></accordion-multi-check-box>
        </div> -->
        </accordion-option-modal>
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
        max-height: calc(100% - 70px);

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

      .parent.tippy-content {
        border-radius: 3px;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2),
          0 2px 8px 0 rgba(0, 0, 0, 0.19);
        display: flex;
        background-color: #393f44;
        color: #fff;
        font-size: 10px;
        padding: 3px 5px;
        border-radius: 3px;
        border-width: 1px;
        transform: scale(0.8);
        user-select: none;
      }

      .child.tippy-content {
        align-items: center;
        background-color: #fff;
        color: #030303;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2),
          0 2px 8px 0 rgba(0, 0, 0, 0.19);
        border-radius: 3px;
        border-width: 1px;
        display: flex;
        font-size: 10px;
        padding: 3px 5px;
        transform: scale(0.8);
        user-select: none;
      }

      mwc-button {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .option-display {
        font-size: 14px;
        color: rgb(51, 51, 51);
        margin-top: 10px;
        margin-bottom: 10px;
        height: 30px;
        box-sizing: border-box;
        border-bottom: 1px solid rgb(224, 224, 224);
        font-weight: normal;
      }

      accordion-multi-check-box {
        --acc-width: 380px;
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
