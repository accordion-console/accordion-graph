import {
  html,
  TemplateResult,
  customElement,
  LitElement,
  PropertyDeclarations,
  CSSResult,
  css,
} from 'lit-element';
import bulmaCss from 'bulma/css/bulma.css'; // required lit-scss-loader
import apexChartCss from './apexcharts.css';
import './bar-chart';
import './double-bar-chart';
import './area-chart';

@customElement('accordion-graph-info')
export class AccordionGraphInfo extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      tab: { type: String, reflect: true },

      show: { type: Boolean, reflect: true },
      appCount: { type: Number },
      versionedAppCount: { type: Number },
      serviceCount: { type: Number },
      edgeCount: { type: Number },
      workloadCount: { type: Number },

      contentIndex: { type: Number },

      http: { type: Number },
      http2xx: { type: Number },
      http3xx: { type: Number },
      http4xx: { type: Number },
      http5xx: { type: Number },
      incomingHttp: { type: Object },
      outgoingHttp: { type: Object },

      grpc: { type: Number },
      grpcError: { type: Number },
      incomingGrpc: { type: Object },
      outgoingGrpc: { type: Object },

      rps: { type: Array },
      errorRps: { type: Array },

      data: { type: Object },
    };
  }

  tab: `APP` | `SERVICE` | `WORKLOAD` | `UNKNOWN` | `SERVICE_ENTRY` | string;

  show: boolean;
  appCount: number;
  versionedAppCount: number;
  serviceCount: number;
  edgeCount: number;
  workloadCount: number;

  contentIndex: number;

  http: number;
  http2xx: number;
  http3xx: number;
  http4xx: number;
  http5xx: number;
  incomingHttp: any;
  outgoingHttp: any;

  grpc: number;
  grpcError: number;
  incomingGrpc: any;
  outgoingGrpc: any;

  rps: number[];
  errorRps: number[];

  data: any;

  constructor() {
    super();

    this.tab = ``;

    this.show = false;
    this.appCount = 0;
    this.versionedAppCount = 0;
    this.serviceCount = 0;
    this.edgeCount = 0;
    this.workloadCount = 0;

    this.contentIndex = 0;

    this.http = 0;
    this.http2xx = 0;
    this.http3xx = 0;
    this.http4xx = 0;
    this.http5xx = 0;
    this.incomingHttp = {};
    this.outgoingHttp = {};

    this.grpc = 0;
    this.grpcError = 0;
    this.incomingGrpc = {};
    this.outgoingGrpc = {};

    this.rps = [];
    this.errorRps = [];

    this.data = {};
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  hide(): void {
    this.show = false;
  }

  protected render(): TemplateResult {
    if (this.tab === `APP` || this.tab === `WORKLOAD`) {
      return this.appAndWorkloadInfoTemplate();
    }

    if (this.tab === `SERVICE`) {
      return this.serviceTemplate();
    }

    if (this.tab === `SERVICE_ENTRY`) {
      return this.serviceEntryTemplate();
    }

    return html`
    <div class="scroll">
      <div class="card info-card">
        <h1 class="graph-title">Graph Info</h1>

        <table class="table">
          <thead>
            <tr>
              <th><abbr>App</abbr></th>
              <th><abbr>Service</abbr></th>
              <th><abbr>Workload</abbr></th>
              <th><abbr>Edge</abbr></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${this.appCount}</th>
              <td>${this.serviceCount}</th>
              <td>${this.workloadCount}</th>
              <td>${this.edgeCount}</th>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card traffic-card">
        <div class="tabs is-centered accordion-tabs">
          <ul>
            <li 
              class="${this.contentIndex === 0 ? `is-active` : ``}"
              @click=${() => (this.contentIndex = 0)}
            ><a>Total</a></li>
            <li
              class="${this.contentIndex === 1 ? `is-active` : ``}"
              @click=${() => (this.contentIndex = 1)}
            ><a>Incoming</a></li>
            <li
              class="${this.contentIndex === 2 ? `is-active` : ``}"
              @click=${() => (this.contentIndex = 2)}
            ><a>Outgoing</a></li>
          </ul>
        </div>
        ${this.contentTemplate(this.contentIndex)}
      </div>
    </div>
    `;
  }

  appAndWorkloadInfoTemplate(): TemplateResult {
    return html`
    <div class="scroll">
      <h1 class="graph-title">APP Info</h1>

      <div class="card info-card ${
        this.data.httpInTotal || this.data.httpOutTotal ? `` : `hide`
      }">
        <div class="content is-small">
          <h2 class="graph-title">HTTP Traffic</h2>

          <table class="table">
            <thead>
              <tr>
                <th><abbr></abbr></th>
                <th><abbr>Total</abbr></th>
                <th><abbr>Success(%)</abbr></th>
                <th><abbr>Error(%)</abbr></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In</th>
                <td>${this.data.httpInTotal}</th>
                <td>${this.data.httpInSuccess?.toFixed(2)}%</th>
                <td>${this.data.httpInError?.toFixed(2)}%</th>
              </tr>
              <tr>
                <td>Out</th>
                <td>${this.data.httpOutTotal}</th>
                <td>${this.data.httpOutSuccess?.toFixed(2)}%</th>
                <td>${this.data.httpOutError?.toFixed(2)}%</th>
              </tr>
            </tbody>
          </table>

          <accordion-double-bar-chart
            type="HTTP"
            .data="${[
              [this.data.httpIn2xx, this.data.httpOut2xx],
              [this.data.httpIn3xx, this.data.httpOut3xx],
              [this.data.httpIn4xx, this.data.httpOut4xx],
              [this.data.httpIn5xx, this.data.httpOut5xx],
            ]}"
          ></accordion-double-bar-chart>        
        </div>

        <div class="content is-small">
          <h2 class="graph-title">HTTP Inbound Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.httpInRps,
              },
              {
                name: `Error`,
                data: this.data.httpInErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>

        <div class="content is-small">
          <h2 class="graph-title">HTTP Outbound Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.httpOutRps,
              },
              {
                name: `Error`,
                data: this.data.httpOutErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>
      </div>  

      <div class="card info-card ${
        this.data.grpcInTotal || this.data.grpcOutTotal ? `` : `hide`
      }">        
        <div class="content is-small">
          <h2 class="graph-title">GRPC Traffic</h2>

          <table class="table">
            <thead>
              <tr>
                <th><abbr></abbr></th>
                <th><abbr>Total</abbr></th>
                <th><abbr>Success(%)</abbr></th>
                <th><abbr>Error(%)</abbr></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In</th>
                <td>${this.data.grpcInTotal}</th>
                <td>${this.data.grpcInSuccess?.toFixed(2)}%</th>
                <td>${this.data.grpcInError?.toFixed(2)}%</th>
              </tr>
              <tr>
                <td>Out</th>
                <td>${this.data.grpcOutTotal}</th>
                <td>${this.data.grpcOutSuccess?.toFixed(2)}%</th>
                <td>${this.data.grpcOutError?.toFixed(2)}%</th>
              </tr>
            </tbody>
          </table>

          <accordion-double-bar-chart
            type="GRPC"
            .data="${[
              [this.data.grpcInSuccess, this.data.grpcOutSuccess],
              [this.data.grpcInError, this.data.grpcOutError],
            ]}"
          ></accordion-double-bar-chart>        
        </div>

        <div class="content is-small">
          <h2 class="graph-title">GRPC Inbound Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.grpcInRps,
              },
              {
                name: `Error`,
                data: this.data.grpcInErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>

        <div class="content is-small">
          <h2 class="graph-title">GRPC Outbound Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.grpcOutRps,
              },
              {
                name: `Error`,
                data: this.data.grpcOutErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>
      </div>      

      ${
        !this.data.httpInTotal &&
        !this.data.httpOutTotal &&
        !this.data.grpcInTotal &&
        !this.data.grpcOutTotal
          ? html`
              <div class="content is-small">
                No Traffic Info
              </div>
            `
          : html``
      }
    </div>
    `;
  }

  serviceTemplate(): TemplateResult {
    return html`
    <div class="scroll">
      <h1 class="graph-title">Service Info</h1>

      <div class="card info-card ${
        this.data.httpInTotal || this.data.httpOutTotal ? `` : `hide`
      }">
        <div class="content is-small">
          <h2 class="graph-title">HTTP Traffic</h2>

          <table class="table">
            <thead>
              <tr>
                <th><abbr></abbr></th>
                <th><abbr>Total</abbr></th>
                <th><abbr>Success(%)</abbr></th>
                <th><abbr>Error(%)</abbr></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In</th>
                <td>${this.data.httpInTotal}</th>
                <td>${this.data.httpInSuccess?.toFixed(2)}%</th>
                <td>${this.data.httpInError?.toFixed(2)}%</th>
              </tr>
              <tr>
                <td>Out</th>
                <td>${this.data.httpOutTotal}</th>
                <td>${this.data.httpOutSuccess?.toFixed(2)}%</th>
                <td>${this.data.httpOutError?.toFixed(2)}%</th>
              </tr>
            </tbody>
          </table>

          <accordion-double-bar-chart
            type="HTTP"
            .data="${[
              [this.data.httpIn2xx, this.data.httpOut2xx],
              [this.data.httpIn3xx, this.data.httpOut3xx],
              [this.data.httpIn4xx, this.data.httpOut4xx],
              [this.data.httpIn5xx, this.data.httpOut5xx],
            ]}"
          ></accordion-double-bar-chart>        
        </div>

        <div class="content is-small">
          <h2 class="graph-title">HTTP Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.httpInRps,
              },
              {
                name: `Error`,
                data: this.data.httpInErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>        
      </div>  

      <div class="card info-card ${
        this.data.grpcInTotal || this.data.grpcOutTotal ? `` : `hide`
      }">        
        <div class="content is-small">
          <h2 class="graph-title">GRPC Traffic</h2>

          <table class="table">
            <thead>
              <tr>
                <th><abbr></abbr></th>
                <th><abbr>Total</abbr></th>
                <th><abbr>Success(%)</abbr></th>
                <th><abbr>Error(%)</abbr></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In</th>
                <td>${this.data.grpcInTotal}</th>
                <td>${this.data.grpcInSuccess?.toFixed(2)}%</th>
                <td>${this.data.grpcInError?.toFixed(2)}%</th>
              </tr>
              <tr>
                <td>Out</th>
                <td>${this.data.grpcOutTotal}</th>
                <td>${this.data.grpcOutSuccess?.toFixed(2)}%</th>
                <td>${this.data.grpcOutError?.toFixed(2)}%</th>
              </tr>
            </tbody>
          </table>

          <accordion-double-bar-chart
            type="GRPC"
            .data="${[
              [this.data.grpcInSuccess, this.data.grpcOutSuccess],
              [this.data.grpcInError, this.data.grpcOutError],
            ]}"
          ></accordion-double-bar-chart>        
        </div>

        <div class="content is-small">
          <h2 class="graph-title">GRPC Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.grpcInRps,
              },
              {
                name: `Error`,
                data: this.data.grpcInErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>        
      </div>      
          
      ${
        !this.data.httpInTotal &&
        !this.data.httpOutTotal &&
        !this.data.grpcInTotal &&
        !this.data.grpcOutTotal
          ? html`
              <div class="content is-small">
                No Traffic Info
              </div>
            `
          : html``
      }  
    </div>
    `;
  }

  serviceEntryTemplate(): TemplateResult {
    return html`
    <div class="scroll">
      <h1 class="graph-title">Service Entry Info</h1>
      <div class="card info-card">
        <div class="content is-small">
            <h2 class="graph-title">External Service Entry</h2>
            <p>${this.data.serviceName}</p>

            <h2 class="graph-title">Destination</h2>
            ${this.data.destination.map(
              (name: string) => html` <p>${name}</p> `
            )}
        </div>
      </div>
      
      <div class="card info-card ${
        this.data.httpInTotal || this.data.httpOutTotal ? `` : `hide`
      }">
        <div class="content is-small">
          <h2 class="graph-title">HTTP Traffic</h2>

          <table class="table">
            <thead>
              <tr>
                <th><abbr></abbr></th>
                <th><abbr>Total</abbr></th>
                <th><abbr>Success(%)</abbr></th>
                <th><abbr>Error(%)</abbr></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In</th>
                <td>${this.data.httpInTotal}</th>
                <td>${this.data.httpInSuccess?.toFixed(2)}%</th>
                <td>${this.data.httpInError?.toFixed(2)}%</th>
              </tr>
              <tr>
                <td>Out</th>
                <td>${this.data.httpOutTotal}</th>
                <td>${this.data.httpOutSuccess?.toFixed(2)}%</th>
                <td>${this.data.httpOutError?.toFixed(2)}%</th>
              </tr>
            </tbody>
          </table>

          <accordion-double-bar-chart
            type="HTTP"
            .data="${[
              [this.data.httpIn2xx, this.data.httpOut2xx],
              [this.data.httpIn3xx, this.data.httpOut3xx],
              [this.data.httpIn4xx, this.data.httpOut4xx],
              [this.data.httpIn5xx, this.data.httpOut5xx],
            ]}"
          ></accordion-double-bar-chart>        
        </div>

        <div class="content is-small">
          <h2 class="graph-title">HTTP Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.httpInRps,
              },
              {
                name: `Error`,
                data: this.data.httpInErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>        
      </div>  

      <div class="card info-card ${
        this.data.grpcInTotal || this.data.grpcOutTotal ? `` : `hide`
      }">        
        <div class="content is-small">
          <h2 class="graph-title">GRPC Traffic</h2>

          <table class="table">
            <thead>
              <tr>
                <th><abbr></abbr></th>
                <th><abbr>Total</abbr></th>
                <th><abbr>Success(%)</abbr></th>
                <th><abbr>Error(%)</abbr></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In</th>
                <td>${this.data.grpcInTotal}</th>
                <td>${this.data.grpcInSuccess?.toFixed(2)}%</th>
                <td>${this.data.grpcInError?.toFixed(2)}%</th>
              </tr>
              <tr>
                <td>Out</th>
                <td>${this.data.grpcOutTotal}</th>
                <td>${this.data.grpcOutSuccess?.toFixed(2)}%</th>
                <td>${this.data.grpcOutError?.toFixed(2)}%</th>
              </tr>
            </tbody>
          </table>

          <accordion-double-bar-chart
            type="GRPC"
            .data="${[
              [this.data.grpcInSuccess, this.data.grpcOutSuccess],
              [this.data.grpcInError, this.data.grpcOutError],
            ]}"
          ></accordion-double-bar-chart>        
        </div>

        <div class="content is-small">
          <h2 class="graph-title">GRPC Request Traffic</h2>

          <accordion-area-chart
            .data="${[
              {
                name: `RPS`,
                data: this.data.grpcInRps,
              },
              {
                name: `Error`,
                data: this.data.grpcInErrorRps,
              },
            ]}"
          ></accordion-area-chart>
        </div>        
      </div>      
      
      ${
        !this.data.httpInTotal &&
        !this.data.httpOutTotal &&
        !this.data.grpcInTotal &&
        !this.data.grpcOutTotal
          ? html`
              <div class="content is-small">
                No Traffic Info
              </div>
            `
          : html``
      }
    </div>
    `;
  }

  contentTemplate(index: number): TemplateResult {
    const http = this.http;
    const grpc = this.grpc;
    const successHttp = ((this.http2xx + this.http3xx) / this.http) * 100;
    const errorHttp = ((this.http4xx + this.http5xx) / this.http) * 100;
    const grpcSuccess = ((this.grpc - this.grpcError) / this.grpc) * 100;
    const grpcError = (this.grpcError / this.grpc) * 100;
    const incomingSuccessHttp =
      ((this.incomingHttp.rate -
        this.incomingHttp.rate4xx -
        this.incomingHttp.rate5xx) /
        this.incomingHttp.rate) *
      100;
    const incomingSuccessGrpc =
      ((this.incomingGrpc.rate - this.incomingGrpc.rateErr) /
        this.incomingGrpc.rate) *
      100;
    const incomingErrorHttp =
      ((this.incomingHttp.rate4xx + this.incomingHttp.rate5xx) /
        this.incomingHttp.rate) *
      100;
    const incomingErrorGrpc =
      (this.incomingGrpc.rateErr / this.incomingGrpc.rate) * 100;
    const incomingHttp2xx =
      this.incomingHttp.rate -
      this.incomingHttp.rate3xx -
      this.incomingHttp.rate4xx -
      this.incomingHttp.rate5xx;
    const outgoingSuccessHttp =
      ((this.outgoingHttp.rate -
        this.outgoingHttp.rate4xx -
        this.outgoingHttp.rate5xx) /
        this.outgoingHttp.rate) *
      100;
    const outgoingSuccessGrpc =
      ((this.outgoingGrpc.rate - this.outgoingGrpc.rateErr) /
        this.outgoingGrpc.rate) *
      100;
    const outgoingErrorHttp =
      ((this.outgoingHttp.rate4xx + this.outgoingHttp.rate5xx) /
        this.outgoingHttp.rate) *
      100;
    const outgoingErrorGrpc =
      (this.outgoingGrpc.rateErr / this.outgoingGrpc.rate) * 100;
    const outgoingHttp2xx =
      this.outgoingHttp.rate -
      this.outgoingHttp.rate3xx -
      this.outgoingHttp.rate4xx -
      this.outgoingHttp.rate5xx;

    if (index === 1) {
      return html`
      <div class="content is-small">
        <h2 class="graph-title">HTTP Traffic</h2>

        <table class="table traffic-table">
          <thead>
            <tr>
              <th><abbr>Total</abbr></th>
              <th><abbr>Success(%)</abbr></th>
              <th><abbr>Error(%)</abbr></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${(this.incomingHttp?.rate || 0)?.toFixed(2)}</th>
              <td>${(incomingSuccessHttp || 0)?.toFixed(2)}%</th>
              <td>${(incomingErrorHttp || 0)?.toFixed(2)}%</th>
            </tr>
          </tbody>
        </table>

        <accordion-bar-chart
          type="HTTP"
          .data="${[
            incomingHttp2xx,
            this.incomingHttp.rate3xx,
            this.incomingHttp.rate4xx,
            this.incomingHttp.rate5xx,
          ]}"
        ></accordion-bar-chart>
      </div>

      <div class="content is-small">
        <h2 class="graph-title">GRPC Traffic</h2>

        <table class="table traffic-table">
          <thead>
            <tr>
              <th><abbr>Total</abbr></th>
              <th><abbr>Success(%)</abbr></th>
              <th><abbr>Error(%)</abbr></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${(this.incomingGrpc?.rate || 0)?.toFixed(2)}</th>
              <td>${(incomingSuccessGrpc || 0)?.toFixed(2)}%</th>
              <td>${(incomingErrorGrpc || 0)?.toFixed(2)}%</th>
            </tr>
          </tbody>
        </table>

        <accordion-bar-chart
          type="GRPC"
          .data="${[incomingSuccessGrpc / 100, incomingErrorGrpc / 100]}"
        ></accordion-bar-chart>
      </div>
      `;
    } else if (index === 2) {
      return html`
      <div class="content is-small">
        <h2 class="graph-title">HTTP Traffic</h2>

        <table class="table traffic-table">
          <thead>
            <tr>
              <th><abbr>Total</abbr></th>
              <th><abbr>Success(%)</abbr></th>
              <th><abbr>Error(%)</abbr></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${(this.outgoingHttp?.rate || 0)?.toFixed(2)}</th>
              <td>${(outgoingSuccessHttp || 0)?.toFixed(2)}%</th>
              <td>${(outgoingErrorHttp || 0)?.toFixed(2)}%</th>
            </tr>
          </tbody>
        </table>

        <accordion-bar-chart
          type="HTTP"
          .data="${[
            outgoingHttp2xx,
            this.outgoingHttp.rate3xx,
            this.outgoingHttp.rate4xx,
            this.outgoingHttp.rate5xx,
          ]}"
        ></accordion-bar-chart>

        <h2 class="graph-title">GRPC Traffic</h2>

        <table class="table traffic-table">
          <thead>
            <tr>
              <th><abbr>Total</abbr></th>
              <th><abbr>Success(%)</abbr></th>
              <th><abbr>Error(%)</abbr></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${(this.outgoingGrpc?.rate || 0)?.toFixed(2)}</th>
              <td>${(outgoingSuccessGrpc || 0)?.toFixed(2)}%</th>
              <td>${(outgoingErrorGrpc || 0)?.toFixed(2)}%</th>
            </tr>
          </tbody>
        </table>

        <accordion-bar-chart
          type="GRPC"
          .data="${[outgoingSuccessGrpc / 100, outgoingErrorGrpc / 100]}"
        ></accordion-bar-chart>
      </div>
      `;
    }

    return html`
    <div class="content is-small">
      <h2 class="graph-title">Total Request Traffic</h2>

      <accordion-area-chart
        .data="${[
          {
            name: `RPS`,
            data: this.rps,
          },
          {
            name: `Error`,
            data: this.errorRps,
          },
        ]}"
      ></accordion-area-chart>

      <h2 class="graph-title">HTTP Traffic</h2>

      <table class="table traffic-table">
        <thead>
          <tr>
            <th><abbr>Total</abbr></th>
            <th><abbr>Success(%)</abbr></th>
            <th><abbr>Error(%)</abbr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${(http || 0)?.toFixed(2)}</th>
            <td>${(successHttp || 0)?.toFixed(2)}%</th>
            <td>${(errorHttp || 0)?.toFixed(2)}%</th>
          </tr>
        </tbody>
      </table>

      <accordion-bar-chart
        type="HTTP"
        .data="${[this.http2xx, this.http3xx, this.http4xx, this.http5xx]}"
      ></accordion-bar-chart>      

      <h2 class="graph-title">GRPC Traffic</h2>

      <table class="table traffic-table">
        <thead>
          <tr>
            <th><abbr>Total</abbr></th>
            <th><abbr>Success(%)</abbr></th>
            <th><abbr>Error(%)</abbr></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${(grpc || 0)?.toFixed(2)}</th>
            <td>${(grpcSuccess || 0)?.toFixed(2)}%</th>
            <td>${(grpcError || 0)?.toFixed(2)}%</th>
          </tr>
        </tbody>
      </table>

      <accordion-bar-chart
        type="GRPC"
        .data="${[this.grpc, this.grpcError]}"
      ></accordion-bar-chart>
    </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      bulmaCss,
      apexChartCss,
      css`
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }

        .scroll {
          overflow-y: scroll;
          padding-bottom: 80px;
        }

        .graph-title {
          font-size: 16px;
          font-weight: normal;
          margin: 10px;
          font-family: auto;

          display: flex;
          align-items: center;
          font-size: 14px;
          height: 30px;
          color: rgb(51, 51, 51);
          border-bottom: 1px solid rgb(224, 224, 224);
        }

        .table {
          font-size: 12px;
          margin: 0 10px;
          box-sizing: border-box;
          width: calc(100% - 20px);
        }

        .traffic-table {
          width: 100%;
          margin: 0;
        }

        .tabs.accordion-tabs {
          margin-bottom: 0;
        }

        .tabs ul {
          font-size: 12px;
        }

        .content {
          flex: 1 1 auto;
          padding: 10px;
        }

        h2.graph-title {
          font-size: 14px;
          font-weight: normal;
          margin: 0;
          margin-bottom: 10px;
        }

        .info-card {
          padding-bottom: 20px;
          margin-bottom: 10px;
        }

        .hide {
          display: none;
        }
      `,
    ];
  }
}
