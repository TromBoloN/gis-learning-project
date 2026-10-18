   declare module "maplibre-gl/dist/maplibre-gl-csp" {
     import * as maplibre from "maplibre-gl";
     const lib: typeof maplibre;
     export default lib;
   }