# gilbert

A system for the visualization, annotation, navigation, and narration of genomic datasets.
Zoom seamlessly from an overview of all chromosomes down to individual basepairs -- from Megabase to single base.
The system uses a 2D Hilbert curve genome map along with a traditional 1D genome track, and additional tools for zooming, region selection, and narrative feedback.

## Table of Contents

- [Installation](#installation)
- [Development](#development)
- [Production Build](#production-build)
- [API & Data Setup](#api--data-setup)
- [Overview](#overview)
- [Code Structure](#code-structure)
- [Contributing](#contributing)
- [License](#license)

## Installation

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

## Development

During development, use the following commands:
- **Start the dev server:** `npm run dev`
- **Run tests:** `npm test`

The main entry point is `src/pages/Home.jsx`, which sets up the genome visualization, zoom controls, and UI layers.  
Other important pages include:
- Components such as [HilbertGenome](src/components/HilbertGenome.jsx), [LinearGenome](src/components/LinearGenome.jsx), and [ZoomLegend](src/components/ZoomLegend.jsx) coordinate the core visualization.
- The zoom state is managed by the [ZoomProvider](src/contexts/ZoomProvider.jsx) context.

## Production Build

To create a production build use:

```bash
npm run build
```

*Note:*  
If you encounter issues with large bundle sizes, consider using [webpack-bundle-analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) to inspect and optimize your bundle. Strategies such as code splitting, lazy loading, and tree shaking may improve load times.

## API & Data Setup

The primary API which provides genomic data is documented separately.  
Refer to the API repository ([gilbertAPI](#)) for detailed setup instructions.

## Overview

- **Visualization:**  
  The main view displays a Hilbert curve representation of the genome along with a 1D genome track at the bottom.  
  A separate legend and set of controls let you select regions, adjust zoom levels, and see layer information.

- **Interactive Features:**  
  - Clicking on a region launches a narrative UI (working name: 'Inspector Gadget').
  - Hovering on regions shows coordinate tooltips and layer-based annotations (tip: hold down the SHIFT key).
  - A settings panel and toolbar allow you to adjust visual options or revert to default layer configurations.


## Code Structure

- **src/pages:**  
  Contains the main entry pages such as Home (genome visualization).

- **src/components:**  
  - `HilbertGenome.jsx` – Renders the Hilbert curve layout of the genome.
  - `LinearGenome.jsx` – Provides the traditional 1D genome track.
  - `ZoomLegend.jsx` – Displays current zoom levels, active layers, and provides layer controls.
  - Other UI components for narration, tooltips, and region selection.

- **src/contexts:**  
  The ZoomProvider and other contexts manage global state (e.g., zoom, region selection).

## Contributing

Contributions are welcome!  
Please follow the existing code style and add tests for any new features.  
For more details, reach out to Wouter Meuleman (meuleman@gmail.com).

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
