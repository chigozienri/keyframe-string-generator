// Much of this code is cannibalised from https://codepen.io/Kira4/pen/MRgzLj

///////////////////////////////////////////////////////////////////////////////
// Classes
///////////////////////////////////////////////////////////////////////////////
class Point {
  constructor(newX, newY, line, cpt0 = null, cpt1 = null) {
    this.xVal = newX;
    this.yVal = newY;

    this.cpt0 = new ControlPoint(-Math.PI, 0, this, 0);
    if (cpt0 !== null) {
      this.cpt0.updatePosition(cpt0.x, cpt0.y, true, false);
    }
    this.cpt1 = new ControlPoint(0, 0, this, 1);
    if (cpt1 !== null) {
      this.cpt1.updatePosition(cpt1.x, cpt1.y, true, false);
    }

    this._neighbour0 = undefined;
    this._neighbour1 = undefined;

    this.RADIUS = 3;
    this.SELECT_RADIUS = this.RADIUS + 2;
    this.labelOffset = { x: 0, y: 15 };

    this.line = line;
  }
  get x() {
    return this.xVal;
  }

  get y() {
    return this.yVal;
  }

  set neighbour0(point) {
    if (point) {
      this._neighbour0 = point;
      this._neighbour0._neighbour1 = this;
      // Reset neighbour control point to ensure doesn't overlap this position
      this._neighbour0.cpt1.updatePosition(
        this._neighbour0.cpt1.x,
        this._neighbour0.cpt1.y
      );
    }
  }

  get neighbour0() {
    return this._neighbour0;
  }

  set neighbour1(point) {
    if (point) {
      this._neighbour1 = point;
      this._neighbour1._neighbour0 = this;
      // Reset neighbour control point to ensure doesn't overlap this position
      this._neighbour1.cpt0.updatePosition(
        this._neighbour1.cpt0.x,
        this._neighbour1.cpt0.y
      );
    }
  }

  get neighbour1() {
    return this._neighbour1;
  }

  draw() {
    gCtx.save();
    gCtx.beginPath();
    gCtx.arc(
      xTransform(this.x),
      yTransform(this.y),
      this.RADIUS,
      0,
      2 * Math.PI
    );
    gCtx.stroke();
    gCtx.fill();
    gCtx.restore();

    gCtx.restore();
    this.cpt0.draw();
    this.cpt1.draw();
    this.clearBorders();
  }

  clearBorders() {
    gCtx.clearRect(0, 0, graphxmin, height);
    gCtx.clearRect(0, 0, width, graphymin);
    gCtx.clearRect(graphxmax, 0, width, height);
    gCtx.clearRect(0, graphymax, width, height);
  }

  drawLabel() {
    gCtx.fillText(
      `${this.x}, ${parseFloat(this.y).toFixed(decimalPrecision)}`,
      xTransform(this.x) + this.labelOffset.x,
      yTransform(this.y) + this.labelOffset.y
    );
  }

  highlight() {
    gCtx.beginPath();
    gCtx.arc(
      xTransform(this.x),
      yTransform(this.y),
      this.SELECT_RADIUS,
      0,
      2 * Math.PI
    );
    gCtx.stroke();
  }
}

class ControlPoint {
  constructor(angle, magnitude, owner, type) {
    this.RADIUS = 2;
    this.SELECT_RADIUS = this.RADIUS + 2;
    this.angle = angle;
    this.magnitude = magnitude;
    this.owner = owner;
    this.type = type;
  }

  get x() {
    return this.owner.x + this.xDelta;
  }

  get y() {
    return this.owner.y + this.yDelta;
  }

  get xDelta() {
    return this.magnitude * Math.cos(this.angle);
  }

  get yDelta() {
    return this.magnitude * Math.sin(this.angle);
  }

  updatePosition(x, y, force = false, updatePartner = false) {
    let relX = x - this.owner.x;
    let relY = y - this.owner.y;
    let partner;
    if (this.type == 0) {
      partner = this.owner.cpt1;
    } else {
      partner = this.owner.cpt0;
    }
    if (!force) {
      if (relX < 0) {
        gSelected = this.owner.cpt0;
      } else {
        gSelected = this.owner.cpt1;
      }
    }
    if (updatePartner) {
      partner.updatePosition(
        this.owner.x - relX,
        this.owner.y - relY,
        (force = true),
        (updatePartner = false)
      );
    }

    // Avoid div/0 errors for angle:
    if (Math.abs(relX - 0) > 0.001) {
      this.angle = Math.atan(relY / relX);
      if (relX < 0) {
        this.angle = this.angle + Math.PI;
      }
    } else {
      if (relY > 0) {
        this.angle = Math.PI / 2;
      } else {
        this.angle = -Math.PI / 2;
      }
    }
    this.magnitude = Math.hypot(relX, relY);

    if (this.type == 0) {
      let minVal = xmin;
      if (this.owner.neighbour0) {
        minVal = this.owner.neighbour0.x;
      }
      if (x < minVal) {
        let inverseSlope = relX / relY;
        let xDistance = minVal - this.owner.x;
        let yDistance = xDistance / inverseSlope;
        this.updatePosition(
          minVal,
          this.owner.y + yDistance,
          (force = true),
          (updatePartner = false)
        );

        return;
      }
      if (x > this.owner.x) {
        this.updatePosition(
          this.owner.x,
          y,
          (force = true),
          (updatePartner = false)
        );
        return;
      }
    }
    if (this.type == 1) {
      let maxVal = xmax;
      if (this.owner.neighbour1) {
        maxVal = this.owner.neighbour1.x;
      }
      if (x > maxVal) {
        let inverseSlope = relX / relY;
        let xDistance = maxVal - this.owner.x;
        let yDistance = xDistance / inverseSlope;
        this.updatePosition(
          maxVal,
          this.owner.y + yDistance,
          (force = true),
          (updatePartner = false)
        );

        return;
      }
      if (x < this.owner.x) {
        this.updatePosition(
          this.owner.x,
          y,
          (force = true),
          (updatePartner = false)
        );
        return;
      }
    }
  }

  draw() {
    gCtx.save();
    gCtx.beginPath();
    gCtx.globalAlpha = 0.3;
    gCtx.moveTo(xTransform(this.owner.x), yTransform(this.owner.y));
    gCtx.lineTo(xTransform(this.x), yTransform(this.y));
    gCtx.stroke();
    gCtx.moveTo(xTransform(this.x), yTransform(this.y));
    gCtx.arc(
      xTransform(this.x),
      yTransform(this.y),
      this.RADIUS,
      0,
      2 * Math.PI
    );
    gCtx.stroke();

    gCtx.restore();
  }
  highlight() {
    gCtx.save();
    gCtx.beginPath();
    gCtx.arc(
      xTransform(this.x),
      yTransform(this.y),
      this.SELECT_RADIUS,
      0,
      2 * Math.PI
    );
    gCtx.stroke();
    gCtx.restore();
  }
}

class Line {
  constructor(points) {
    // If points is not provided, use empty object
    this.points = {};
    for (let pointX of Object.keys(points)) {
      let point = points[pointX];
      let newPoint = this.newPoint(point.x, point.y, point.cpt0, point.cpt1);
    }
  }

  newPoint(x, y, cpt0 = null, cpt1 = null) {
    if (this.points[x]) {
      this.deletePoint(x);
    }
    let point = new Point(x, y, this, (cpt0 = cpt0), (cpt1 = cpt1));
    let candidate;
    let previousCandidate;
    if (this.sorted.length > 0) {
      for (let candidateX of this.sorted) {
        previousCandidate = candidate;
        candidate = this.points[candidateX];
        if (candidate.x > point.x) {
          point.neighbour0 = previousCandidate;
          point.neighbour1 = candidate;
          break;
        }
      }
      if (candidate.x < point.x) {
        point.neighbour0 = candidate;
      }
    }

    this.points[x] = point;
    return point;
  }

  deletePoint(x) {
    let point = this.points[x];

    if (point.neighbour0) {
      point.neighbour0.neighbour1 = point.neighbour1;
    }
    if (point.neighbour1) {
      point.neighbour1.neighbour0 = point.neighbour0;
    }
    delete this.points[x];
  }

  deleteAllPoints() {
    for (let x of Object.keys(this.points)) {
      this.deletePoint(x);
    }
  }

  get sorted() {
    let sorted = Object.keys(this.points);
    sorted.sort((n1, n2) => n1 - n2);
    return sorted;
  }

  draw() {
    // Path
    gCtx.beginPath();
    let start = true;
    let point;
    let prevPoint;
    gCtx.save();
    gCtx.lineWidth = 3;
    if (this.sorted.length > 0) {
      for (let x of this.sorted) {
        point = this.points[x];
        if (start) {
          start = false;
          gCtx.save();
          gCtx.globalAlpha = 0.4;
          gCtx.lineWidth = 2;
          gCtx.moveTo(xTransform(xmin), yTransform(point.y));
          gCtx.lineTo(xTransform(point.x), yTransform(point.y));
          gCtx.stroke();
          gCtx.restore();
          gCtx.beginPath();
          gCtx.moveTo(xTransform(point.x), yTransform(point.y));
        } else {
          gCtx.bezierCurveTo(
            xTransform(prevPoint.cpt1.x),
            yTransform(prevPoint.cpt1.y),
            xTransform(point.cpt0.x),
            yTransform(point.cpt0.y),
            xTransform(point.x),
            yTransform(point.y)
          );
        }
        prevPoint = point;
      }
      gCtx.stroke();
      gCtx.save();
      gCtx.globalAlpha = 0.4;
      gCtx.lineWidth = 2;
      gCtx.beginPath();
      gCtx.moveTo(xTransform(point.x), yTransform(point.y));
      gCtx.lineTo(xTransform(xmax), yTransform(point.y));
      gCtx.stroke();
      gCtx.restore();
    }
    gCtx.restore();

    // Circles
    for (let x of this.sorted) {
      point = line.points[x];
      point.drawLabel();
      point.draw();
    }
  }

  get export() {
    let bezier_curve = {};
    if (Object.keys(this.points).length == 1) {
      let point = this.points[Object.keys(this.points)[0]];
      bezier_curve[point["xVal"]] = {
        x: point["xVal"],
        y: point["yVal"],
      };
    }
    for (let i = 0; i < Object.keys(this.points).length - 1; i++) {
      let point1 = this.points[Object.keys(this.points)[i]];
      let point2 = this.points[Object.keys(this.points)[i + 1]];
      bezier_curve = {
        ...bezier_curve,
        ...getEvenSpacedBezier(
          point1.x,
          point1.y,
          point1.cpt1.x,
          point1.cpt1.y,
          point2.cpt0.x,
          point2.cpt0.y,
          point2.x,
          point2.y
        ),
      };
    }

    let json = {};
    for (let x of Object.keys(this.points)) {
      json[x] = {
        x: parseInt(x),
        y: this.points[x].y,
        cpt0: { x: this.points[x].cpt0.x, y: this.points[x].cpt0.y },
        cpt1: { x: this.points[x].cpt1.x, y: this.points[x].cpt1.y },
      };
    }

    return { with_cpts: json, without_cpts: bezier_curve };
  }
}

///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
var parameterName = document.querySelector("#promptname").value;
const parameterInitialValues = "{}";
var xminDefault = 0;
var xmaxDefault = 100;
var yminDefault = -1;
var ymaxDefault = 2;
const xminInput = document.querySelector("#xmin");
const xmaxInput = document.querySelector("#xmax");
const yminInput = document.querySelector("#ymin");
const ymaxInput = document.querySelector("#ymax");

xminInput.value = 0;
xmaxInput.value = 100;
yminInput.value = -1;
ymaxInput.value = 2;
function zoomToTextBoxes() {
  zoom(
    parseFloat(xminInput.value),
    parseFloat(yminInput.value),
    parseFloat(xmaxInput.value),
    parseFloat(ymaxInput.value),
    false
  );
}
xminInput.onchange = zoomToTextBoxes;
xmaxInput.onchange = zoomToTextBoxes;
yminInput.onchange = zoomToTextBoxes;
ymaxInput.onchange = zoomToTextBoxes;
var xmin = xminDefault;
var xmax = xmaxDefault;
var ymin = yminDefault;
var ymax = ymaxDefault;

const decimalPrecision = 2;
const gCanvas = document.querySelector("#curve");
var { width, height } = gCanvas;
var graphxmin;
var graphymin;
var graphxmax;
var graphymax;
function setCanvasWidth() {
  gCanvas.setAttribute("width", gCanvas.parentNode.clientWidth * 0.9);
  gCanvas.setAttribute("height", gCanvas.width / 2);
  width = gCanvas.width;
  height = gCanvas.height;
  graphxmin = 30;
  graphymin = 10;
  graphxmax = width - 10;
  graphymax = height - 30;
}
setCanvasWidth();
const gCtx = gCanvas.getContext("2d");
gCtx.font = "20px";
window.addEventListener("resize", function (event) {
  setCanvasWidth();
  resetCanvas();
});

const liveLabelPosition = {
  x: xGraphspaceToScreenspace(10),
  y: yGraphspaceToScreenspace(30),
};

let jsonLineVals = JSON.parse(parameterInitialValues);
const line = new Line(jsonLineVals);

const inputTextArea = document.querySelector("#input");
const loadButton = document.querySelector("#load");
loadButton.onclick = () => {
  load(inputTextArea.value);
};
function load(string) {
  try {
    let keyFrames = parseKeyFrames(string);
    line.deleteAllPoints();
    for (let keyFrame of keyFrames) {
      line.newPoint(keyFrame["x"], keyFrame["y"]);
    }
  } catch (e) {
    console.log("bad format for key frame string");
  }
  resetCanvas();
}

const addInput = document.querySelector("#add");
const removeInput = document.querySelector("#remove");
const editInput = document.querySelector("#edit");
const zoomInput = document.querySelector("#zoom");
const logscaleCheckbox = document.querySelector("#logscale");
const zoomReset = document.querySelector("#zoomreset");
const output = document.querySelector("#output");
output.onclick = () => {output.select()};
// const copy = document.querySelector("#copy");
addInput.onchange = handleModeChange;
removeInput.onchange = handleModeChange;
editInput.onchange = handleModeChange;
zoomInput.onchange = handleModeChange;
logscaleCheckbox.onchange = () => {
  gLogscale = logscaleCheckbox.checked;
  resetCanvas();
};
function resetZoom() {
  zoom(xminDefault, yminDefault, xmaxDefault, ymaxDefault, false);
}
zoomReset.onclick = () => {
  resetZoom();
};
document.querySelector("#promptname").onchange = () => {
  parameterName = document.querySelector("#promptname").value;
  resetCanvas();
  updateOutput();
};

const pytti = document.querySelector("#pytti");
const fps = document.querySelector("#fps");
fps.value = 12;

pytti.onchange = () => {updateOutput()};
fps.onchange = () => {updateOutput()};
// copy.onclick = () => {
//   window.prompt("Copy to clipboard: Ctrl+C, Enter", output.innerHTML);
// };

function drawInterface() {
  gCtx.save();
  gCtx.beginPath();
  gCtx.rect(
    xGraphspaceToScreenspace(0),
    yGraphspaceToScreenspace(0),
    xGraphspaceToScreenspace(width) - xGraphspaceToScreenspace(0),
    yGraphspaceToScreenspace(height) - yGraphspaceToScreenspace(0)
  );
  gCtx.stroke();
  gCtx.restore();
  // gCtx.fillText(
  //   `Parameter: ${parameterName}`,
  //   xGraphspaceToScreenspace(10),
  //   yGraphspaceToScreenspace(15)
  // );

  let origin = gLogscale ? 1 : 0;
  if (ymin < origin && origin < ymax) {
    gCtx.save();
    gCtx.beginPath();
    gCtx.globalAlpha = 0.1;
    gCtx.moveTo(graphxmin, yTransform(origin));
    gCtx.lineTo(graphxmax, yTransform(origin));
    gCtx.stroke();
    gCtx.restore();

    gCtx.save();
    gCtx.textAlign = "right";
    gCtx.fillText(origin, graphxmin - 5, yTransform(origin));
    gCtx.restore();
  }

  gCtx.save();
  gCtx.textAlign = "right";
  gCtx.fillText(
    parseFloat(yReverseTransform(graphymax)).toFixed(decimalPrecision),
    graphxmin - 5,
    graphymax
  );
  gCtx.fillText(
    parseFloat(yReverseTransform(graphymin)).toFixed(decimalPrecision),
    graphxmin - 5,
    graphymin
  );
  gCtx.textAlign = "center";
  gCtx.fillText(xmin, graphxmin, graphymax + 10);
  gCtx.fillText(xmax, graphxmax, graphymax + 10);
  gCtx.textAlign = "left";
  gCtx.restore();
}

function zoom(x1, y1, x2, y2, screenspace = true) {
  if (screenspace) {
    // TODO: This doesn't work with log scale on y
    xmin = xReverseTransform(x1 < x2 ? x1 : x2);
    xmax = xReverseTransform(x1 > x2 ? x1 : x2);
    ymin = yReverseTransform(y1 > y2 ? y1 : y2);
    ymax = yReverseTransform(y1 < y2 ? y1 : y2);
  } else {
    xmin = x1 < x2 ? x1 : x2;
    xmax = x1 > x2 ? x1 : x2;
    ymin = y1 < y2 ? y1 : y2;
    ymax = y1 > y2 ? y1 : y2;
  }
  gZoom1 = undefined;
  xminInput.value = xmin;
  xmaxInput.value = xmax;
  yminInput.value = parseFloat(ymin).toFixed(decimalPrecision);
  ymaxInput.value = parseFloat(ymax).toFixed(decimalPrecision);
  resetCanvas();
}

document.addEventListener("keydown", shortcut);
function shortcut(e) {
  switch (e.key) {
    case "1":
      addInput.checked = true;
      gState = Mode.kAdding;
      break;
    case "2":
      removeInput.checked = true;
      gState = Mode.kRemoving;
      break;
    case "3":
      editInput.checked = true;
      gState = Mode.kEditing;
      break;
    case "4":
      zoomInput.checked = true;
      gState = Mode.kZooming;
      break;
  }
}

var Mode = {
  kAdding: { value: 0, name: "Adding" },
  kRemoving: { value: 1, name: "Removing" },
  kEditing: { value: 2, name: "Editing" },
  kDragging: { value: 3, name: "Dragging" },
  kZooming: { value: 4, name: "Zooming" },
};
var gState = Mode.kAdding;
var gPrevState;
var gSelected;
var gDisableTool;
var gZoom1;
var gLogscale = logscaleCheckbox.checked;
addInput.checked = true;
function handleModeChange() {
  gPrevState = gState;
  let mode = document.querySelector("input[name=mode]:checked").value;
  switch (mode) {
    case "add":
      gState = Mode.kAdding;
      break;
    case "remove":
      gState = Mode.kRemoving;
      break;
    case "edit":
      gState = Mode.kEditing;
      break;
    case "zoom":
      gState = Mode.kZooming;
      break;
  }
}

gCanvas.addEventListener("mousedown", handleDown, false);
gCanvas.addEventListener("mousemove", handleMove, false);
gCanvas.addEventListener("mouseup", handleUp, false);

resetCanvas();

function getMousePosition(e) {
  var x;
  var y;
  if (e.pageX != undefined && e.pageY != undefined) {
    x = e.pageX;
    y = e.pageY;
  } else {
    x =
      e.clientX +
      document.body.scrollLeft +
      document.documentElement.scrollLeft;
    y =
      e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
  }
  x -= gCanvas.offsetLeft;
  y -= gCanvas.offsetTop;

  return new Point(x, y);
}

function transformCoord(coordIn, minIn, maxIn, minOut, maxOut) {
  let progression = (coordIn - minOut) / (maxOut - minOut);
  let coordOut = progression * (maxIn - minIn) + minIn;
  return coordOut;
}

function yScreenspaceToGraphspace(yIn) {
  return transformCoord(yIn, 0, height, graphymin, graphymax);
}

function yGraphspaceToScreenspace(yIn) {
  return transformCoord(yIn, graphymin, graphymax, 0, height);
}

function xScreenspaceToGraphspace(xIn) {
  let xOut = transformCoord(xIn, 0, width, graphxmin, graphxmax);
  return xOut;
}

function xGraphspaceToScreenspace(xIn) {
  return transformCoord(xIn, graphxmin, graphxmax, 0, width);
}

function yTransform(yParamspace) {
  let yGraphspace;
  if (gLogscale) {
    yParamspace = Math.log2(yParamspace);
    yGraphspace = transformCoord(yParamspace, height, 0, ymin, ymax);
  } else {
    yGraphspace = transformCoord(yParamspace, height, 0, ymin, ymax);
  }
  let yScreenspace = yGraphspaceToScreenspace(yGraphspace);
  return yScreenspace;
}

function yReverseTransform(yScreenspace) {
  let yGraphspace = yScreenspaceToGraphspace(yScreenspace);
  let yParamspace;
  if (gLogscale) {
    yParamspace = transformCoord(yGraphspace, ymin, ymax, height, 0);
    yParamspace = Math.pow(2, yParamspace);
  } else {
    yParamspace = transformCoord(yGraphspace, ymin, ymax, height, 0);
  }
  return yParamspace;
}

function xTransform(xParamspace) {
  let xGraphspace = transformCoord(xParamspace, 0, width, xmin, xmax);
  let xScreenspace = xGraphspaceToScreenspace(xGraphspace);
  return xScreenspace;
}

function xReverseTransform(xScreenspace, round = true) {
  let xGraphspace = xScreenspaceToGraphspace(xScreenspace);
  let xParamspace = transformCoord(xGraphspace, xmin, xmax, 0, width);
  if (round) {
    return Math.round(xParamspace);
  }
  return xParamspace;
}

function closest(goal, counts) {
  return counts.reduce(function (prev, curr) {
    return Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev;
  });
}

function selectableCpt(pos) {
  // Returns the first control point found where pos is within the selection radius,
  // or the minimum distance point as a fallback
  let minDist;
  let minDistPoint;
  let d_x;
  let d_y;
  let d;
  for (let pointX of line.sorted) {
    let point = line.points[pointX];
    if (point.cpt0) {
      d_x = pos.x - xTransform(point.cpt0.x);
      d_y = pos.y - yTransform(point.cpt0.y);
      d = Math.hypot(d_x, d_y);
      if (d < point.cpt0.SELECT_RADIUS) {
        return point.cpt0;
      }
      if (typeof minDist === "undefined" || d < minDist) {
        minDist = d;
        minDistPoint = point.cpt0;
      }
    }
    if (point.cpt1) {
      d_x = pos.x - xTransform(point.cpt1.x);
      d_y = pos.y - yTransform(point.cpt1.y);
      d = Math.hypot(d_x, d_y);
      if (d < point.cpt1.SELECT_RADIUS) {
        return point.cpt1;
      }
      if (typeof minDist === "undefined" || d < minDist) {
        minDist = d;
        minDistPoint = point.cpt1;
      }
    }
  }
  return minDistPoint;
}

function cursor(x, y) {
  gCtx.save();
  gCtx.beginPath();
  gCtx.setLineDash([5, 15]);
  gCtx.moveTo(x, yGraphspaceToScreenspace(0));
  gCtx.lineTo(x, yGraphspaceToScreenspace(height));
  gCtx.moveTo(xGraphspaceToScreenspace(0), y);
  gCtx.lineTo(xGraphspaceToScreenspace(width), y);
  gCtx.textAlign = "right";
  gCtx.fillText(
    parseFloat(yReverseTransform(y)).toFixed(decimalPrecision),
    xGraphspaceToScreenspace(0) - 5,
    y
  );
  (gCtx.textAlign = "center"),
    gCtx.fillText(
      xReverseTransform(x),
      x,
      yGraphspaceToScreenspace(height) + 10
    );
  gCtx.stroke();
  gCtx.restore();
}
function resetCanvas() {
  gCtx.clearRect(0, 0, width, height);
  line.draw();
  drawInterface();
}
function handleDown(e) {
  if (!gDisableTool) {
    var pos = getMousePosition(e);
    let closestX;
    let closestPoint;
    switch (gState.name) {
      case "Adding":
        let addedPoint = line.newPoint(
          xReverseTransform(pos.x),
          yReverseTransform(pos.y)
        );
        gSelected = addedPoint.cpt1;
        gPrevState = gState;
        gState = Mode.kDragging;
        break;
      case "Removing":
        closestX = closest(xReverseTransform(pos.x), Object.keys(line.points));
        line.deletePoint(closestX);
        break;
      case "Editing":
        gSelected = selectableCpt(pos);
        if (gSelected) {
          gPrevState = gState;
          gState = Mode.kDragging;
        }
        break;
      case "Zooming":
        gZoom1 = pos;
        break;
    }
    handleMove(e);
  }
}

function updateOutput() {
  let string = "";

  console.log(Object.keys(line.export["without_cpts"]));
  for (let ind of Object.keys(line.export["without_cpts"])) {
    let el = line.export["without_cpts"][ind];
    if (parameterName.length == 0) {
      string = string.concat(
        `${el["x"]}: (${parseFloat(el["y"]).toFixed(decimalPrecision)})`
      );
    } else {
      string = string.concat(
        `${el["x"]}: (${parameterName}: ${parseFloat(el["y"]).toFixed(
          decimalPrecision
        )})`
      );
    }
    if (ind < Object.keys(line.export["without_cpts"]).slice(-1)[0]) {
      string = string.concat(", ");
    }
  }
  if (pytti.checked) {
    output.innerHTML = `(lambda fps, kf: kf[min(kf, key=lambda x:abs(x-int(round(t * fps, 0))))])(${fps.value}, {${string}})`;
  } else {
    output.innerHTML = string;
  }
  // try {
  //     google.colab.kernel.invokeFunction('notebook.AssignValues', [line.export, parameterName], {});
  // } catch (error) {
  //     // If we are not runnning in colab
  //     var kernel = IPython.notebook.kernel;
  //     let command1 = `value = {int(key): val for key, val in ${JSON.stringify(line.export)}.items()}`
  //     let command2 = `parameter_dicts_with_cpts['${parameterName}'] = value`
  //     let command3 = `parameter_dicts['${parameterName}'] = {key0: val0['y'] for key0, val0 in value.items()}`;
  //     kernel.execute(command1 + '; ' + command2 + '; ' + command3);
  // }
}

function handleUp(e) {
  if (!gDisableTool) {
    var pos = getMousePosition(e);
    if (gState == Mode.kDragging) {
      gSelected = undefined;
      gState = gPrevState;
    } else if (gState == Mode.kZooming) {
      zoom(gZoom1.x, gZoom1.y, pos.x, pos.y, true);
    }
    drawStateStuff(pos);
    updateOutput();
  }
}
function drawStateStuff(pos) {
  resetCanvas();
  switch (gState.name) {
    case "Adding":
      cursor(xTransform(xReverseTransform(pos.x)), pos.y);
      gCtx.save();
      gCtx.fillText(
        `Adding point: ${xReverseTransform(pos.x)}, ${parseFloat(
          yReverseTransform(pos.y)
        ).toFixed(decimalPrecision)}`,
        liveLabelPosition.x,
        liveLabelPosition.y
      );
      gCtx.restore();
      break;
    case "Removing":
      if (Object.keys(line.points).length > 0) {
        let closestX = closest(
          xReverseTransform(pos.x),
          Object.keys(line.points)
        );
        let closestPoint = line.points[closestX];
        closestPoint.highlight();

        cursor(xTransform(closestPoint.x), yTransform(closestPoint.y));

        gCtx.save();
        gCtx.fillText(
          `Removing point: ${closestPoint.x}, ${parseFloat(
            closestPoint.y
          ).toFixed(decimalPrecision)}`,
          liveLabelPosition.x,
          liveLabelPosition.y
        );
        gCtx.restore();
      } else {
        gCtx.save();
        gCtx.fillText(
          "Removing point: No points to remove",
          liveLabelPosition.x,
          liveLabelPosition.y
        );
        gCtx.restore();
      }
      break;
    case "Editing":
      let selectable = selectableCpt(pos);
      if (selectable) {
        selectable.highlight();

        cursor(xTransform(selectable.x), yTransform(selectable.y));

        gCtx.save();
        gCtx.fillText(
          `Editing control point: ${parseFloat(selectable.x).toFixed(
            decimalPrecision
          )}, ${parseFloat(selectable.y).toFixed(decimalPrecision)}`,
          liveLabelPosition.x,
          liveLabelPosition.y
        );
        gCtx.restore();
      }
      break;
    case "Dragging":
      gSelected.highlight();

      cursor(xTransform(gSelected.x), yTransform(gSelected.y));

      gCtx.save();
      gCtx.fillText(
        `Dragging control point: ${parseFloat(
          xReverseTransform(pos.x, false)
        ).toFixed(decimalPrecision)}, ${parseFloat(
          yReverseTransform(pos.y)
        ).toFixed(decimalPrecision)}`,
        liveLabelPosition.x,
        liveLabelPosition.y
      );
      gCtx.restore();
      break;
    case "Zooming":
      if (typeof gZoom1 !== "undefined") {
        resetCanvas();
        gCtx.save();
        gCtx.beginPath();
        gCtx.setLineDash([5, 5]);
        gCtx.rect(gZoom1.x, gZoom1.y, pos.x - gZoom1.x, pos.y - gZoom1.y);
        gCtx.stroke();
        gCtx.setLineDash([]);
        gCtx.restore();
      } else {
        cursor(pos.x, pos.y);
      }
      gCtx.fillText(`Zooming`, liveLabelPosition.x, liveLabelPosition.y);
      break;
  }
}
function handleMove(e) {
  var pos = getMousePosition(e);
  if (
    pos.x < graphxmin ||
    pos.x > graphxmax ||
    pos.y < graphymin ||
    pos.y > graphymax
  ) {
    gDisableTool = true;
  } else {
    gDisableTool = false;
  }
  if (!gDisableTool) {
    let updatePartner;
    switch (gState.name) {
      case "Dragging":
        resetCanvas();
        gSelected.updatePosition(
          xReverseTransform(pos.x, false),
          yReverseTransform(pos.y),
          gPrevState.name != "Adding",
          gPrevState.name == "Adding"
        );
        break;
    }
    drawStateStuff(pos);
  }
}

// Mathematical functions
function getBezierXY(t, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey) {
  return {
    x:
      Math.pow(1 - t, 3) * sx +
      3 * t * Math.pow(1 - t, 2) * cp1x +
      3 * t * t * (1 - t) * cp2x +
      t * t * t * ex,
    y:
      Math.pow(1 - t, 3) * sy +
      3 * t * Math.pow(1 - t, 2) * cp1y +
      3 * t * t * (1 - t) * cp2y +
      t * t * t * ey,
  };
}
function getBezierT(
  x,
  sx,
  sy,
  cp1x,
  cp1y,
  cp2x,
  cp2y,
  ex,
  ey,
  precision = 0.01
) {
  // Use bisection to find the t associated with a specific x.
  // Only works because t->x is a monotonic function in this context.
  let params = [sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey];
  if (getBezierXY(0, ...params)["x"] >= x) {
    return 0;
  }
  if (getBezierXY(1, ...params)["x"] <= x) {
    return 1;
  }

  let guess = 0.5;
  for (let i = 1; i < 50; i++) {
    let delta = x - getBezierXY(guess, ...params)["x"];
    if (Math.abs(delta) < precision) {
      return guess;
    } else if (delta > 0) {
      guess = guess + Math.pow(0.5, i);
    } else {
      guess = guess - Math.pow(0.5, i);
    }
  }
  console.log("Warning: Did not converge");
  return guess;
}

function getEvenSpacedBezier(sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey) {
  let params = [sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey];
  let bezier = {};
  for (let x = sx; x <= ex; x++) {
    let t = getBezierT(x, ...params);
    let { _, y } = getBezierXY(t, ...params);
    bezier[x] = { x: x, y: y };
  }
  return bezier;
}

function parseKeyFrames(string) {
  let frames = [];
  let framestrings = string.split(",");
  // Remove whitespace-only elements
  framestrings = framestrings.filter((el) => /\S/.test(el));
  let re = /((?<frame>[0-9]+):[\s]*[\(](?<param>[\S\s]*?)[\)])/;
  for (let framestring of framestrings) {
    let frame = {};
    let match = re.exec(framestring);
    frame["x"] = parseInt(match.groups.frame);
    if (isNaN(match.groups.param)) {
      // Right now this only supports single text prompts
      frame["y"] = parseFloat(match.groups.param.split(":")[1]);
    } else {
      frame["y"] = parseFloat(match.groups.param);
    }
    frames.push(frame);
  }
  return frames;
}
