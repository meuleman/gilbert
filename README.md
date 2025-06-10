# react-hilbert-genome
Visualize hg38 whole-genome data using a Hilbert curve layout. Zoom out to see all 24 chromosomes and zoom down to individual basepairs smoothly and efficiently.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)


## Installation

```bash
npm install
npm run dev
```

## Setting up the API

The API that provides the data can be found at [gilbertApi](), follow the setup instructions.


## Overview

The main entry point into the App is `src/pages/Home.jsx`. This is the page that is rendered when the user navigates to the root URL.

The focal point of the App is the [HilbertGenome](src/components/HilbertGenome.jsx) component which provides the 2D map of the genome, with a more traditional 1D genome track to the bottom found in [LinearGenome.jsx](src/components/LinearGenome.jsx). To the right side is the [ZoomLegend](src/components/ZoomLegend.jsx) which provides a legend for the zoom levels and which data layers are active at each zoom level (AKA `order`).

The zoom state is coordinated by the [ZoomProvider](src/contexts/ZoomProvider.jsx) context, which allows us to sync the 1D view as well as the zoom legend.

When you select a region or a region set, another layer of UI is activated.
TODO: describe the state of the UI when a region or region set is selected.

RegionProvider
SelectedStates



## Contributing

// TODO Describe the contribution process, coding guidelines, and ways to get involved in the project.

## License

// TODO Specify the license for the project.
