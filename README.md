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
- [ ] HilbertGenome component 
  - https://observablehq.com/@enjalot/zoomable-hilbert-canvas
- [ ] Basic annotation (chromosome layout, names, hilbert curve) 
  - https://observablehq.com/@enjalot/hilbert-chromosome-bands

### Configuration
- [ ] Create layer definition using JSON configuration and data grammar
- [ ] Define data configuration, including URLs for files and layer names
  - https://observablehq.com/@enjalot/hilbert-chromosome-data-fetch

### Data Rendering Components
- [ ] Treemap subcomponent
  - https://observablehq.com/@enjalot/hilbert-chromosome-dhs-oe-scores
- [ ] Text subcomponent 
  - https://observablehq.com/@enjalot/hilbert-chromosome-grc-nucleotides
- [ ] SVG overlay subcomponent (for highlighting regions)
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

// Provide code samples and explanations for using the component.


## Contributing

// TODO Describe the contribution process, coding guidelines, and ways to get involved in the project.

## License

// TODO Specify the license for the project.
