import {
  html,
  TemplateResult,
  customElement,
  LitElement,
  PropertyDeclarations,
} from 'lit-element';
import ApexCharts from 'apexcharts';

@customElement('accordion-double-bar-chart')
export class AccordionDoubleBarChart extends LitElement {
  static get properties(): PropertyDeclarations {
    return {
      title: { type: String },
      type: { type: String },
      data: { type: Array },
    };
  }

  title: string;
  type: `HTTP` | `GRPC`;
  data: any[];

  private chart: ApexCharts;
  private chartOption: any;

  constructor() {
    super();

    this.title = `Total`;
    this.type = `HTTP`;
    this.data = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    this.chartOption = {
      grid: {
        show: true,
        borderColor: `rgb(193, 193, 193)`,
        position: 'front',
        xaxis: {
          lines: {
            show: true,
          },
        },
        strokeDashArray: 7,
      },
      dataLabels: {
        enabled: false,
      },
      colors:
        this.type === `HTTP`
          ? [
              `rgba(61, 134, 73, 0.9)`,
              'rgba(114, 188, 245, 0.9)',
              `rgba(241, 171, 33, 0.9)`,
              `rgba(201, 24, 12, 0.9)`,
            ]
          : [`rgba(61, 134, 73, 0.9)`, `rgba(201, 24, 12, 0.9)`],
      series:
        this.type === `HTTP`
          ? [
              {
                name: '2xx',
                data: [...this.data[0]],
              },
              {
                name: '3xx',
                data: [...this.data[1]],
              },
              {
                name: '4xx',
                data: [...this.data[2]],
              },
              {
                name: '5xx',
                data: [...this.data[3]],
              },
            ]
          : [
              {
                name: `OK`,
                data: [...this.data[0]],
              },
              {
                name: `Erorr`,
                data: [...this.data[1]],
              },
            ],
      chart: {
        type: 'bar',
        height: 150,
        stacked: true,
        stackType: '100%',
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
        },
      },
      xaxis: {
        categories: [`In`, `Out`],
      },
      stroke: {
        width: 1,
        colors: ['#fff'],
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const percent =
              opts.w.globals.seriesPercent[opts.seriesIndex][
                opts.dataPointIndex
              ];
            return percent.toFixed(2) + '%';
          },
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        offsetX: 40,
      },
    };
  }

  disconnectedCallback() {
    this.chart.destroy();
    this.chart = null;
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
    if (this.type === `HTTP`) {
      this.chart.updateSeries([
        {
          name: '2xx',
          data: [...this.data[0]],
        },
        {
          name: '3xx',
          data: [...this.data[1]],
        },
        {
          name: '4xx',
          data: [...this.data[2]],
        },
        {
          name: '5xx',
          data: [...this.data[3]],
        },
      ]);
    } else {
      this.chart.updateOptions({
        colors: [`rgba(61, 134, 73, 0.9)`, `rgba(201, 24, 12, 0.9)`],
      });
      this.chart.updateSeries([
        {
          name: `OK`,
          data: [...this.data[0]],
        },
        {
          name: `Erorr`,
          data: [...this.data[1]],
        },
      ]);
    }
  }

  protected render(): TemplateResult {
    return html` <div id="chart"></div> `;
  }
}
