/////////////////////////////////////////////////////////////////////////////////
//                                 SVG TOOLS                                   //
/////////////////////////////////////////////////////////////////////////////////

/** @class Plot.Tools
 * @singleton
 * @private
 */
let Tools = {};

/** Creates a svg node.
 * @param {String} type
 * @param {Object} args
 * @return {Object}
 */
Tools.createSVGNode = function(type, args) {
    type = type.toLowerCase();
    let element = document.createElementNS('http://www.w3.org/2000/svg', type);
    for (let i in args) {
        if (args.hasOwnProperty(i)) {
            element.setAttributeNS(null, i, args[i]);
        }
    }
    return element;
};

/** Creates a svg text node.
 * @param {String} text
 * @param {Object} args
 * @return {Object}
 */
Tools.createSVGTextNode = function(text, args) {
    let element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    for (let i in args) {
        if (args.hasOwnProperty(i)) {
            element.setAttributeNS(null, i, args[i]);
        }
    }
    element.appendChild(document.createTextNode(text));
    return element;
};

/** Returns the position corresponding to an event
 * @param {Object} e
 * @param {Object} event
 * @return {Array}
 *  Returns an array like : [left, top].
 * @todo
 *  add some details.
 */
Tools.getPosition = function(e, event) {
    let left = 0, top = 0;

    // Tant que l'on a un élément parent
    while (e.offsetParent !== undefined && e.offsetParent !== null) {
        // On ajoute la position de l'élément parent
        left += e.offsetLeft + (e.clientLeft !== null ? e.clientLeft : 0);
        top += e.offsetTop + (e.clientTop !== null ? e.clientTop : 0);
        e = e.offsetParent;
    }

    left = -left + event.pageX;
    top = -top + event.pageY;

    return [left, top];
};

/** Tests if an Object is a kind of Array.
 * @param {Object} obj
 * @return {Boolean}
 */
Tools.isArrayLike = function(obj) {
    return obj && typeof obj === 'object' && obj.length !== undefined;
};

/** @class Plot.Tools.Vector
 * @private
 *  Class used to deal with array.
 * @constructor
 *  Creates a Vector.
 */
Tools.Vector = function(arg1, arg2, arg3, arg4) {
    let n, b, s, e, i, a, x;
    if (Tools.isArrayLike(arg1)) {
        n = arg1.length;
        this.data = this.zeros(n, arg4);
        this.index = this.zeros(n, Uint32Array);
        for (i = 0; i < n; i++) {
            this.data[i] = arg1[i];
            this.index[i] = i;
        }
    } else if (arg1 instanceof Tools.Vector) {
        n = arg1.index.length;
        this.data = this.zeros(n);
        this.index = this.zeros(n, Uint32Array);
        i = this.index;
        var d = this.data;
        var ii = arg1.index;
        var id = arg1.data;
        for (x = 0; x < n; x++) {
            d[x] = id[ii[x]];
            i[x] = x;
        }
    } else {
        if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined) {
            b = arg1;
            s = arg2;
            e = arg3;
        } else if (arg1 !== undefined && arg2 !== undefined && arg3 === undefined) {
            b = arg1;
            s = arg1 < arg2 ? 1 : -1;
            e = arg2;
        } else if (arg1 !== undefined && arg2 === undefined && arg3 === undefined) {
            b = 0;
            s = 0;
            e = arg1;
        }
        if (s !== 0) {
            n = Math.abs(Math.floor((e - b) / s) + 1);
        } else {
            n = Math.abs(Math.floor((e - b)));
        }
        this.data = this.zeros(n, arg4);
        this.index = this.zeros(n, Uint32Array);
        a = b;
        for (i = 0; i < n; i++, a += s) {
            this.data[i] = a.toPrecision(15);
            this.index[i] = i;
        }
    }
    return this;
};

/**  Creates a vector filled with zeros.
 * @param {Number} size
 * @param {Object} [constructor=Float64Array]
 */
Tools.Vector.prototype.zeros = function(n, Type) {
    let out;
    if (!Type) {
        out = new Float64Array(n);
    } else {
        out = new Type(n);
    }
    return out;
};

/** Creates a vector of regularly espaced values.
 * @param {Number} begin
 * @param {Number} end
 * @param {Number} number
 */
Tools.Vector.linearSpace = function(b, e, n) {
    let n1 = Math.floor(n) - 1;
    let c = (e - b) * (n - 2);
    let out = new Tools.Vector(b, (e - b) / n1, e);
    out.data[n - 1] = e;
    return out;
};

/** Derive a vector.
 * @param {Number} order
 */
Tools.Vector.prototype.derive = function(o = 1) {
    let d = this.data, i = this.index, x, n;
    for (x = 1, n = i.length; x < n; x++) {
        d[i[x - 1]] = d[i[x]] - d[i[x - 1]];
    }
    this.data = this.data.subarray(0, n - 1);
    this.index = this.index.subarray(0, n - 1);
    if (o > 1) {
        this.derive(o - 1);
    }
    return this;
};

/** Returns the indice and the value of the maximum.
 * @return {Array}
 * [value, indice]
 */
Tools.Vector.prototype.max = function() {
    let d = this.data, i = this.index;
    let M = -Infinity, Mind = NaN;
    for (let x = 0, nx = i.length; x < nx; x++) {
        if (d[i[x]] > M) {
            M = d[i[x]];
            Mind = i[x];
        }
    }
    return new Tools.Vector([M, Mind]);
};

/** Returns the indice and the value of the minimum.
 * @return {Array}
 * [value, indice]
 */
Tools.Vector.prototype.min = function() {
    let d = this.data, i = this.index;
    let M = +Infinity, Mind = NaN;
    for (let x = 0, nx = i.length; x < nx; x++) {
        if (d[i[x]] < M) {
            M = d[i[x]];
            Mind = i[x];
        }
    }
    return new Tools.Vector([M, Mind]);
};

/** Returns a value of the vector.
 * @param {Number} indice
 * @return {Number}
 */
Tools.Vector.prototype.get = function(i) {
    return this.data[this.index[i]];
};

/** Set a value of the vector.
 * @param {Number} indice
 * @chainable
 */
Tools.Vector.prototype.set = function(i, v) {
    this.data[this.index[i]] = v;
    return this;
};

/** Make a HTML element draggable: objects can be dropped on it.
 * @param {HTMLElement|String} element
 *  HTMLElement or HTMLElement id wich is desired to be draggable.
 * @param {Function} callback
 *  Function to be called when files will be drag on element.
 * @param {string} [type='none']
 *  Specify the way of reading the file.<br />
 *  Can be 'DataUrl | url', 'ArrayBuffer | bin | binary', or 'text'.
 *
 *  // Drag callback: load the image
 *  var main = function(result) {
 *      // Load callback: display the image
 *      var callback = function(im) {
 *          im.draw(createView(1, 1));
 *      };
 *      // Load the image
 *      var im = new ImageJS().load(result, callback);
 *  };
 *  // Make the canvas with id 'canvas' draggable
 *  Tools.makeDraggable('canvasId', main);
 */
Tools.makeDraggable = function(element, callback, type) {

    // Deal with arguments
    type = (type || 'none').toLowerCase();
    switch (type) {
        case 'dataurl':
        case 'url':
            type = 'url';
            break;
        case 'text':
        case 'txt':
            type = 'txt';
            break;
        case 'arraybuffer':
        case 'binary':
        case 'bin':
            type = 'bin';
            break;
        default:
            type = 'none';
    }

    if (typeof element === 'string') {
        element = document.getElementById(element) || element;
    }

    // Callback functions declarations
    var dragEnter, dragLeave, dragOver;
    dragEnter = dragLeave = dragOver = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
    };

    var drop = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        // File handling functions
        var handleFile, newCallback;
        if (type !== 'none') {
            newCallback = function(evt) {
                if (callback) {
                    callback(evt.target.result, evt);
                }
            };
            handleFile = function(file) {
                var reader = new FileReader();
                reader.onload = newCallback;
                switch (type) {
                    case 'url':
                        reader.readAsDataURL(file);
                        break;
                    case 'txt':
                        reader.readAsText(file);
                        break;
                    case 'bin':
                        reader.readAsArrayBuffer(file);
                        break;
                }
            };
        } else {
            handleFile = function(file) {
                if (callback) {
                    callback(file);
                }
            };
        }

        // Only call the handler if 1 or more files was dropped.
        if (evt.dataTransfer.files.length) {
            var i;
            for (i = 0; i < evt.dataTransfer.files.length; i++) {
                handleFile(evt.dataTransfer.files[i]);
            }
        }
    };

    // Drag Drop on HTML element.
    element.addEventListener('dragenter', dragEnter, false);
    element.addEventListener('dragleave', dragLeave, false);
    element.addEventListener('dragover', dragOver, false);
    element.addEventListener('drop', drop, false);
};

Tools.parseCsv = function(csv, vDelim = "\n", hDelim, transpose = false) {
    csv = csv.split(vDelim);
    if (csv[csv.length - 1] === "") {
        csv.pop();
    }
    let output = [];
    for (let i = 0, ei = csv.length; i < ei; i++) {
        output.push(csv[i].match(/[\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?/g));
    }
    return transpose ? Tools.Array.transpose(output) : output;
};

Tools.Array = Tools.Array || {};
Tools.Array.opposite = function(a) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] instanceof Array) {
            Tools.Array.opposite(a[i]);
        } else {
            a[i] = -a[i];
        }
    }
    return a;
};

/** Apply a function to each value of an array or an array of arrays.
 * @param {Array} array
 * @param {Function} f
 *  Function to be applied to each element of the array.
 * @return {Array}
 *  Array of f(t) for all t in the input array.
 */
Tools.Array.mapRec = function(a, f) {

    let N = a.length;
    let aOut = new a.constructor(N);
    for (let i = 0; i < N; i++) {
        if (a[i].length !== undefined && typeof a[i] !== 'string') {
            aOut[i] = Tools.Array.mapRec(a[i], f);
        } else {
            aOut[i] = f(a[i]);
        }
    }
    return aOut;
};


/** Is a 2D array rectangular?
 * @param {Array} array
 *  An array of arrays.
 * @return {boolean}
 *  True iff all the sub-arrays have the same length.
 */
Tools.Array.isRectangle = function(a) {
    if (!a || !a.length || a[0].length === undefined) {
        return false;
    }
    let N = a.length;
    let P = a[0].length;
    for (let i = 1; i < N; i++) {
        if (a[i].length !== P) {
            return false;
        }
    }
    return true;
};

/** Transpose an array of arrays.
 * @param {Array} a
 *  Array to be transposed.
 * @return {Array}
 *  Transposed array.
 */
Tools.Array.transpose = function(a) {
    let errMsg = 'Tools.Array.transpose: ';
    if (!Tools.Array.isRectangle(a)) {
        throw new Error(errMsg + 'cannot transpose a non-rectangular array');
    }
    let N = a.length;
    let P = a[0].length;
    let aOut = new a.constructor(P);
    for (let j = 0; j < P; j++) {
        aOut[j] = new a[0].constructor(N);
        for (let i = 0; i < N; i++) {
            aOut[j][i] = a[i][j];
        }
    }
    return aOut;
};

export default Tools;
