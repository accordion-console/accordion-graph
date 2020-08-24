export const CyEdge = {
  grpc: 'grpc',
  grpcErr: 'grpcErr',
  grpcPercentErr: 'grpcPercentErr',
  grpcPercentReq: 'grpcPercentReq',
  hasTraffic: 'hasTraffic',
  http: 'http',
  http3xx: 'http3xx',
  http4xx: 'http4xx',
  http5xx: 'http5xx',
  httpPercentErr: 'httpPercentErr',
  httpPercentReq: 'httpPercentReq',
  id: 'id',
  isMTLS: 'isMTLS',
  protocol: 'protocol',
  responses: 'responses',
  responseTime: 'responseTime',
  tcp: 'tcp'
};

export const CyNode = {
  app: 'app',
  destServices: 'destServices',
  grpcIn: 'grpcIn',
  grpcInErr: 'grpcInErr',
  grpcOut: 'grpcOut',
  hasCB: 'hasCB',
  hasMissingSC: 'hasMissingSC',
  hasVS: 'hasVS',
  httpIn: 'httpIn',
  httpIn3xx: 'httpIn3xx',
  httpIn4xx: 'httpIn4xx',
  httpIn5xx: 'httpIn5xx',
  httpOut: 'httpOut',
  id: 'id',
  isDead: 'isDead',
  isGroup: 'isGroup',
  isInaccessible: 'isInaccessible',
  isIstio: 'isIstio',
  isMisconfigured: 'isMisconfigured',
  isOutside: 'isOutside',
  isRoot: 'isRoot',
  isServiceEntry: 'isServiceEntry',
  isUnused: 'isUnused',
  namespace: 'namespace',
  nodeType: 'nodeType',
  service: 'service',
  tcpIn: 'tcpIn',
  tcpOut: 'tcpOut',
  version: 'version',
  workload: 'workload'
};

const safeRate = (rate: any) => (isNaN(rate) ? 0.0 : Number(rate));

type TRAFFIC_GRPC = {
  RATE: string;
  RATEERR: string;
};

const NODE_GRPC_IN: TRAFFIC_GRPC = {
  RATE: CyNode.grpcIn,
  RATEERR: CyNode.grpcInErr
};
const EDGE_GRPC: TRAFFIC_GRPC = {
  RATE: CyEdge.grpc,
  RATEERR: CyEdge.grpcErr
};

export interface TrafficRateGrpc {
  rate: number;
  rateErr: number;
}

export const getTrafficRateGrpc = (element: any, _trafficType: TRAFFIC_GRPC = NODE_GRPC_IN): TrafficRateGrpc => {
  return {
    rate: safeRate(element.data().traffic?.rates?.grpc),
    rateErr: safeRate(element.data().traffic?.rates?.grpcErr),
  };
};

export const getAccumulatedTrafficRateGrpc = (elements: any): TrafficRateGrpc => {
  return elements?.reduce(
    (r: TrafficRateGrpc, element: any): TrafficRateGrpc => {
      const elementTrafficRate = getTrafficRateGrpc(element, EDGE_GRPC);
      r.rate += elementTrafficRate.rate;
      r.rateErr += elementTrafficRate.rateErr;
      return r;
    },
    { rate: 0, rateErr: 0 }
  );
};

type TRAFFIC_HTTP = {
  RATE: string;
  RATE3XX: string;
  RATE4XX: string;
  RATE5XX: string;
};

const NODE_HTTP_IN: TRAFFIC_HTTP = {
  RATE: CyNode.httpIn,
  RATE3XX: CyNode.httpIn3xx,
  RATE4XX: CyNode.httpIn4xx,
  RATE5XX: CyNode.httpIn5xx
};
const EDGE_HTTP: TRAFFIC_HTTP = {
  RATE: CyEdge.http,
  RATE3XX: CyEdge.http3xx,
  RATE4XX: CyEdge.http4xx,
  RATE5XX: CyEdge.http5xx
};

export interface TrafficRateHttp {
  rate: number;
  rate3xx: number;
  rate4xx: number;
  rate5xx: number;
}

export const getTrafficRateHttp = (element: any, _trafficType: TRAFFIC_HTTP = NODE_HTTP_IN): TrafficRateHttp => {
  return {
    rate: safeRate(element.data().traffic?.rates?.http),
    rate3xx: safeRate(element.data().traffic?.rates?.http3xx),
    rate4xx: safeRate(element.data().traffic?.rates?.http4xx),
    rate5xx: safeRate(element.data().traffic?.rates?.http5xx)
  };
};

export const getAccumulatedTrafficRateHttp = (elements: any): TrafficRateHttp => {
  return elements?.reduce(
    (r: TrafficRateHttp, element: any): TrafficRateHttp => {
      const elementTrafficRate = getTrafficRateHttp(element, EDGE_HTTP);
      r.rate += elementTrafficRate.rate;
      r.rate3xx += elementTrafficRate.rate3xx;
      r.rate4xx += elementTrafficRate.rate4xx;
      r.rate5xx += elementTrafficRate.rate5xx;
      return r;
    },
    { rate: 0, rate3xx: 0, rate4xx: 0, rate5xx: 0 }
  );
};
