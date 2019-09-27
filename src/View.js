import linear from "./linear";

export default class View {
  // All the parameters of the view (camera plus planes and other options)
  constructor(options = {}) {
    let c = linear.vclone;

    this.viewPoint = c(options.viewPoint) || [0, 0, -30];
    this.viewNormal = linear.vnormalize(options.viewNormal || [0, 0, 1.5]);
    this.viewUp = linear.vnormalize(options.viewUp || [0, -1, 0]);
    this.viewDistance = options.viewDistance || linear.vlength(this.viewPoint);
    this.viewBoxMin = c(options.viewBoxMin) || [-3, -3, -3];
    this.viewBoxMax = c(options.viewBoxMax) || [3, 3, 3];
    this.viewAngle = options.viewAngle || 30;
    this.viewNear = 0;
    this.viewFar = 3e38; // basically float max

    this.look();
  }

  uniforms() {
    let halfSinViewAngle = 0.5 * Math.sin((this.viewAngle * Math.PI) / 180);

    return {
      viewPoint: { type: "3fv", value: this.viewPoint },
      viewNormal: { type: "3fv", value: this.viewNormal },
      viewRight: { type: "3fv", value: this.viewRight },
      viewUp: { type: "3fv", value: this.viewUp },
      viewBoxMin: { type: "3fv", value: this.viewBoxMin },
      viewBoxMax: { type: "3fv", value: this.viewBoxMax },
      halfSinViewAngle: { type: "1f", value: halfSinViewAngle },
      viewNear: { type: "1f", value: this.viewNear },
      viewFar: { type: "1f", value: this.viewFar }
    };
  }

  target() {
    this.viewNormal = linear.vnormalize(this.viewNormal);
    return linear.vplus(
      this.viewPoint,
      linear.vscale(this.viewNormal, this.viewDistance)
    );
  }

  look(options = {}) {
    let at = options.at || this.target();
    let from = options.from || this.viewPoint;
    let up = options.up || this.viewUp;
    let bounds = options.bounds;

    if (bounds) {
      this.viewBoxMin = bounds.min;
      this.viewBoxMax = bounds.max;
    }
    this.viewNormal = linear.vnormalize(linear.vminus(at, from));
    this.viewRight = linear.vnormalize(linear.vcross(this.viewNormal, up));
    this.viewUp = linear.vcross(this.viewRight, this.viewNormal);
    this.viewPoint = linear.vclone(from);
    this.viewDistance = linear.vdistance(at, from);
  }

  slice(options = {}) {
    let plane = options.plane || "axial";
    let offset = options.offset || 0.5;
    let thickness = options.thickness || 0;
    let bounds = options.bounds || {
      min: this.viewBoxMin,
      max: this.viewBoxMax
    };
    let magnification = options.magnification || 1;
    let target =
      options.target ||
      linear.vscale(linear.vplus(bounds.min, bounds.max), offset);
    let extent = options.extent || linear.vminus(bounds.max, bounds.min);

    // TODO: doublecheck these with Slicer
    switch (plane) {
      case "axial":
        {
          // looking from below at LPS slice
          this.viewRight = [1, 0, 0];
          this.viewUp = [0, -1, 0];
          this.viewNormal = [0, 0, 1];
          this.viewPoint = [0, 0, -1];
        }
        break;
      case "sagittal":
        {
          // nose pointing left
          this.viewRight = [0, 1, 0];
          this.viewUp = [0, 0, 1];
          this.viewNormal = [-1, 0, 0];
          this.viewPoint = [1, 0, 0];
        }
        break;
      case "coronal":
        {
          this.viewRight = [1, 0, 0];
          this.viewUp = [0, 0, 1];
          this.viewNormal = [0, 1, 0];
          this.viewPoint = [0, -1, 0];
        }
        break;
      default: {
        console.log("Unknown slice plane", plane);
      }
    }

    let extentRight = linear.vlength(linear.vdot(extent, this.viewRight));
    let windowRight = extentRight / magnification;

    this.viewDistance =
      windowRight / Math.tan((this.viewAngle * Math.PI) / 180);
    let viewOffset = linear.vscale(this.viewPoint, this.viewDistance);

    this.viewPoint = linear.vplus(target, viewOffset);

    this.viewNear = this.viewDistance - 0.5 * thickness;
    this.viewFar = this.viewDistance + 0.5 * thickness;
  }

  orbit(rightward, upward) {
    let target = this.target();
    let vTargetToOrigin = linear.vscale(target, -1);
    let mTargetToOrigin = linear.mtranslate(vTargetToOrigin);
    let mAboutUp = linear.mrotate(this.viewUp, rightward);
    let mAboutRight = linear.mrotate(this.viewRight, upward);
    let mTargetFromOrigin = linear.mtranslate(this.target());
    let rotation = linear.mmultiply(
      mTargetFromOrigin,
      linear.mmultiply(mAboutRight, linear.mmultiply(mAboutUp, mTargetToOrigin))
    );
    let newViewPoint = linear
      .mvmultiply(rotation, [...this.viewPoint, 1])
      .slice(0, 3);

    this.look({ from: newViewPoint, at: target });
  }
}
