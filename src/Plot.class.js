/*global console, Tools, HTMLElement, document, Vector, Image, Tree2d, HTMLImageElement*/

// Bugs:    - Histogrammes ne fonctionnent pas avec des valeurs négatives
//          - legend quand stroke est donné par default
//
// To do:   - verifier les arguments des fonctions, throw Error si invalides
//          - doc
//          - curseur en croix sur tout le graphe
//          - events à creer :
//               - 'changeaxis' pour pouvoir asservir plusieurs plot à
//                 une vue donnée.
//               - 'addcurve' lorsqu'une courbe est ajoutée
//               - 'removecurve' lorsqu'une courbe est supprimée
//               - 'resize' lorsque le plot est redimensionné.
//               - 'onselect' lorsque une courbe est selectionnée, texte en
//                  rouge dans la légende.

/*
 * @fileOverview Plot class and base function.
 * @author <a href="mailto:gtartavel@gmail.com">Guillaume Tartavel</a>
 * @author <a href="mailto:baptiste.mazin@gmail.com">Baptiste Mazin</a>
 */
import Matrix, {
    MatrixView,
    Check
} from "../../JSNA/src/Matrix.class.js";

import Tools from "./Plot.tools.js";
import Tree2d from "./Tree2d.class.js";


////////////////////////////////////////////////////////////////////////////
//                               CONSTRUCTOR                              //
////////////////////////////////////////////////////////////////////////////


/**
 * @class
 *  Create a new plot.
 * @constructor
 *  Plot is a JavaScript class allowing user to dynamically generating chart
 *  SVG chart.
 *
 *     // Create a new Plot
 *     var myPlot = new Plot('myPlot', 400, 400)
 *     // Insert plot into web page
 *     document.body.appendChild (myPlot.getDrawing ());
 *     // Add an Histogram
 *     var histogramProperties = {
 *        'id': 'myHistogram',
 *        'fill': 'lightseagreen',
 *        'stroke': 'lightslategray',
 *        'stroke-width': 4,
 *        'rx': 0.1,
 *        'ry': 0.1
 *     };
 *     myPlot.addHistogram([1,2,3,4,5], [4,6,7,1,5], histogramProperties);
 *     // Add a new Path
 *     var pathProperties = {
 *        'id': 'myPath',
 *        'stroke': 'green',
 *        'stroke-width': 2,
 *        'stroke-dasharray': '5 2'
 *     };
 *     myPlot.addPath([1, 2, 3, 4, 5],
 *                    [7, 4, 5, 8, 2],
 *                    pathProperties);
 *     // Add a new scatter plot
 *     var scatterProperties = {
 *        'id': 'myScatter',
 *        'stroke': 'blue',
 *        'marker': {'shape': 'circle',
 *                   'fill': 'white',
 *                   'stroke-width': 0.5,
 *                   'stroke': 'red',
 *                   'size': 3
 *                  }
 *     };
 *     myPlot.addPath([1, 2, 3, 4, 5],
 *                     [3, 2, 2, 7, 1],
 *                     scatterProperties);
 *     myPlot.setTitle('My plot !');
 *
 * @param {String} id
 *  Plot identifiant.
 * @param {Number} width
 *  Plot width.
 * @param {Number} height
 *  Plot height
 * @param {Object} args
 *  Plot arguments
 * @return {Object}
 *  The new plot.
 *
 */
function Plot(id = 'plot 1', size, parent, args = {}) {
    var width, height;
    if (typeof size === Number) {
        width = size;
        height = size;
    } else if (size instanceof Array && size.length === 2) {
        [width, height] = size;
    }
    if (parent) {
        if (!(parent instanceof HTMLElement)) {
            parent = document.getElementById(parent);
            parent = parent || document.body;
        }
        if (!size) {
            let resize = () => {
                this.setWidth(parent.clientWidth);
                this.setHeight(parent.clientHeight);
                this.autoDisplay();
            };
            window.addEventListener("resize", resize);
            width = parent.clientWidth;
            height = parent.clientHeight;
        }
    }

    let param = {
        'width': width,
        'height': height,
        'id': id
    };
    let drawing = Tools.createSVGNode('svg', param);
    // Allow to retrieve plot from SVG element;
    drawing.getPlot = () => this;

    /** Returns parent node if defined.
     * @return {Object}
     */
    this.getParentNode = () => parent;

    /** Returns the plot id.
     * @return {String}
     */
    this.getId = () => id;

    /** Returns the width of the plot.
     * @return {Number}
     */
    this.getWidth = () => parseFloat(drawing.getAttribute('width'));

    /** Set the width of the plot.
     * @param {Number} w
     * @chainable
     */
    this.setWidth = w => {
        drawing.setAttributeNS(null, 'width', w);
        this.autoDisplay();
        return this;
    };

    /** Returns the width of the plot.
     * @return {Number}
     */
    this.getHeight = () => parseFloat(drawing.getAttribute('height'));

    /** Set the width of the plot.
     * @param {Number} w
     * @chainable
     */
    this.setHeight = h => {
        drawing.setAttributeNS(null, 'height', h);
        this.autoDisplay();
        return this;
    };

    /** Returns the svg element associeted to the plot.
     * @return {Object}
     */
    this.getDrawing = () => drawing;

    let currentAxis = {
        'x': 0,
        'y': 0,
        'width': 1,
        'height': 1
    };

    /** Returns the current axisof the plot.
     * @return {Object}
     *  Object with the following properties :
     *
     * + x,
     * + y,
     * + width,
     * + height.
     */
    this.getCurrentAxis = () => Object.assign({}, currentAxis);

    /** Set the current axis of the plot.
     * @param {Object} BBox
     *  Object with the following properties :
     *
     * + x,
     * + y,
     * + width,
     * + height.
     *
     * @chainable
     */
    this.setCurrentAxis = BBox => {
        Object.assign(currentAxis, BBox);
        return this;
    };

    // Plot specific properties
    let ownProperties = this.getProperties('ownProperties');

    /** Get a property of the plot.
     * @param {String} name
     * @return {String}
     */
    this.getOwnProperty = name => ownProperties[name];

    /** Set a property of the plot.
     * @param {String} name
     * @param {String} value
     * @chainable
     */
    this.setOwnProperty = function(name, value) {
        ownProperties[name] = value;
        this.autoDisplay();
        return this;
    };

    Object.assign(ownProperties, args);

    // Init svg element
    this.initialize();
    return this;
}

/////////////////////////////////////////////////////////////////////////////////
//                              DEFAULT PROPERTIES                             //
/////////////////////////////////////////////////////////////////////////////////

/**
 * Object describing defaults properties of plot's elements.
 */
Plot.prototype.properties = {
    'ownProperties': {
        // Force to conserve x/y = 1
        'preserve-ratio': false,
        // Display ticks.
        'ticks-display': true,
        // Display Title.
        'title-display': false,
        // Display x label.
        'xLabel-display': false,
        // Display y label.
        'yLabel-display': false,
        // Display Legend.
        'legend-display': 'none',
        // Below are private properties
        // Create a tree for efficient nearest neighbor.
        'compute-closest': true,
        // Used for curves auto-id
        'autoId-curves': 0,
        // Used for marker auto-id
        'autoId-marker': 0
    },
    'title': {
        'id': 'title',
        'font-size': '16pt',
        'font-family': 'Sans-Serif',
        'fill': 'gray',
        'style': 'text-anchor: middle;'
    },
    'drawingArea': {
        'id': 'drawingArea',
        'preserveAspectRatio': 'none'
    },
    'front': {
        'id': 'front',
        'fill': 'white',
        'fill-opacity': 0,
        'stroke': 'none',
        'preserveAspectRatio': 'none'
    },
    'markers': {
        'id': 'markers'
    },
    'curves': {
        'id': 'curves',
        'preserveAspectRatio': 'none',
        'stroke-width': 1,
        'stroke-linejoin': 'round',
        'stroke': 'blue',
        'fill': 'blue'
    },
    'axis': {
        'id': 'axis',
        'stroke': 'grey',
        'stroke-width': 1,
        'font-size': '10pt',
        'font-family': 'Sans-Serif'
    },
    'grid': {
        'id': 'grid',
        'stroke': 'grey',
        'stroke-width': 1,
        'stroke-dasharray': '5 2'
    },
    'xAxis': {
        'id': 'xAxis',
        'style': 'text-anchor: middle;'
    },
    'yAxis': {
        'id': 'yAxis',
        'style': 'text-anchor: end;'
    },
    'xAxisLine': {
        'id': 'xAxisLine',
        'marker-mid': 'url(#tickMarker)'
    },
    'xAxisLineBis': {
        'id': 'xAxisLineBis',
        'marker-mid': 'url(#tickMarker)'
    },
    'yAxisLine': {
        'id': 'yAxisLine',
        'marker-mid': 'url(#tickMarker)'
    },
    'yAxisLineBis': {
        'id': 'yAxisLineBis',
        'marker-mid': 'url(#tickMarker)'
    },
    'cursor': {
        'id': 'cursor',
        'vector-effect': 'non-scaling-stroke',
        'marker': {
            'shape': 'circle',
            'size': 4,
            'stroke': 'grey',
            'stroke-width': 0.25,
            'fill': 'none'
        }
    },
    'xLabel': {
        'id': 'xLabel',
        'font-size': '12pt',
        'font-family': 'Sans-Serif',
        'font-style': 'oblique',
        'fill': 'gray',
        'style': 'text-anchor: middle;'
    },
    'yLabel': {
        'id': 'yLabel',
        'font-size': '12pt',
        'font-family': 'Sans-Serif',
        'font-style': 'oblique',
        'fill': 'gray',
        'style': 'text-anchor: middle;'
    },
    'ticks': {
        'id': 'tickMarker',
        'x1': 0,
        'y1': -2,
        'x2': 0,
        'y2': 2,
        'markerUnits': 'strokeWidth', //userSpaceOnUse',
        'overflow': 'visible',
        'orient': 'auto',
        'stroke-width': 1
    },
    'xTextTicks': {
        'id': 'xTextTicks',
        'fill': 'gray',
        'stroke': 'none'
    },
    'yTextTicks': {
        'id': 'yTextTicks',
        'fill': 'gray',
        'stroke': 'none'
    },
    'textTicks': {
        'fill': 'gray',
        'stroke': 'none'
    },
    'legend': {
        'id': 'legend',
        'font-size': '10pt',
        'font-family': 'Sans-Serif',
        'overflow': 'visible',
        'fill': 'gray',
        'stroke': 'none'
    },
    'selectArea': {
        'id': 'selectArea',
        'stroke': 'gray',
        'fill': 'none',
        'stroke-width': 1,
        'vector-effect': 'non-scaling-stroke',
        'preserveAspectRatio': 'none',
        'markerUnits': 'userSpaceOnUse',
        'overflow': 'visible'
    },
    'path': {
        'vector-effect': 'non-scaling-stroke',
        'fill': 'none'
    },
    'marker': {
        'shape': 'none',
        'fill': 'blue',
        'size': 1,
        'viewBox': "-1 -1 2 2",
        'class': 'scatterMarker',
        'preserveAspectRatio': 'none',
        'markerUnits': 'userSpaceOnUse',
        'overflow': 'visible'
    },
    'histogram': {
        'stroke': 'none',
        'vector-effect': 'non-scaling-stroke',
        'stroke-linejoin': 'round',
        'bar-width': 0.9
    },
    'image': {}
};

/////////////////////////////////////////////////////////////////////////////////
//                           CURVES MANAGEMENT FUNCTIONS                       //
/////////////////////////////////////////////////////////////////////////////////


/**
* Add a path to plot.
* @param {Array} x
*  Array of values on 'x' axis.
* @param {Array} y
*  Array of values on 'y' axis.
* @param {Object} [properties=this.getProperties('path')]
*  Curve Id and style properties.
* @return {Object}
*  This plot.
*
*  // Create a new Plot
*  let myPlot = new Plot ('myPlot', 300, 300)
*  // Insert plot into web page
*   document.body.appendChild (myPlot.getDrawing ());
*  // Add a new Path
*  let pathProperties = {
*     'id': 'myPath',
*     'stroke': 'green',
*     'stroke-width': 2,
*     'stroke-dasharray': '0.1 0.1',
*     'marker': {'shape': 'rect'
*                'fill': 'fuchsia'
*                'size': 3
*     }
*  };
*  myPlot.addPath ([1, 2, 3, 4, 5],
*                  [7, 4, 5, 8, 2],
*                  pathProperties);

*/
Plot.prototype.addPath = function(x, y, args) {

    x = x instanceof Matrix ? x.getData() : x;
    y = y instanceof Matrix ? y.getData() : y;

    if (x.includes(NaN) || y.includes(NaN)) {
        throw new Error("Plot.addPath: Data must not contain NaN values.")
    }
    if (x.includes(Infinity) || y.includes(Infinity) || x.includes(-Infinity) || y.includes(-Infinity)) {
        throw new Error("Plot.addPath: Data must not contain Infinity values.")
    }

    // Add (or replace) user arguments
    let defaultArgs = Object.assign(this.getProperties('path'), args);

    // First Node in the path
    let newPath = this.createPath(x, y, defaultArgs);

    let xVec = new Tools.Vector(x);
    let yVec = new Tools.Vector(y);
    newPath.BBox = [
        xVec.min().get(0),
        yVec.min().get(0),
        xVec.max().get(0),
        yVec.max().get(0)
    ];

    // Add the to the path list
    this.add(newPath, x, y);
    return this;
};

/**
 * Plot functions
 */
Plot.prototype.plot = function(y, x, str) {

    let errMsg = this.constructor.name + '.plot: ';
    let i, k;

    // Check arguments
    if (typeof y !== 'function') {
        if (x && !x.length) {
            throw new Error(errMsg + 'x must be an array');
        } else if (!(y && y.length)) {
            throw new Error(errMsg + 'y must be an array or a function');
        } else if (!(y[0].length)) {
            y = [y];
        }
    } else if (!(x && x.length)) {
        throw new Error(errMsg + 'if y is a function, x must be an array');
    } else {
        let f = y; // y is a function
        for (y = [[]], i = 0; i < x.length; i++) {
            y[0].push(f(x[i]));
        }
    }

    // Check dimensions
    let nLines = y.length;
    let nPts = y[0].length;
    if (!x) {
        for (x = [], i = 0; i < nPts; i++) {
            x.push(i + 1);
        }
    }
    for (k = 0; k < nLines; k++) {
        if (y[k].length !== x.length) {
            throw new Error(errMsg + 'y and x must have the same length');
        }
    }

    // Plot everything
    let args = Plot.stringToArgs(str);
    for (k = 0; k < nLines; k++) {
        this.addPath(x, y[k], args);
    }
    return this;
};

/**
 * Add an Histogram to plot.
 * @param {Array} x
 *  x values.
 * @param {Array} y
 *  y values.
 * @param {Object} [properties=this.getProperties ('scatter')]
 *  Scatter plot Id and style properties.
 *
 *  // Create a new Plot
 *  var myPlot = new Plot ('myPlot', 500, 500)
 *  // Add an Histogram
 *  var histogramProperties = {
 *     'id': 'myHistogram',
 *     'fill': 'lightseagreen',
 *     'stroke': 'lightslategray',
 *     'stroke-width': 4,
 *     'rx': 0.1,
 *     'ry': 0.1
 *  };
 *  myPlot.addHistogram([1,2,3,4,5], [4,6,7,1,5], histogramProperties);
 *  // Insert plot into web page
 *  document.body.appendChild (myPlot.getDrawing ());
 */
Plot.prototype.addHistogram = function(x, y, args) {
    x = x instanceof Matrix ? x.getData() : x;
    y = y instanceof Matrix ? y.getData() : y;

    x = x || new Vector(1, y.length);

    // Add (or replace) user arguments
    let defaultArgs = Object.assign(this.getProperties('histogram'), args);

    // Create histogram plot
    let histogram = Tools.createSVGNode('g', defaultArgs);
    histogram.setAttributeNS(null, 'class', 'histogram');

    // Define bar model
    let id = 'bar' + defaultArgs.id;
    let xp = new Tools.Vector(x);
    let widthMin = xp.derive().min().get(0);
    let barWidth = widthMin * defaultArgs['bar-width'];

    let colormap = defaultArgs.colormap;

    for (let j = y.length - 1; j >= 0; j--) {
        let rect = Tools.createSVGNode('rect', defaultArgs);
        rect.setAttributeNS(null, 'r', 1);
        rect.setAttributeNS(null, 'id', id);
        rect.setAttributeNS(null, 'class', 'histogramBar');
        rect.setAttributeNS(null, 'x', x[j] - barWidth / 2);
        rect.setAttributeNS(null, 'y', -y[j]);
        rect.setAttributeNS(null, 'height', y[j]);
        rect.setAttributeNS(null, 'width', barWidth);
        if (colormap) {
            let color = "hsl(" + (360 * j / (y.length - 1)) + ",100%,50%)";
            rect.setAttributeNS(null, 'fill', color);
        }
        histogram.appendChild(rect);
    }

    let xVec = new Tools.Vector(x);
    let yVec = new Tools.Vector(y);
    histogram.BBox = [
        xVec.min().get(0) - widthMin,
        0,
        xVec.max().get(0) + widthMin,
        yVec.max().get(0)
    ];

    this.add(histogram, x, y);
    return this;
};

/**
 * Add an raster image to plot.
 * @param {string} source
 *  Path to the image
 * @param {number} x
 *  x coordinate of top left corner
 * @param {number} y
 *  y coordinate of top left corner
 *
 *  // Create a new Plot
 *  var myPlot = new Plot ('myPlot', 500, 500)
 *  // Conserve x/y unity ratio
 *  myPlot.setOwnProperty('preserve-ratio', true);
 *  // Add a new image
 *  myPlot.addImage('../ImageJS/images/canard.png', 300, 500, {'id': 'myImage'});
 *  // Insert plot into web page
 *  document.body.appendChild (myPlot.getDrawing ());
 */
Plot.prototype.addImage = function(src, x = 0, y = 0, args) {
    let thisPlot = this;
    let onload = () => {
        let defaultArgs = Object.assign(thisPlot.getProperties('image'), args);

        defaultArgs.width = this.width;
        defaultArgs.height = this.height;
        defaultArgs.x = x;
        defaultArgs.y = -y;

        let image = Tools.createSVGNode('image', defaultArgs);
        image.setAttributeNS('http://www.w3.org/1999/xlink',
            'xlink:href', this.src);

        image.BBox = [x, -this.height + y, x + this.width, y];

        // Add the to the path list
        thisPlot.add(image, x, y);
    };


    if (typeof src === 'string') {
        let im = new Image();
        im.src = src;
        im.onload = onload;
    } else if (src instanceof HTMLImageElement) {
        onload.bind(src)();
    }

    return this;
};

/**
 * @private
 *  Add svg element and scale the graph.
 * @param {Object} obj
 *  object to add.
 * @return {Object}
 *  This plot.
 */
Plot.prototype.add = function(obj, x, y) {

    if (!obj.getAttribute('id')) {
        var n = this.getOwnProperty('autoId-curves');
        obj.setAttributeNS(null, 'id', 'curve-' + n);
        this.setOwnProperty('autoId-curves', n + 1);
    }

    this.getDrawing().getElementById('curves').appendChild(obj);
    this.setAxis();
    if (this.getOwnProperty('legend-display') !== 'none') {
        this.setLegend();
    }

    if (this.getOwnProperty('compute-closest')) {
        var i, tree = this.tree,
            end = x.length,
            id = obj.id;
        for (i = 0; i < end; i++) {
            tree.add(x[i], y[i], i, obj);
        }
    }
    return this;
};

/**
 * Remove element on plot.
 * @param {String} id
 *  ID of the element to remove.
 * @return {boolean}
 *  True if element is successfully removed, false otherwise.
 *
 *  // Add a new scatter plot
 *  var scatterProperties = {
 *     'id': 'myScatter',
 *  };
 *  myPlot.addScatter ([1, 2, 3, 4, 5],
 *                     [7, 4, 5, 8, 2],
 *                     scatterProperties);
 *  myPlot.remove ('myScatter')
 */
Plot.prototype.remove = function(id) {

    let curves = this.getDrawing().getElementById('curves');
    let find = false;
    if (curves.hasChildNodes()) {
        let curvesChilds = curves.childNodes;
        for (let i = 0; i < curvesChilds.length; i++) {
            if (curvesChilds[i].id === id) {
                if (this.getOwnProperty('compute-closest')) {
                    // Remove points in tree
                    this.tree.remove(curvesChilds[i]);
                }
                // Remove svg element
                curves.removeChild(curvesChilds[i]);
                find = true;
                break;
            }
        }
    }
    this.setAxis();
    this.setLegend();
    return find;
};

/**
 * Clear the plot.
 *
 *  // Remove all data
 *  myPlot.clear();
 */
Plot.prototype.clear = function() {

    if (this.getOwnProperty('compute-closest')) {
        this.tree.clear();
    }
    let curves = this.getDrawing().getElementById('curves');
    if (curves.hasChildNodes()) {
        while (curves.childNodes.length > 0) {
            curves.removeChild(curves.firstChild);
        }
    }
    this.setOwnProperty('autoId-curves', 0);
    this.setAxis();
    this.setLegend();
    return this;
};

/**
 * @private
 * Get defaults properties of an plot element.
 * @param {String} element
 *  Desired default properties element. Can be 'title',
 * 'drawingArea', 'curves', 'axis', 'textTicks', 'path', scatter'.
 * @return {Object}
 *  Object with copy of element properties.
 */
Plot.prototype.getProperties = function(element) {
    return Object.assign({}, this.properties[element]);
};

/**
 * @private
 * Create path.
 */
Plot.prototype.createPath = function (x, y, args) {

    // First Node in the path
    let points = '';
    for (let j = 0, L = x.length; j < L; j++) {
        points += x[j] + ',' + (-y[j]) + ' ';
    }

    // Create Polyline
    let path = Tools.createSVGNode('polyline', args);
    path.setAttributeNS(null, 'class', 'path');

    // Add point list as attribute
    path.setAttributeNS(null, 'points', points);

    this.setMarkerPath(path, args.marker);

    return path;
};

/**
 * @private
 *  Create a markerfor a new path.
 */
Plot.prototype.setMarkerPath = function (path, args) {
    let svg = this.getDrawing();
    let drawingArea = svg.getElementById('drawingArea');
    let markers = svg.getElementById('markers');
    let defaultArgs = Object.assign(this.getProperties('marker'), args);
    let idNumber = this.getOwnProperty('autoId-marker');
    this.setOwnProperty('autoId-marker', idNumber + 1);
    let id = this.getId() + 'marker_' + idNumber.toString();
    id = id.replace(/ /g, "_");
    defaultArgs.id = id;

    let marker = Tools.createSVGNode('marker', defaultArgs);
    markers.appendChild(marker);
    this.setMarkerShape(marker, defaultArgs.shape);

    path.setAttribute('marker-id', id);
    let markerUrl = 'url(#' + id + ')';
    path.setAttribute('marker-start', markerUrl);
    path.setAttribute('marker-mid', markerUrl);
    path.setAttribute('marker-end', markerUrl);
    return this;
};

/**
 * @private
 *  Set the marker base shape.
 *  Marker base sould be in following bounding box [-0.5, -0.5, 0.5, 0.5].
 */
Plot.prototype.setMarkerShape = function (marker, shape) {

    for (let i = 0; i < marker.childNodes.length; i++) {
        marker.removeChild(marker.childNodes[i]);
    }

    let shapeProperties;
    let markerShape;
    switch (shape.toLowerCase()) {
        case 'rect':
        case 'rectangle':
            shapeProperties = {
                'x': -1,
                'y': -1,
                'width': 2,
                'height': 2
            };
            markerShape = Tools.createSVGNode('rect', shapeProperties);
            break;
        case 'circle':
            shapeProperties = {
                'r': 1
            };
            markerShape = Tools.createSVGNode('circle', shapeProperties);
            break;
        case 'triangle':
            shapeProperties = {
                'points': "1.5, 0 -0.5, 1 -0.75, -1",
                'viewBox': "-0.5 -0.866 1 0.866"
            };
            markerShape = Tools.createSVGNode('polygon', shapeProperties);
            break;
        case 'none':
            return this;
        default:
            throw new Error('Plot.setMarkerShape: Unknown shape.');
    }
    marker.appendChild(markerShape);
    return this;
};

/////////////////////////////////////////////////////////////////////////////////
//                               AXIS FUNCTIONS                                //
/////////////////////////////////////////////////////////////////////////////////

/**
 * Define Axis.
 * @param {Array|Object|string} [box='auto']
 *  - If Array, box must be defined as '[x1,y1,x2,y2]'.
 *  - If Object, it must be specified as
 *  '{'x': x, 'y': -y, 'width': width, 'height': height}'
 *  - If string is used, then it must refer to an element id.
 * @return {Plot}
 *  This plot.
 *
 *  // Add a new scatter plot
 *  var scatterProperties = {
 *     'id': 'myScatter',
 *  };
 *  myPlot.addScatter ([1, 2, 3, 4, 5],
 *                     [7, 4, 5, 8, 2],
 *                     scatterProperties);
 *  // Set Axis with matlab like notations
 *  myPlot.setAxis ([-3, 2, 10, 10]);
 *  // Do the same
 *  myPlot.setAxis ({'x':-3, 'y':-2, 'width': 13, 'height': 12}]);
 *  // Automatic axis
 *  myPlot.setAxis ();
 */
Plot.prototype.setAxis = function (curvesBBox) {
    let svg = this.getDrawing();
    let drawingArea = svg.getElementById('drawingArea');
    let curves = svg.getElementById('curves');
    let w = drawingArea.width.baseVal.value,
        h = drawingArea.height.baseVal.value;

    let BBox, xlim, ylim;
    // Matlab like command
    if (curvesBBox instanceof Array) {
        let x = Math.min(curvesBBox[0], curvesBBox[2]);
        let y = Math.min(-curvesBBox[1], -curvesBBox[3]);
        let width = Math.max(curvesBBox[0], curvesBBox[2]) - x;
        let height = Math.max(-curvesBBox[1], -curvesBBox[3]) - y;
        BBox = {
            'x': x,
            'y': y,
            'width': width,
            'height': height
        };
        // Bounding box command
    } else if (curvesBBox instanceof Object) {
        BBox = curvesBBox;
        // Path bounding box
    } else if (typeof curvesBBox === 'string') {
        let curvesChilds = curves.childNodes;
        for (let i = 0; i < curvesChilds.length; i++) {
            if (curvesChilds[i].id === curvesBBox) {
                this.setAxis(curvesChilds[i].BBox);
                return this;
            }
        }
        // Automatic bounding box
    } else {
        BBox = this.getCurvesBBox();
    }

    if (this.getOwnProperty('preserve-ratio')) {
        // Compute the scale
        let hScale = BBox.width / w,
            vScale = BBox.height / h;
        let space;
        switch (Math.max(hScale, vScale)) {
            case hScale:
                space = BBox.height;
                BBox.height *= (hScale / vScale);
                BBox.y += (space - BBox.height) / 2;
                break;
            case vScale:
                space = BBox.width;
                BBox.width /= (hScale / vScale);
                BBox.x += (space - BBox.width) / 2;
                break;
        }
    }

    if (!BBox.width) {
        BBox.width = 1;
        BBox.x -= 0.5;
    }
    if (!BBox.height) {
        BBox.height = 1;
        BBox.y -= 0.5;
    }
    this.setCurrentAxis(BBox);
    let viewBox = BBox.x + ' ' + BBox.y + ' ' + BBox.width + ' ' + BBox.height;
    drawingArea.setAttributeNS(null, 'viewBox', viewBox);

    this.scaleElements();
    // Update front
    let bg = svg.getElementById('front');
    bg.setAttributeNS(null, 'x', BBox.x);
    bg.setAttributeNS(null, 'y', BBox.y);
    bg.setAttributeNS(null, 'width', BBox.width);
    bg.setAttributeNS(null, 'height', BBox.height);

    this.setXAxis();
    this.setYAxis();
    this.setLegendLocation();
    return this;
};

/**
 * @private
 *  Create xAxis view.
 */
Plot.prototype.setXAxis = function() {
    let svg = this.getDrawing();

    let xAxis = svg.getElementById('xAxis');
    let xAxisLine = svg.getElementById('xAxisLine');
    let xAxisLineBis = svg.getElementById('xAxisLineBis');

    let dArea = svg.getElementById('drawingArea');

    let BBoxCurves = this.getCurrentAxis();

    let BBox = {
        x: dArea.x.baseVal.value,
        y: dArea.y.baseVal.value,
        width: dArea.width.baseVal.value,
        height: dArea.height.baseVal.value
    };

    let xTextTicks = svg.getElementById('xTextTicks');
    while (xTextTicks.childNodes.length > 0) {
        xTextTicks.removeChild(xTextTicks.firstChild);
    }

    var i;
    var points = BBox.x + ',' + (BBox.y + BBox.height) + ' ';
    var pointsBis = BBox.x + ',' + BBox.y + ' ';
    if (this.getOwnProperty('ticks-display')) {
        var scale = BBox.width / BBoxCurves.width;
        var xLim = this.getAxisLimits(BBoxCurves.x, BBoxCurves.width, 2);
        var linspace = Tools.Vector.linearSpace;
        var ind = linspace(BBox.x + (xLim.min - BBoxCurves.x) * scale,
            BBox.x + (xLim.min - BBoxCurves.x + (xLim.nTicks - 1) * xLim.dTick) * scale,
            xLim.nTicks).data;

        for (i = 0; i < ind.length; i++) {
            points += ind[i] + ',' + (BBox.y + BBox.height) + ' ';
            pointsBis += ind[i] + ',' + BBox.y + ' ';
        }

        var exponent = xLim.e10;
        var tickText, textProp = this.getProperties('textTicks');
        textProp.y = BBox.y + BBox.height + 20;

        if (Math.abs(exponent) < 2) {
            exponent = 0;
        } else {
            textProp.x = BBox.x + BBox.width + 20;
            tickText = Tools.createSVGTextNode('10^' + exponent, textProp);
            tickText.setAttributeNS(null, 'font-weight', 'bold');
            xTextTicks.appendChild(tickText);
        }
        var val = linspace(xLim.min,
            xLim.min + (xLim.nTicks - 1) * xLim.dTick,
            xLim.nTicks).data;

        for (i = 0; i < ind.length; i++) {
            textProp.x = ind[i];
            val[i] = parseFloat((val[i] * Math.pow(10, -exponent)).toFixed(2));
            tickText = Tools.createSVGTextNode(val[i], textProp);
            xTextTicks.appendChild(tickText);
        }
    }
    points += (BBox.x + BBox.width) + ',' + (BBox.y + BBox.height) + ' ';
    xAxisLine.setAttributeNS(null, 'points', points);
    pointsBis += (BBox.x + BBox.width) + ',' + BBox.y + ' ';
    xAxisLineBis.setAttributeNS(null, 'points', pointsBis);
    return this;
};

/**
 * @private
 *  Create xAxis view.
 */
Plot.prototype.setYAxis = function() {

    let svg = this.getDrawing();

    let yAxis = svg.getElementById('yAxis');
    let yAxisLine = svg.getElementById('yAxisLine');
    let yAxisLineBis = svg.getElementById('yAxisLineBis');

    let dArea = svg.getElementById('drawingArea');

    let BBoxCurves = this.getCurrentAxis();

    let BBox = {
        x: dArea.x.baseVal.value,
        y: dArea.y.baseVal.value,
        width: dArea.width.baseVal.value,
        height: dArea.height.baseVal.value
    };

    let yTextTicks = svg.getElementById('yTextTicks');
    while (yTextTicks.childNodes.length > 0) {
        yTextTicks.removeChild(yTextTicks.firstChild);
    }

    let points = BBox.x + ',' + (BBox.y) + ' ';
    let pointsBis = (BBox.x + BBox.width) + ',' + (BBox.y) + ' ';
    if (this.getOwnProperty('ticks-display')) {
        let scale = BBox.height / BBoxCurves.height;
        let yLim = this.getAxisLimits(BBoxCurves.y, BBoxCurves.height, 2);
        let linspace = Tools.Vector.linearSpace;
        let ind = linspace(
            BBox.y + (yLim.min - BBoxCurves.y) * scale,
            BBox.y + (yLim.min - BBoxCurves.y + (yLim.nTicks - 1) * yLim.dTick) * scale,
            yLim.nTicks
        ).data;

        for (let i = 0; i < ind.length; i++) {
            points += BBox.x + ',' + ind[i] + ' ';
            pointsBis += (BBox.x + BBox.width) + ',' + ind[i] + ' ';
        }

        let exponent = yLim.e10;
        let tickText, textProp = this.getProperties('textTicks');
        textProp.x = BBox.x - 15;

        if (Math.abs(exponent) < 2) {
            exponent = 0;
        } else {
            textProp.y = BBox.y - 10;
            tickText = Tools.createSVGTextNode('10^' + exponent, textProp);
            tickText.setAttributeNS(null, 'font-weight', 'bold');
            yTextTicks.appendChild(tickText);
        }

        let val = linspace(
            -yLim.min,
            -(yLim.min + (yLim.nTicks - 1) * yLim.dTick),
            yLim.nTicks
        ).data;
        let fontSize = parseFloat(this.getProperties('axis')['font-size']);
        for (let i = 0; i < ind.length; i++) {
            textProp.y = ind[i] + fontSize / 2;
            val[i] = parseFloat((val[i] * Math.pow(10, -exponent)).toFixed(2));
            tickText = Tools.createSVGTextNode(val[i], textProp);
            yTextTicks.appendChild(tickText);
        }
    }
    points += BBox.x + ',' + (BBox.y + BBox.height) + ' ';
    pointsBis += (BBox.x + BBox.width) + ',' + (BBox.y + BBox.height) + ' ';
    yAxisLine.setAttributeNS(null, 'points', points);
    yAxisLineBis.setAttributeNS(null, 'points', pointsBis);
    return this;
};

/**
 * @private
 *  Determine the best way to sample axis.
 */
Plot.prototype.getAxisLimits = function(minValue, widthValue) {

    let nTicksMax = 10;
    let rounds = [1, 2, 5];

    // Tools
    let k, kBest;

    // Find the best spacing
    let dTickMinLog = Math.log10(widthValue / nTicksMax);
    let dTickBestLog = dTickMinLog + 2;
    for (k = 0; k < rounds.length; k++) {
        let offset = Math.log10(rounds[k]);
        let dTickTmpLog = Math.ceil(dTickMinLog - offset) + offset;
        if (dTickTmpLog < dTickBestLog) {
            dTickBestLog = dTickTmpLog;
            kBest = k;
        }
    }
    let exponent = Math.floor(dTickBestLog);
    let dTick = rounds[kBest] *  10 ** exponent;

    // Find first tick and number of ticks
    let minTick = Math.ceil(minValue / dTick) * dTick;
    let maxTick = Math.floor((minValue + widthValue) / dTick) * dTick;
    let nTicks = 1 + Math.round((maxTick - minTick) / dTick);

    return {
        'min': minTick,
        'dTick': dTick,
        'nTicks': nTicks,
        'e10': exponent
    };
};

/**
 * @private
 *  Compute union of all bounding box to determine
 *  automatic view.
 */
Plot.prototype.getCurvesBBox = function() {

    let curves = this.getDrawing().getElementById('curves');
    let mBBox = [0, 0, 1, 1];

    if (curves.hasChildNodes()) {
        mBBox = curves.childNodes[0].BBox;
        let curvesChilds = curves.childNodes;
        for (let i = 1; i < curvesChilds.length; i++) {
            let BB = curvesChilds[i].BBox;

            mBBox[0] = BB[0] < mBBox[0] ? BB[0] : mBBox[0];
            mBBox[1] = BB[1] < mBBox[1] ? BB[1] : mBBox[1];
            mBBox[2] = BB[2] > mBBox[2] ? BB[2] : mBBox[2];
            mBBox[3] = BB[3] > mBBox[3] ? BB[3] : mBBox[3];
        }
    }
    let BBox = {
        x: mBBox[0],
        y: -mBBox[3],
        width: mBBox[2] - mBBox[0],
        height: mBBox[3] - mBBox[1]
    };
    return BBox;
};

/**
 * @private
 *  Scale specific elements when zooming or change properties
 *  (like markers).
 */
Plot.prototype.scaleElements = function() {

    let svg = this.getDrawing();
    let drawingArea = svg.getElementById('drawingArea');
    let w = drawingArea.width.baseVal.value;
    let h = drawingArea.height.baseVal.value;

    // Specific scaling for scatter plot
    let markers = svg.getElementById('markers').childNodes;
    let scaleX = 2 * this.getCurrentAxis().width / w;
    let scaleY = 2 * this.getCurrentAxis().height / h;

    for (let m = 0; m < markers.length; m++) {
        markers[m].setAttributeNS(null, 'markerWidth',
            scaleX * markers[m].getAttribute('size'));
        markers[m].setAttributeNS(null, 'markerHeight',
            scaleY * markers[m].getAttribute('size'));
    }

};


/////////////////////////////////////////////////////////////////////////////////
//                              TITLE AND LABELS                               //
/////////////////////////////////////////////////////////////////////////////////


/**
 * Define plot title and labels.
 * If text are an empty strings then rendering will be disable.
 * @param {string} [title='']
 *  Text of title.
 * @param {string} [xLabel='']
 *  Text of x label.
 * @param {string} [yLabel='']
 *  Text of y label.
 * @return {Plot}
 *  This plot.
 *
 *  // Set title
 *  myPlot.setTitle ('My plot !');
 */
Plot.prototype.setTitle = function(text = "", xLabel, yLabel) {

    let svg = this.getDrawing();
    let title = svg.getElementById('title');
    if (title.hasChildNodes()) {
        while (title.childNodes.length > 0) {
            title.removeChild(title.firstChild);
        }
    }
    if (text !== '') {
        this.setOwnProperty('title-display', true);
        title.appendChild(document.createTextNode(text));
    } else {
        this.setOwnProperty('title-display', false);
    }
    this.setXLabel(xLabel);
    this.setYLabel(yLabel);
    this.autoDisplay();
    return this;
};

/**
 * Define plot x and y labels.
 * If text are an empty strings then rendering will be disable.
 * @param {string} [xLabel='']
 *  Text of x label.
 * @param {string} [yLabel='']
 *  Text of y label.
 * @return {Plot}
 *  This plot.
 *
 *  // Set x and y labels
 *  myPlot.setLabels ('x Label', 'y Label');
 */
Plot.prototype.setLabels = function(xLabel = "", yLabel = "") {
    this.setXLabel(xLabel);
    this.setYLabel(yLabel);
    return this;
};

/**
* Define plot x label.
* If text is an empty string then rendering will be disable.
* @param {string} [text='']
*  Text of x label.

* @return {Plot}
*  This plot.
*
*  // Set x label
*  myPlot.setXLabel ('x Label');
*/
Plot.prototype.setXLabel = function(text = "") {

    let svg = this.getDrawing();
    let xLabel = svg.getElementById('xLabel');
    if (xLabel.hasChildNodes()) {
        while (xLabel.childNodes.length > 0) {
            xLabel.removeChild(xLabel.firstChild);
        }
    }
    if (text !== '') {
        this.setOwnProperty('xLabel-display', true);
        xLabel.appendChild(document.createTextNode(text));
    } else {
        this.setOwnProperty('xLabel-display', false);
    }

    this.autoDisplay();
    return this;
};

/**
 * Define plot y label.
 * If text is an empty string then rendering will be disable.
 * @param {string} [text='']
 *  Text of y label.
 * @return {Plot}
 *  This plot.
 *
 *  // Set y label
 *  myPlot.setYLabel ('y Label');
 */
Plot.prototype.setYLabel = function(text = "") {

    let svg = this.getDrawing();
    let yLabel = svg.getElementById('yLabel');
    if (yLabel.hasChildNodes()) {
        while (yLabel.childNodes.length > 0) {
            yLabel.removeChild(yLabel.firstChild);
        }
    }
    if (text !== '') {
        this.setOwnProperty('yLabel-display', true);
        var textNode = document.createTextNode(text);
        yLabel.appendChild(textNode);
        this.rotateYLabel();
    } else {
        this.setOwnProperty('yLabel-display', false);
    }

    this.autoDisplay();
    return this;
};

/**
 * @private
 *  Function rotating y label
 */
Plot.prototype.rotateYLabel = function() {


    let svg = this.getDrawing();
    let yLabel = svg.getElementById('yLabel');

    let BBox = yLabel.getBBox();
    let cx = (BBox.x + BBox.width / 2);
    let cy = (BBox.y + BBox.height / 2);
    yLabel.setAttributeNS(null, 'transform', 'rotate(-90, ' + cx + ', ' + cy + ')');
    return this;
};


/////////////////////////////////////////////////////////////////////////////////
//                              LEGEND FUNCTIONS                               //
/////////////////////////////////////////////////////////////////////////////////


/**
 * @private
 *  Create plot legend.
 */
Plot.prototype.setLegend = function () {

    let svg = this.getDrawing();
    let legend = svg.getElementById('legend');
    while (legend.childNodes.length > 0) {
        legend.removeChild(legend.firstChild);
    }

    // Element have to be render for determine its measures
    legend.setAttributeNS(null, 'display', 'inline');

    let curves = svg.getElementById('curves');
    let drawingArea = svg.getElementById('drawingArea');
    let markers = Tools.createSVGNode('defs', {
        id: 'legendMarkers'
    });

    legend.appendChild(markers);
    let pad = 5;
    let sBox = {
        'width': 20,
        'height': 20
    };
    if (curves.hasChildNodes()) {
        let curvesChilds = curves.childNodes;
        let xPos = 0, yPos = 0;
        for (let i = 0; i < curvesChilds.length; i++) {
            if (curvesChilds[i].getAttribute('legend') !== 'none') {
                // Text
                let text = curvesChilds[i].getAttribute('legend') || curvesChilds[i].getAttribute('id');
                let id = 'legendTextId_' + i;
                let textNode = Tools.createSVGTextNode(text, {'id': id});
                legend.appendChild(textNode);

                let BBox = textNode.getBBox();
                textNode.setAttributeNS(null, 'x', xPos + sBox.width + 5);

                // Sample
                let sample
                switch (curvesChilds[i].tagName) {
                    case 'image':
                        let sampleProperties = {
                            'x': xPos,
                            'y': yPos - 2 * sBox.height / 3,
                            'width': sBox.width,
                            'height': sBox.height
                        };
                        sample = Tools.createSVGNode('image', sampleProperties);
                        let xlinkNS = 'http://www.w3.org/1999/xlink';
                        let link = curvesChilds[i].getAttributeNS(xlinkNS, 'href');
                        sample.setAttributeNS(xlinkNS, 'xlink:href', link);
                        break;
                    case 'polyline':
                        id = 'legendCurveId_' + i;
                        sample = curvesChilds[i].cloneNode();
                        sample.removeAttributeNS(null, 'marker-end');
                        sample.removeAttributeNS(null, 'marker-start');
                        if (sample.getAttribute('marker-mid')) {
                            let markerId = sample.getAttribute('marker-mid').split('#')[1].split(')')[0];
                            let marker = svg.getElementById(markerId).cloneNode(true);
                            let markerSize = marker.getAttribute('size');
                            markers.appendChild(marker);
                            marker.removeAttributeNS(null, 'transform');
                            marker.setAttributeNS(null, 'markerWidth', markerSize * 2);
                            marker.setAttributeNS(null, 'markerHeight', markerSize * 2);
                            marker.setAttributeNS(null, 'id', markerId + '_legend');
                            sample.setAttributeNS(null, 'marker-mid', 'url(#' + markerId + '_legend' + ')');
                        }
                        let ySample = yPos - BBox.height / 3;
                        let points = xPos + ',' + ySample + ' ' +
                            (xPos + sBox.width / 2) + ',' + ySample + ' ' +
                            (xPos + sBox.width) + ',' + ySample + ' ';
                        sample.setAttributeNS(null, 'points', points);
                        legend.appendChild(sample);
                        break;
                        // TO CHANGE
                    default:
                        sample = Tools.createSVGNode('rect');
                        break;
                }
                legend.appendChild(sample);
                textNode.setAttributeNS(null, 'y', yPos);
                yPos += BBox.height;
            }

        }

    } else {
        return this;
    }
    let legendBBox = legend.getBBox();
    let frontProp = {
        'fill': 'white',
        'x': legendBBox.x - pad,
        'y': legendBBox.y - pad,
        'width': legendBBox.width + 2 * pad,
        'height': legendBBox.height + 2 * pad,
        'stroke': 'gray',
        'stroke-width': 2
    };
    let front = Tools.createSVGNode('rect', frontProp);
    legend.insertBefore(front, legend.firstChild);
    legendBBox = legend.getBBox();
    let viewBox = legendBBox.x + ' ' + legendBBox.y + ' ' + legendBBox.width + ' ' + legendBBox.height;
    legend.setAttributeNS(null, 'viewBox', viewBox);
    legend.setAttributeNS(null, 'width', legendBBox.width);
    legend.setAttributeNS(null, 'height', legendBBox.height);
    this.setLegendLocation();
    return this;
};

/**
 * @private
 *  Return reuired legend location location can be
 *  'nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'.
 */
Plot.prototype.getLegendLocation = function(location) {

    let svg = this.getDrawing();
    let legend = svg.getElementById('legend');
    let legendBBox;
    try {
        legendBBox = legend.getBBox();
    } catch (e) {
        return;
    }

    // drawing area
    let drawingArea = svg.getElementById('drawingArea');
    let dABBox = {
        'x': drawingArea.x.baseVal.value,
        'y': drawingArea.y.baseVal.value,
        'width': drawingArea.width.baseVal.value,
        'height': drawingArea.height.baseVal.value
    };
    let margin = 0.02 * Math.min(dABBox.width, dABBox.height);

    let xMin = [
        dABBox.x + margin,
        dABBox.x + (dABBox.width - legendBBox.width) / 2,
        dABBox.x + dABBox.width - legendBBox.width - margin
    ];
    let yMin = [
        dABBox.y + margin,
        dABBox.y + (dABBox.height - legendBBox.height) / 2,
        dABBox.y + dABBox.height - legendBBox.height - margin
    ];
    let w = legendBBox.width,
        h = legendBBox.height;
    switch (location.toLowerCase()) {
        case 'nw':
        case 'north-west':
            return [xMin[0], yMin[0], xMin[0] + w, yMin[0] + h];
        case 'n':
        case 'north':
            return [xMin[1], yMin[0], xMin[1] + w, yMin[0] + h];
        case 'none':
        case 'ne':
        case 'north-east':
            return [xMin[2], yMin[0], xMin[2] + w, yMin[0] + h];
        case 'w':
        case 'west':
            return [xMin[0], yMin[1], xMin[0] + w, yMin[1] + h];
        case 'c':
        case 'center':
            return [xMin[1], yMin[1], xMin[1] + w, yMin[1] + h];
        case 'e':
        case 'east':
            return [xMin[2], yMin[1], xMin[2] + w, yMin[1] + h];
        case 'sw':
        case 'sud-west':
            return [xMin[0], yMin[2], xMin[0] + w, yMin[2] + h];
        case 's':
        case 'sud':
            return [xMin[1], yMin[2], xMin[1] + w, yMin[2] + h];
        case 'se':
        case 'sud-east':
            return [xMin[2], yMin[2], xMin[2] + w, yMin[2] + h];
        case 'auto':
            return this.getLegendLocation(this.getLegendAutoLocation());
        default:
            throw new Error('Plot.getLegendLocation: Wrong location request.');
    }
};

/**
 * @private
 *  Return legend location which overlap least points
 */
Plot.prototype.getLegendAutoLocation = function() {

    if (!this.getOwnProperty('compute-closest')) {
        return 'ne';
    }
    let locations = [
        'ne', 'se', 'nw',
        'w', 'n', 'e',
        's', 'w', 'c'
    ];

    let count = [];

    // Initalization
    let l = this.getLegendLocation(locations[0]);
    let min, max;
    try {
        min = this.getCoordinates(l[0], l[1], false);
        max = this.getCoordinates(l[2], l[3], false);
    } catch (x) {
        return 'none';
    }
    count[0] = this.tree.count(min.x, min.y, max.x - min.x, max.y - min.y);

    let locMin = 0;

    for (let i = 1; i < locations.length; i++) {
        l = this.getLegendLocation(locations[i]);
        min = this.getCoordinates(l[0], l[1], false);
        max = this.getCoordinates(l[2], l[3], false);
        count[i] = this.tree.count(min.x, min.y, max.x - min.x, max.y - min.y);
        if (count[i] < count[locMin]) {
            locMin = i;
        }
    }
    return locations[locMin];
};

/**
 * @private
 *  Place legend at the position required by plot
 *  own property 'legend-display'. Valids values are
 * 'nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se',
 * 'auto' and 'none'.
 */
Plot.prototype.setLegendLocation = function() {

    let location = this.getOwnProperty('legend-display');
    let svg = this.getDrawing();
    let legend = svg.getElementById('legend');

    if (location === 'none') {
        legend.setAttributeNS(null, 'display', 'none');
    } else {
        legend.setAttributeNS(null, 'display', 'inline');
        location = this.getLegendLocation(location);
        legend.setAttributeNS(null, 'x', location[0]);
        legend.setAttributeNS(null, 'y', location[1]);
    }
    return this;
};


/////////////////////////////////////////////////////////////////////////////////
//                           INITIALISATION AND UPDATE                         //
/////////////////////////////////////////////////////////////////////////////////


/**
 * @private
 *  Plot initialisation function.
 */
Plot.prototype.initialize = function() {

    // Set UI parameters
    let svg = this.getDrawing();
    let parent = this.getParentNode();
    parent.appendChild(svg);

    // Drawing area
    let drawingAreaProperties = this.getProperties('drawingArea');
    let drawingArea = Tools.createSVGNode('svg', drawingAreaProperties);
    svg.appendChild(drawingArea);

    // Nodes containing data Path
    let curvesProperties = this.getProperties('curves');
    let curves = Tools.createSVGNode('g', curvesProperties);
    drawingArea.appendChild(curves);

    // Nodes containing data Path
    let markersProperties = this.getProperties('markers');
    let markers = Tools.createSVGNode('defs', markersProperties);
    drawingArea.appendChild(markers);

    // Cursor
    let cursorProperties = this.getProperties('cursor');
    let cursor = Tools.createSVGNode('polyline', cursorProperties);
    this.setMarkerPath(cursor, cursorProperties.marker);
    drawingArea.appendChild(cursor);

    // Drawing area front
    let frontProperties = this.getProperties('front');
    let front = Tools.createSVGNode('rect', frontProperties);
    drawingArea.appendChild(front);

    // Axis
    let axisProperties = this.getProperties('axis');
    let axis = Tools.createSVGNode('g', axisProperties);
    svg.appendChild(axis);

    // Tick marker
    let ticksMarkerProp = this.getProperties('ticks');
    let ticksMarker = Tools.createSVGNode('marker', ticksMarkerProp);
    let ticksLine = Tools.createSVGNode('line', ticksMarkerProp);
    ticksMarker.appendChild(ticksLine);
    axis.appendChild(ticksMarker);

    // x Axis
    let xAxisProp = this.getProperties('xAxis');
    let xAxis = Tools.createSVGNode('g', xAxisProp);
    let xAxisLineProp = this.getProperties('xAxisLine');
    let xAxisLine = Tools.createSVGNode('polyline', xAxisLineProp);
    let xAxisLineBisProp = this.getProperties('xAxisLineBis');
    let xAxisLineBis = Tools.createSVGNode('polyline', xAxisLineBisProp);
    let xTextTicksProp = this.getProperties('xTextTicks');
    let xTextTicks = Tools.createSVGNode('g', xTextTicksProp);
    xAxis.appendChild(xAxisLine);
    xAxis.appendChild(xAxisLineBis);
    xAxis.appendChild(xTextTicks);
    axis.appendChild(xAxis);

    // y Axis
    let yAxisProp = this.getProperties('yAxis');
    let yAxis = Tools.createSVGNode('g', yAxisProp);
    let yAxisLineProp = this.getProperties('yAxisLine');
    let yAxisLine = Tools.createSVGNode('polyline', yAxisLineProp);
    let yAxisLineBisProp = this.getProperties('yAxisLineBis');
    let yAxisLineBis = Tools.createSVGNode('polyline', yAxisLineBisProp);
    let yTextTicksProp = this.getProperties('yTextTicks');
    let yTextTicks = Tools.createSVGNode('g', yTextTicksProp);
    yAxis.appendChild(yAxisLine);
    yAxis.appendChild(yAxisLineBis);
    yAxis.appendChild(yTextTicks);
    axis.appendChild(yAxis);

    // Title
    let titleProperties = this.getProperties('title');
    let title = Tools.createSVGTextNode('', titleProperties);
    svg.appendChild(title);

    // xLabel
    let xLabelProperties = this.getProperties('xLabel');
    let xLabel = Tools.createSVGTextNode('', xLabelProperties);
    svg.appendChild(xLabel);

    // yLabel
    let yLabelProperties = this.getProperties('yLabel');
    let yLabel = Tools.createSVGTextNode('', yLabelProperties);
    svg.appendChild(yLabel);

    // Legend
    let legendProperties = this.getProperties('legend');
    let legend = Tools.createSVGNode('svg', legendProperties);
    svg.appendChild(legend);

    this.initializeEvents();

    this.autoDisplay();
    this.setAxis();

    return this;
};

/**
 * @private
 *  Plot Event initialisation function.
 */
Plot.prototype.initializeEvents = function() {

    let svg = this.getDrawing();
    let front = svg.getElementById('drawingArea').getElementById('front');

    // Set events Parameters
    let thisPlot = this;
    let onMouseDown = function(event) {
        event.stopPropagation();
        event.preventDefault();
        thisPlot.coordDown = thisPlot.getCoordinates(event.clientX, event.clientY);
        thisPlot.coordDown.clientX = event.clientX;
        thisPlot.coordDown.clientY = event.clientY;
        thisPlot.mousedown(thisPlot.coordDown, event);
    };
    let onMouseMove = function(event) {
        event.stopPropagation();
        event.preventDefault();
        let coord = thisPlot.getCoordinates(event.clientX, event.clientY);
        thisPlot.mousemove(coord, event);
    };
    let onMouseUp = function(event) {
        event.stopPropagation();
        event.preventDefault();
        let newCoord = thisPlot.getCoordinates(event.clientX, event.clientY);
        let oldCoord = thisPlot.coordDown;
        if (oldCoord === undefined) {
            return;
        }
        // Both coordinates are the same
        if (oldCoord.clientX === event.clientX && oldCoord.clientY === event.clientY) {
            if (thisPlot.click && typeof thisPlot.click === 'function') {
                thisPlot.click(newCoord, event);
            }
            // Else fire event mouseup
        } else {
            if (thisPlot.mouseup && typeof thisPlot.mouseup === 'function') {
                thisPlot.mouseup(newCoord, event);
            }
        }
        delete thisPlot.coordDown;
    };

    let onMouseWheel = function(event) {
        event.stopPropagation();
        event.preventDefault();
        let coord = thisPlot.getCoordinates(event.clientX, event.clientY);
        let direction = 0;
        if (event.wheelDelta) {
            direction = -event.wheelDelta / 120.0;
        } else if (event.detail) {
            direction = event.detail / 3.0;
        } else {
            throw new Error('Mouse wheel event error: what is your browser ?');
        }
        switch (event.target.parentNode.id) {
            case 'xAxis':
                if (!thisPlot.getOwnProperty('preserve-ratio')) {
                    thisPlot.zoomAxis(coord, 1 + direction * 0.1, 1);
                }
                break;
            case 'yAxis':
                if (!thisPlot.getOwnProperty('preserve-ratio')) {
                    thisPlot.zoomAxis(coord, 1, 1 + direction * 0.1);
                }
                break;
            default:
                if (thisPlot.mousewheel && typeof thisPlot.mousewheel === 'function') {
                    thisPlot.mousewheel(direction, coord, event);
                }
        }
    };

    let onMouseOut = function(event) {
        event.stopPropagation();
        event.preventDefault();
        delete thisPlot.coordDown;
        let select = thisPlot.getDrawing().getElementById('selectArea');
        // Remove select rectangle
        if (select) {
            select.parentNode.removeChild(select);
        }
    };

    front.addEventListener('mousedown', onMouseDown, false);
    front.addEventListener('mousemove', onMouseMove, false);
    front.addEventListener('mouseup', onMouseUp, false);
    front.addEventListener('DOMMouseScroll', onMouseWheel, {
        passive: false
    });
    front.addEventListener('mousewheel', onMouseWheel, {
        passive: false
    });
    front.addEventListener('mouseout', onMouseOut, false);

    // Axis events (zomming);
    let xAxis = svg.getElementById('xAxis');
    xAxis.addEventListener('mousewheel', onMouseWheel, {
        passive: false
    });
    xAxis.addEventListener('DOMMouseScroll', onMouseWheel, {
        passive: false
    });
    let yAxis = svg.getElementById('yAxis');
    yAxis.addEventListener('mousewheel', onMouseWheel, {
        passive: false
    });
    xAxis.addEventListener('DOMMouseScroll', onMouseWheel, {
        passive: false
    });

    if (this.getOwnProperty('compute-closest')) {
        this.tree = new Tree2d();
    }

    return this;
};

/**
 * @private
 *  Automatically positions the components of the drawing.
 */
Plot.prototype.autoDisplay = function() {

    // Set UI parameters
    let svg = this.getDrawing();

    // drawing area
    let drawingArea = svg.getElementById('drawingArea');
    drawingArea.setAttributeNS(null, 'x', 0);
    drawingArea.setAttributeNS(null, 'y', 0);
    drawingArea.setAttributeNS(null, 'width', svg.width.baseVal.value);
    drawingArea.setAttributeNS(null, 'height', svg.height.baseVal.value);

    let dABBox = {
        'x': drawingArea.x.baseVal.value,
        'y': drawingArea.y.baseVal.value,
        'width': drawingArea.width.baseVal.value,
        'height': drawingArea.height.baseVal.value
    };

    let axis = svg.getElementById('axis');
    let xAxis = svg.getElementById('xAxis');
    let yAxis = svg.getElementById('yAxis');
    let title = svg.getElementById('title');
    let xLabel = svg.getElementById('xLabel');
    let yLabel = svg.getElementById('yLabel');

    let titleBBox, xAxisBBox, yAxisBBox, xLabelBBox, yLabelBBox;
    try {
        titleBBox = svg.getElementById('title').getBBox();
        xAxisBBox = svg.getElementById('xAxis').getBBox();
        yAxisBBox = svg.getElementById('yAxis').getBBox();
        xLabelBBox = svg.getElementById('xLabel').getBBox();
        yLabelBBox = svg.getElementById('yLabel').getBBox();
    } catch (e) {
        return this;
    }
    let s;

    if (this.getOwnProperty('title-display')) {
        dABBox.y = titleBBox.height;
        dABBox.height -= titleBBox.height;
        dABBox.y += 5;
        dABBox.height -= 5;
    }

    if (this.getOwnProperty('ticks-display')) {
        dABBox.x += 40;
        dABBox.width -= 80;
        dABBox.height -= 50;
        dABBox.y += 20;
    }

    let xLabelSpace, yLabelSpace;
    if (this.getOwnProperty('yLabel-display')) {
        yLabelSpace = yLabelBBox.height + 10;
        dABBox.x += yLabelSpace;
        dABBox.width -= yLabelSpace;
    }

    if (this.getOwnProperty('xLabel-display')) {
        xLabelSpace = xLabelBBox.height + 10;
        dABBox.height -= xLabelSpace;
    }

    drawingArea.setAttributeNS(null, 'x', dABBox.x);
    drawingArea.setAttributeNS(null, 'y', dABBox.y);
    drawingArea.setAttributeNS(null, 'width', dABBox.width);
    drawingArea.setAttributeNS(null, 'height', dABBox.height);

    yLabelBBox.y = dABBox.y;
    yLabelBBox.y += dABBox.height / 2;
    yLabelBBox.y -= yLabelBBox.height / 2;
    yLabelBBox.x = 10;

    xLabelBBox.x = dABBox.x + dABBox.width / 2;
    xLabelBBox.y = svg.height.baseVal.value - 5;

    title.setAttributeNS(null, 'x', xLabelBBox.x);
    title.setAttributeNS(null, 'y', titleBBox.height);

    xLabel.setAttributeNS(null, 'x', xLabelBBox.x);
    xLabel.setAttributeNS(null, 'y', xLabelBBox.y);

    yLabel.setAttributeNS(null, 'y', yLabelBBox.y);
    yLabel.setAttributeNS(null, 'x', yLabelBBox.x);

    this.rotateYLabel();
    this.setAxis(this.getCurrentAxis());
    return this;
};


/////////////////////////////////////////////////////////////////////////////////
//                                   TOOLS                                     //
/////////////////////////////////////////////////////////////////////////////////


/** Parse an argument string.
 *
 * Format:
 *  + [size] [border-size]
 *  + [width] [fac-size]
 *
 * Colors X:
 *  xx for light
 *  x for normal
 *  X for medium
 *  XX for dark
 *
 * Color list:
 *  Nothing: transparent
 *  [R]ed, [G]reen, [B]lue
 *  [W]hite, blac[k]
 *
 * Marker list:
 *  . point
 *  #$ rectangle
 *  <>^v
 *  +x*
 *  _|
 *
 * Line list:
 *  - filled
 *  : dot
 *  = dash, [fac-size] is [dash-size] [white-space]
 *  ! dash-dot, [fac-size] is [dash-size] [white-space]
 *  ; double-dash, [fac-size] is [dash-size] [white-space] [dash-size-2] [white-space-2]
 *
 * Example:
 *  '.k' is black points
 *  '-r' is red line
 *  '#bb3 :k2' is black dotted line of width 2 with light blue rectangles of size 3
 *  'ok5,1' is black circle of size 5 with a border of width 1
 *  '=B2,4' is medium blue dashed line of width 2 with dash of size 4
 *  '=B2,4,8' is the same with dash-spacing of 8
 *  ';BB2' is dark blue dashed line of width 2, with long/short dash
 *  ';BB2,4,8 is the same with long dash of size 4 and dash-spacing of 8
 *  ';BB2,4,8,12 set alternatively dash size to 4 and 12, dash-spacing is 8
 *  ';BB2,4,8,12,16 set alternatively dash size to 4 and 12 and dash-spacing to 8 and 16
 */
Plot.stringToArgs = function(str) {

    var errMsg = 'Plot.stringToArgs: ';
    var assume = function(condition) {
        if (!condition) {
            throw new Error(errMsg + 'invalid argument string');
        }
    };

    // check arguments
    if (str === undefined) {
        return {};
    }
    if (typeof str !== 'string') {
        throw new Error(errMsg + 'argument must be a string');
    }
    str = str.split(' ').join('');

    // Regexp
    var markers = '.#';
    var lines = '-=:;!';
    var colors = 'kwrgb';
    var colorList = ['black', 'white', 'red', 'green', 'blue'];
    var regexp = '([' + colors + ']{0,2})';
    regexp += '([0-9.,]*)';
    regexp = '^(([' + markers + '])' + regexp + ')?(([' + lines + '])' + regexp + ')?$';

    // Tools function
    var getFullName = function(value, list, fullNames) {
        var i = list.indexOf(value);
        assume(i >= 0);
        return fullNames[i];
    };
    var getColor = function(colorStr) {
        if (!colorStr) {
            return 'none';
        }
        var c = colorStr[0];
        var isUpper = (c === c.toUpperCase());
        var color = getFullName(c.toLowerCase(), colors, colorList);
        if (colorStr.length > 1) {
            assume(colorStr[1] === c);
            color = ((isUpper) ? 'dark' : 'light') + color;
        } else if (isUpper) {
            color = 'medium' + color;
        }
        return color;
    };
    var parseFloats = function(floatStr) {
        var i;
        var t = (!floatStr) ? [] : floatStr.split(',');
        for (i = 0; i < t.length; i++) {
            t[i] = parseFloat(t[i]);
            assume(!isNaN(t[i]));
        }
        return t;
    };

    // Parse string
    var args = {
        'stroke': 'none'
    };
    var parsed = str.match(new RegExp(regexp, 'i'));
    assume(parsed);

    // Process lines
    var lk = 6;
    var lString = parsed[lk];
    if (!lString) {
        args.stroke = 'none';
        args['stroke-width'] = 0;
    } else {
        var lColor = getColor(parsed[lk + 1]);
        var lSize = parseFloats(parsed[lk + 2]);
        lSize[0] = (typeof lSize[0] === 'number') ? lSize[0] : 1;
        args['stroke-width'] = lSize[0];
        args.stroke = lColor;
        if (args.marker) {
            args.marker.stroke = lColor;
        }
        var dashArray = '';
        switch (parsed[lk]) {
            case '-':
                break;
            case '=':
                lSize[1] = lSize[1] || 8 * lSize[0];
                lSize[2] = lSize[2] || Math.floor(lSize[1] * 2 / 3);
                dashArray += lSize[1] + ' ' + lSize[2];
                break;
            case ':':
                lSize[1] = lSize[0];
                lSize[2] = 2 * lSize[1];
                dashArray += lSize[1] + ' ' + lSize[2];
                break;
            case ';':
                lSize[1] = lSize[1] || 8 * lSize[0];
                lSize[2] = lSize[2] || Math.floor(lSize[1] / 2);
                lSize[3] = lSize[3] || Math.floor(lSize[1] / 2);
                lSize[4] = lSize[4] || lSize[2];
                dashArray += lSize[1] + ' ' + lSize[2] + ' ';
                dashArray += lSize[3] + ' ' + lSize[4];
                break;
            case '!':
                lSize[1] = lSize[1] || 12 * lSize[0];
                lSize[2] = lSize[2] || Math.floor(lSize[1] / 2);
                lSize[3] = 2 * lSize[0];
                dashArray += lSize[1] + ' ' + lSize[2] + ' ';
                dashArray += lSize[3] + ' ' + lSize[2];
                break;
            default:
                assume(false);
        }
        if (dashArray) {
            args['stroke-dasharray'] = dashArray;
        }
    }

    // Process markers
    var mk = 2;
    var mString = parsed[mk];
    if (mString) {
        var mColor = getColor(parsed[mk + 1]);
        var mSize = parseFloats(parsed[mk + 2]);
        args.marker = {};
        args.marker.fill = mColor;
        args.marker.stroke = args.stroke;
        args.marker.size = mSize[0] || 2;
        args.marker['stroke-width'] = (mSize[1] || args['stroke-width']) / args.marker.size;
        switch (parsed[mk]) {
            case '.':
                args.marker.shape = 'circle';
                break;
            case '#':
                args.marker.shape = 'rect';
                break;
            default:
                assume(false);
        }
        if (args.marker.fill === 'none' && args.stroke !== 'none') {
            args.marker.fill = 'white';
        }
    }

    // Return result
    if (!args['stroke-width']) {
        args.stroke = 'none';
    }
    return args;
};

/**
 * Return closest point to (coord) Default function called when 'click'
 * event is fired.
 * You can redefined your own function until it accepts following parameters.
 * @param {number} x
 *  x coordinate of request point
 * @param {number} y
 *  y coordinate of request point
 * @param {boolean} [scale=true]
 *  Select whether closest mean exact closest or visualy closest.
 * @return {Object}
 *  Object with fields
 *  - x: x coordinate of closest point.
 *  - y: y coordinate of closest point.
 *  - data: curve id.
 */
Plot.prototype.getClosestPoint = function(x, y, scale) {

    if (!this.getOwnProperty('compute-closest')) {
        throw new Error('Property \'compute-closest\' is disabled.');
    }
    if (scale === undefined) {
        scale = true;
    }
    let dArea = this.getDrawing().getElementById('drawingArea');
    let BBoxCurves = this.getCurrentAxis();
    let BBox = {
        width: dArea.width.baseVal.value,
        height: dArea.height.baseVal.value
    };
    let rx = 1,
        ry = 1;
    if (!scale) {
        rx = BBoxCurves.width / BBox.width;
        ry = BBoxCurves.height / BBox.height;
    }
    return this.tree.closest(x, y, -1, rx, ry);
};

/**
 * @private
 *  Display or hide cursor.
 */
Plot.prototype.setCursor = function(xc, yc) {

    let svg = this.getDrawing();
    let cursor = svg.getElementById('cursor');
    if (xc !== undefined && yc !== undefined) {
        cursor.setAttributeNS(null, 'display', 'inline');
        cursor.setAttributeNS(null, 'points', xc + ',' + (-yc));
    } else {
        cursor.setAttributeNS(null, 'display', 'none');
    }
};

/**
 * @private
 *  Translate axis view.
 */
Plot.prototype.translateAxis = function(dx, dy) {

    let axis = this.getCurrentAxis();
    axis.x -= dx;
    axis.y += dy;
    this.setAxis(axis);
};

/**
 * @private
 *  Zoom axis view.
 */
Plot.prototype.zoomAxis = function(coord, fx, fy) {
    fx = fx || 1;
    fy = fy || fx;
    let axis = this.getCurrentAxis();
    let w = axis.width * fx;
    let h = axis.height * fy;
    let px = (coord.x - axis.x) / axis.width;
    axis.x = coord.x - px * w;
    let py = (coord.y + axis.y) / axis.height;
    axis.y = -coord.y + py * h;
    axis.width = w;
    axis.height = h;
    this.setAxis(axis);
};

/**
 * @private
 *  Initiate select area operation.
 */
Plot.prototype.startSelectArea = function(coord) {

    let selectProperties = this.getProperties('selectArea');
    selectProperties.x = coord.x;
    selectProperties.y = -coord.y;
    selectProperties.width = 0;
    selectProperties.height = 0;
    let select = Tools.createSVGNode('rect', selectProperties);
    this.getDrawing().getElementById('curves').appendChild(select);
};

/**
 * @private
 *  Update select area operation.
 */
Plot.prototype.updateSelectArea = function(coordStart, coordActual) {

    let select = this.getDrawing().getElementById('selectArea');
    let x = Math.min(coordStart.x, coordActual.x);
    let y = Math.min(-coordStart.y, -coordActual.y);
    let width = Math.max(coordStart.x, coordActual.x) - x;
    let height = Math.max(-coordStart.y, -coordActual.y) - y;
    select.setAttributeNS(null, 'x', x);
    select.setAttributeNS(null, 'y', y);
    select.setAttributeNS(null, 'width', width);
    select.setAttributeNS(null, 'height', height);
};

/**
 * @private
 *  Ends select area operation.
 */
Plot.prototype.endSelectArea = function(coordStart, coordEnd) {

    let select = this.getDrawing().getElementById('selectArea');
    select.parentNode.removeChild(select);
    this.selectarea(coordStart.x, coordStart.y, coordEnd.x, coordEnd.y);
};

/**
 * @private
 *  Cancels select area operation.
 */
Plot.prototype.cancelSelectArea = function() {

    let select = this.getDrawing().getElementById('selectArea');
    if (select) {
        select.parentNode.removeChild(select);
    }
};

/**
 * @private
 *  Convert pixel coordinates to svg 'drawingArea' units coordinate.
 * @param {number} x
 *  x coordinate to convert.
 * @param {number} y
 *  y coordinate to convert.
 * @param {boolean} screen
 *  Indicate whether the coordinates are relative
 *  to the window or to the drawing area.
 * @param {boolean} inverse
 *  Specify the direction of the conversion.
 *  'true' means screen units -> drawing area units.
 *  'false' means drawing area units -> screen units.
 *
 *  // When a click event is fired convert screen click coordinates
 *  // to drawing area coordinates.
 *  myPlot.getCoordinates(event.clientX, event.clientY);
 */
Plot.prototype.getCoordinates = function(x, y, screen, inverse) {

    if (inverse === undefined) {
        inverse = true;
    }
    if (screen === undefined) {
        screen = true;
    }
    let svg = this.getDrawing();
    let svgPoint = svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;

    let curves = svg.getElementById('curves');
    let matrix = screen ? curves.getScreenCTM() : curves.getCTM();
    matrix = inverse ? matrix.inverse() : matrix;

    svgPoint = svgPoint.matrixTransform(matrix);
    svgPoint.y = -svgPoint.y;

    // Undo the effect of viewBox and zoomin/scroll
    return svgPoint;
};

/** Load a CSV string into a 2D array.
 * @param {String} csv
 *  String containing data, separateed by white spaces and new line.
 * @param {Boolean} [transpose=undefined]
 *  - If 'undefined' transpose to maximize series lengths.
 *  - If 'true' series will be take as column, if 'false' as line.
 * @return {Array}
 *  Loaded data
 */
Plot.loadCsv = function(csvString, transpose) {

    let errMsg = 'Plot.loadCsv: ';
    // Load data
    let parsed = Tools.parseCsv(csvString, /\s*\n\s*/, /\s+/, false);
    let arrays = Tools.Array.mapRec(parsed, parseFloat);
    if (!Tools.Array.isRectangle(arrays)) {
        throw new Error(errMsg + 'invalid csv string');
    }
    // Transpose it
    if (transpose === undefined) {
        if (arrays.length > arrays[0].length) {
            arrays = Tools.Array.transpose(arrays);
        }
    } else if (transpose === true) {
        arrays = Tools.Array.transpose(arrays);
    } else if (transpose !== false) {
        throw new Error(errMsg + "invalid 'transpose' parameter");
    }
    // Return it
    return arrays;
};

/** Display csv string
 * @param {String} csv
 *  String containing data.
 * @param {Boolean} [transpose=undefined]
 *  - If 'undefined' transpose to maximize series lengths.
 *  - If 'true' series will be take as column, if 'false' as line.
 * @param {Boolean} [auto=true]
 *  Choose color automaticaly.
 * @param {Object} [properties]
 *  Properties of paths.
 */
Plot.prototype.displayCsv = function(csvString, transpose, auto, properties) {

    let errMsg = this.constructor.name + 'displayCsv: ';
    let arrays = Plot.loadCsv(csvString, transpose);

    // Auto colors
    if (auto === undefined) {
        auto = true;
    } else if (typeof auto !== 'boolean') {
        throw new Error(errMsg + "invalid 'auto' parameter");
    }
    let colors = [
        "red", "green", "blue",
        "fuchsia", "lime", "aqua",
        "purple", "olive", "teal",
        "yellow", "navy", "maroon",
        "black", "sylver", "gray"
    ];

    // If there is more than one series then the first one is used as x coordinates
    let x = [];
    if (arrays.length > 1) {
        x = arrays.shift();
    } else {
        for (let k = 0; k < arrays[0].length; k++) {
            x.push(k + 1);
        }
    }

    // Plot everything
    for (let k = 0; k < arrays.length; k++) {
        let nPlot = this.getOwnProperty('autoId-curves');
        if (auto === true) {
            let color = colors[nPlot % colors.length];
            if (properties) {
                if (properties.stroke !== 'none') {
                    properties.stroke = color;
                }
                if (properties.marker) {
                    properties.marker.fill = color;
                }
            } else {
                properties = {
                    'stroke': color
                };
            }
        }
        this.addPath(x, arrays[k], properties);
    }
    return this;
};

/**
 * Returns an array containing the identifiers of the plotted curves.
 * @return {Array}
 *  Array containing identifiers.
 */
Plot.prototype.getCurvesIds = function() {

    let ids = [];
    let curves = this.getDrawing().getElementById('curves');
    if (curves.hasChildNodes()) {
        for (let i = 0; i < curves.childNodes.length; i++) {
            ids.push(curves.childNodes[i].id);
        }
    }
    return ids;
};

/**
 * Change a property of a curve.
 * @param {String} id
 *  Identifier of the curve to be changed.
 * @param {String} property
 *  Name of property to be changed.
 * @param {String} value
 *  New value of the property.
 * @return {Plot}
 *  This plot.
 *
 * // Change stroke width of 'myCurve'
 * myPlot.setCurveProperty('myCurve', 'stroke-width', 3);
 */
Plot.prototype.setCurveProperty = function(id, property, value) {

    let curves = this.getDrawing().getElementById('curves');
    if (curves.hasChildNodes()) {
        let curvesChilds = curves.childNodes;
        for (let i = 0; i < curvesChilds.length; i++) {
            if (curvesChilds[i].id === id) {
                curvesChilds[i].setAttributeNS(null, property, value);
                this.setLegend();
                break;
            }
        }
    }
    return this;
};

/** Change a property of a curve marker.
 * @param {String} id
 *  Identifier of the curve to be changed.
 * @param {String} property
 *  Name of property to be changed.
 * @param {String} value
 *  New value of the property.
 * @return {Plot}
 *  This plot.
 *
 * // Change fill color of 'myCurve'
 * myPlot.setMarkerProperty('myCurve', 'fill', 'lime');
 * // Change marker shape of 'myCurve'
 * myPlot.setMarkerProperty('myCurve', 'shape', 'rect');
 */
Plot.prototype.setCurveMarkerProperty = function(id, property, value) {

    let svg = this.getDrawing();
    let curves = svg.getElementById('curves');
    if (curves.hasChildNodes()) {
        let curvesChilds = curves.childNodes;
        for (let i = 0; i < curvesChilds.length; i++) {
            if (curvesChilds[i].id === id) {
                let curve = curvesChilds[i];
                let markerId = curve.getAttributeNS(null, 'marker-id');
                let marker = svg.getElementById(markerId);
                if (property === 'shape') {
                    this.setMarkerShape(marker, value);
                }
                marker.setAttributeNS(null, property, value);
                this.scaleElements();
                this.setLegend();
                break;
            }
        }
    }
    return this;
};

/** Clone the SVG element and display it in a new window.
 * @param {Number} height
 * @param {Number} width
 * @return {Object}
 *  The window created.
 */
Plot.prototype.toWindow = function(h = this.getHeight(), w = this.getWidth()) {
    let BBox; // = this.getCurrentAxis();
    this.setWidth(w).setHeight(h).setAxis(BBox);
    let win = window.open("", "", "width=" + (w + 30) + ", height=" + (h + 30));
    win.document.body.appendChild(this.setAxis(BBox).getDrawing().cloneNode(true));
    this.setWidth(this.getWidth()).setHeight(this.getHeight()).setAxis(BBox);
    return win;
};

/** Clone the SVG element and display it in a new window
 * and open the print toolbox.
 * @param {Number} height
 * @param {Number} width
 * @chainable
 */
Plot.prototype.print = function(h, w) {
    let win = this.toWindow(h, w);
    win.print();
    win.close();
    return this;
};


/////////////////////////////////////////////////////////////////////////////////
//                            DEFAULT MOUSE EVENTS                             //
/////////////////////////////////////////////////////////////////////////////////


/**
 * Default function called when 'mousedown' event is fired.
 * You can redefined your own function until it accepts following parameters.
 * @param {Object} coord Object with 'x' and 'y' fields corresponding to the mouse
 *  position on the plot.
 * @param {Event} event Original event fired.
 */
Plot.prototype.mousedown = function(coord, event) {
    if (event.shiftKey) {
        this.startSelectArea(coord);
    }
};

/**
 * Default function called when 'mousemove' event is fired.
 * You can redefined your own function until it accepts following parameters.
 * It is possible to access to the mouse coordinate of event 'mousedown'
 * with 'this.coordDown'.
 * @param {Object} coord Object with 'x' and 'y' fields corresponding to the mouse
 * position on the plot.
 * @param {Event} event Original event fired.
 */
Plot.prototype.mousemove = function(coord, event) {
    if (this.coordDown === undefined) {
        return;
    }
    let oldCoord = this.coordDown;
    let newCoord = coord;
    if (event.shiftKey) {
        this.updateSelectArea(oldCoord, newCoord);
    } else {
        this.cancelSelectArea();
        this.translateAxis(newCoord.x - oldCoord.x, newCoord.y - oldCoord.y);
    }
};

/**
 * Default function called when 'mouseup' event is fired.
 * You can redefined your own function until it accepts following parameters.
 * It is possible to access to the mouse coordinate of event 'mousedown'
 * with 'this.coordDown'.
 * @param {Object} coord Object with 'x' and 'y' fields corresponding to the mouse
 * position on the plot.
 * @param {Event} event Original event fired.
 */
Plot.prototype.mouseup = function(coord, event) {
    let oldCoord = this.coordDown;
    let newCoord = coord;
    if (event.shiftKey) {
        this.endSelectArea(oldCoord, newCoord);
    } else {
        this.translateAxis(newCoord.x - oldCoord.x, newCoord.y - oldCoord.y);
    }
};

/**
 * Default function called when 'mousewheel' event is fired.
 * You can redefined your own function until it accepts following parameters.
 * @param {number} direction  1 or -1 following the wheel direction.
 * @param {Object} coord Object with 'x' and 'y' fields corresponding to the mouse
 * position on the plot.
 * @param {Event} event Original event fired.
 */
Plot.prototype.mousewheel = function(direction, coord, event) {
    let f = 1 + direction * 0.1;
    this.zoomAxis(coord, f);
};

/**
 *  Default function called when 'click' event is fired.
 *  'click' event corresponds to 'mousedown' and 'mouseup' events fired at
 *  the same location.
 *  You can redefined your own function until it accepts following parameters.
 *  It is possible to access to the mouse coordinate of event 'mousedown'
 *  with 'this.coordDown'.
 * @param {Object} coord
 *  Object with 'x' and 'y' fields corresponding to the mouse
 *  position on the plot.
 * @param {Event} event
 *  Original event fired.
 *
 *  // Defined an action when click event occurs
 *  myPlot.click = function (coord, event) {
 *    alert('click at point(' + coord.x + ', ' + coord.y + ').')
 *  };
 */
Plot.prototype.click = function(coord, event) {
    let c = this.getClosestPoint(coord.x, coord.y, false);
    if (c) {
        this.setCursor(c.x, c.y);
    }
};

/**
 * Default function called when an area has been selected.
 * You can redefined your own function until it accepts following parameters.
 * @param {number} x1
 *  x first coordinate.
 * @param {number} y1
 *  y first coordinate.
 * @param {number} x2
 *  x second coordinate.
 * @param {number} y2
 *  y second coordinate.
 *
 * // Defined an action when an area is selected
 * myPlot.selectarea = function (x1, y1, x2, y2) {
 *   alert('You selected area from ('+x1+', '+y1+') to ('+x2+', '+y2+').')
 * };
 */
Plot.prototype.selectarea = function(x1, y1, x2, y2) {
    this.setAxis([x1, y1, x2, y2]);
};

Plot.prototype.appendTo = function(parent) {
    if (typeof parent === 'string') {
        parent = document.getElementById(parent);
    } else {
        parent = parent || document.body;
    }
    parent.appendChild(this.getDrawing());
    this.autoDisplay();
    return this;
};



import matchingExtension from "./Plot.matching.js";
matchingExtension(Plot);

import cieExtension from "./Plot.cie.js";
cieExtension(Plot);

export default Plot;
