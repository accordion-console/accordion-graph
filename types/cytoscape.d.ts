
declare module 'cytoscape' {
  export interface BaseLayoutOptions {
    fit?: boolean;
    nodeDimensionsIncludeLabels?: boolean;
    rankDir?: string;
  }

  export interface NodeSingular {
    popper?: any;
    popperRef?: any;
  }

  export interface Core {
    nodeHtmlLabel?: any;
  }
}

declare const type: object;

export default type;