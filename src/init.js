import step from "./step";
import RayCastRenderer from "./RayCastRenderer";
import View from "./View";

export default function init() {
  const canvas = document.createElement("canvas");

  canvas.id = "renderCanvas";

  const gl = canvas.getContext("webgl2");

  if (!gl) {
    alert(
      "Sorry, it looks like your browser does not support webgl2.  Try firefox."
    );
  }

  // Check if our gl supports float textures and if
  // so set the Field and Generator class variables so all instances use
  // the same type
  const glExtensions = {};
  const expectedExtensions = [
    "EXT_color_buffer_float",
    "OES_texture_float_linear"
  ]; /* TODO WEBGL_debug_renderer_info WEBGL_lose_context */

  expectedExtensions.forEach(extensionName => {
    glExtensions[extensionName] = gl.getExtension(extensionName);
  });
  const hasTextureFloatLinear = "OES_texture_float_linear" in glExtensions;
  const hasColorBufferFloat = "EXT_color_buffer_float" in glExtensions;

  step.useIntegerTextures = !(hasTextureFloatLinear && hasColorBufferFloat);

  if (step.useIntegerTextures) {
    // TODO: this mode should probably go away in order to simplify the code
    // https://webglstats.com/webgl2/extension/OES_texture_float_linear
    console.warn("Floating texture support not available");
  }

  step.renderer = new RayCastRenderer({
    gl,
    canvas,
    uniforms: step.uniforms,
    inputFields: []
  });
  step.view = new View({
    viewBoxMax: [250, 250, -250],
    viewBoxMin: [-250, -250, -200],
    viewPoint: [0, -400, 0],
    viewNormal: [0, 1, 0],
    viewUp: [0, 0, 1]
  });
  step.renderer.glExtensions = glExtensions;
  step.renderer.updateProgram();
  step.renderer._render(step.view);
}
