import { html, TemplateResult, customElement, LitElement, PropertyDeclarations, } from 'lit-element';
import ApexCharts from 'apexcharts';

@customElement('accordion-area-chart')
export class AccordionAreaChart extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      title: { type: String, },
      data: { type: Array, },
    };
  }

  title: string;
  data: any[];

  private chart: ApexCharts;
  private chartOption: any;

  constructor() {
    super();  

    this.data = [
      {
        name: `RPS`,
        data: [
          [1597801680 * 1000, 30.95],
          [1597800960 * 1000, 31.34],       
        ],
      },
      {
        name: `Error`,
        data: [
          [1597801680 * 1000, 5.95],
          [1597800960 * 1000, 0.34],       
        ],
      },
    ];
    this.chartOption = {            
      series: this.data,
      colors: [`rgb(61, 134, 73)`, `rgb(201, 24, 12)`],
      chart: {
        id: 'area-datetime',
        type: 'area',
        height: 150,
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      yaxis: {
        show: false,
      },            
      dataLabels: {
        enabled: false
      },
      markers: {
        size: 0,
        style: 'hollow',
      },
      xaxis: {
        type: 'datetime',
        tickAmount: 6,
      },
      tooltip: {
        x: {
          format: 'TT hh:mm:ss',
          formatter: (val: string) => {
            return new Date(val).toLocaleTimeString();
          }
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.9,
          stops: [0, 100]
        }
      },
      stroke: {
        width: 1,
        curve: 'straight'
      },
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  createRenderRoot() {
    return this;
  }

  protected firstUpdated(): void {
    this.initChart();
  }

  initChart(): void {
    this.chart = new ApexCharts(this.querySelector(`#chart`), this.chartOption);
    this.chart.render();
  }

  protected updated(): void {
    this.chart.updateSeries(this.data);
  }
  
  protected render(): TemplateResult {
    return html`
    <div id="chart"></div>
    `;
  }
}

