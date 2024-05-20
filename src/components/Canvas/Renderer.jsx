
import CanvasBase from "./Base";
import CanvasScaledValue from "./ScaledValue";
import CanvasSimpleValue from "./SimpleValue";
import CanvasTextValue from "./TextValue";
import CanvasOpacityValue from "./OpacityValue";
import CanvasOrder14 from "./Order14";

export function Renderer(renderer, options) {
  switch (renderer) {
    case "CanvasScaledValue":
      return CanvasScaledValue(options)
    case "CanvasSimpleValue":
      return CanvasSimpleValue(options)
    case "CanvasTextValue":
      return CanvasTextValue(options)
    case "CanvasOpacityValue":
      return CanvasOpacityValue(options)
    case "CanvasOrder14":
      return CanvasOrder14(options)
    default:
      return CanvasBase(options)
  }
}
