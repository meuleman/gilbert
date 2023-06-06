# react-hilbert-genome
A powerful, interactive, and customizable React component for visualizing genomic data using a Hilbert curve layout. See all 24 chromosomes and zoom down to individual basepairs smoothly and efficiently.

## Table of Contents

- [Development Checklist](#development-checklist)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)


## Development Checklist

### Base Component
- [x] HilbertGenome component 
  - https://observablehq.com/@enjalot/zoomable-hilbert-canvas
- [x] Basic annotation (chromosome layout, names, hilbert curve) 
  - https://observablehq.com/@enjalot/hilbert-chromosome-bands

### Configuration
- [x] Create layer definition using JSON configuration and data grammar
- [x] Define data configuration, including URLs for files and layer names
  - https://observablehq.com/@enjalot/hilbert-chromosome-data-fetch

### Data Rendering Components
- [x] canvas subcomponents
  - https://observablehq.com/@enjalot/hilbert-chromosome-dhs-oe-scores
- [x] Text subcomponent 
  - https://observablehq.com/@enjalot/hilbert-chromosome-grc-nucleotides
- [x] SVG overlay subcomponent (for highlighting regions)
  - https://observablehq.com/@enjalot/hilbert-chromosome-gencode

### Event Handling
- [ ] Hover / mouseover event
- [ ] Click event
- [ ] Key + click event
- [ ] Double-click event
- [ ] Zoom event
- [ ] Drag / pan event

Include relevant information in events, such as Hilbert and genome coordinates, Hilbert order, and chromosome segments. Can also consider including information about what is under the center of the map (like a scope).

### Programmatic Zoom
- [ ] Zooming to a specific location or region
- [ ] Zooming to a set of regions

### Viewing Options
- [ ] Single chromosome view
- [ ] Hiding / de-emphasizing irrelevant chromosomes

### Linked Maps
- [ ] Minimap with bounding box of the main map
- [ ] Map zoomed to a given region



## Installation

// TODO Include instructions on how to install the package from npm or yarn.

## Usage

`react-hilbert-genome` provides a `<HilbertGenome>` component that allows you to customize the visualization by setting various properties such as order domain, zoom extent, and data layers.

See [src/App.jsx](App.jsx) for example of using and coordinating the various components.

### Setting the Order Domain

The `orderDomain` prop determines the range of chromosome orders to be displayed in the Hilbert curve. It accepts an array of two numbers representing the minimum and maximum order.
The maximum order should be 14 or less since it provides space for every basepair in each chromosome. See [hilbertgenome-py](https://github.com/enjalot/hilbertgenome-py) for more information.

```jsx
const orderDomain = [4, 14];
```

### Setting the Zoom Extent

The `zoomExtent` prop defines the range of allowable zoom levels for the visualization. It accepts an array of two numbers representing the minimum and maximum zoom levels.  
The minimum can be set to a fraction like 0.85 to allow a little bit of zooming out. Choosing a higher number like 5000 for the max allows the zoom to take longer, allowing the user to spend more tim in each order.

```jsx
const zoomExtent = [0.85, 5000];
```

### Data Layers

The `dataLayers` prop accepts an array of JSON specifications to define the data layers to be visualized. Each layer requires a `baseUrl`, a `name`, and a `component` to render the data.

Available rendering components include `Treemap`, `Heatmap`, and `Text`. You can import these components from the `react-hilbert-genome` package.

```jsx
const dataLayers = [
  {
    baseUrl: 'https://your-data-source.com/data',
    name: 'layer1',
    component: Treemap,
  },
  {
    baseUrl: 'https://your-data-source.com/data2',
    name: 'layer2',
    component: Heatmap,
  },
  {
    baseUrl: 'https://your-data-source.com/data3',
    name: 'layer3',
    component: Text,
  },
];
```

Pass the `dataLayers` array as a prop to the `<HilbertGenome>` component to render the specified layers in the visualization.


## Contributing

// TODO Describe the contribution process, coding guidelines, and ways to get involved in the project.

## License

// TODO Specify the license for the project.
