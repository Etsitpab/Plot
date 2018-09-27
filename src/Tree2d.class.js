/** @class Plot.Tree2d
* @private
* Class used to store the node of the plot for fast search.
* @constructor
*/
function Tree2d() {
    this.root = null;
}

/** Remove all the point from the tree. */
Tree2d.prototype.clear = function () {
    this.root = null;
};

/** Add a point with a data to the tree. */
Tree2d.prototype.add = function (x, y, i, data) {

    // If it is the first point
    if (!this.root) {
        var size = 1;
        while (!(Math.abs(x) < size && Math.abs(y) < size)) {
            size *= 2;
        }
        while (x && y && Math.abs(x) < size && Math.abs(y) < size) {
            size /= 2;
        }
        var rootX = (x >= 0) ? size : -size;
        var rootY = (y >= 0) ? size : -size;
        this.root = new Tree2d.Node(rootX, rootY, null, null, size);
    }
    // If outside of the BBox
    while (this.root.size && !this.root.hasInBBox(x, y)) {
        var oldSize = this.root.size, newSize = 2 * oldSize;
        var newX = this.root.x;
        var newY = this.root.y;
        newX += (newX < x) ? oldSize : -oldSize;
        newY += (newY < y) ? oldSize : -oldSize;
        var newRoot = new Tree2d.Node(newX, newY, null, null, newSize);
        var we = (this.root.x < newRoot.x) ? "w" : "e";
        var ns = (this.root.y < newRoot.y) ? "s" : "n";
        newRoot[ns + we] = this.root;
        newRoot.length = this.root.length;
        this.root = newRoot;
    }
    // Append a new node
    var node = new Tree2d.Node(x, y, i, data);
    this.root = Tree2d.Node.add(this.root, node, null);
};

/** Remove a data from the tree. */
Tree2d.prototype.remove = function (dataFilter) {

    // Initialize argument
    if (typeof dataFilter !== 'function') {
        var dataRef = dataFilter;
        dataFilter = function (data) {
            return (data === dataRef);
        };
    }

    // Remove the nodes
    this.root = Tree2d.Node.remove(this.root, dataFilter);
};

/** Get the number of point in the tree / in a box. */
Tree2d.prototype.count = function (x, y, w, h) {
    if (!this.root) {
        return 0;
    }
    if (x === undefined) {
        return this.root.length;
    }
    if (h === undefined) {
        var errMsg = this.constructor.name + '.count: ';
        throw new Error(errMsg + 'expected 0 or 4 arguments');
    }
    var xmin = Math.min(x, x + w), xmax = Math.max(x, x + w);
    var ymin = Math.min(y, y + h), ymax = Math.max(y, y + h);
    return this.root.count(xmin, ymin, xmax, ymax);
};

/** Find the closest point from x/y in a given radius. */
Tree2d.prototype.closest = function (x, y, radius, xUnit, yUnit) {
    if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error(this.constructor.name + '.closest: invalid x, y.');
    }
    // Distance function
    var r = (radius && radius > 0) ? radius * radius : -1;
    var rx = (xUnit) ? xUnit * xUnit : 1;
    var ry = (yUnit) ? yUnit * yUnit : rx;
    var norm = function (dx, dy) {
        return dx * dx / rx + dy * dy / ry;
    };
    // Search function
    var search = function (root) {
        // Empty
        if (!root) {
            return null;
        }
        // Leaf
        if (root.data !== null) {
            var d = norm(x - root.x, y - root.y);
            if (r < 0 || d < r) {
                r = d;
                return root;
            }
            return null;
        }
        // Check BB
        var projX = Math.min(Math.max(x, root.x - root.size), root.x + root.size);
        var projY = Math.min(Math.max(y, root.y - root.size), root.y + root.size);
        if (r >= 0 && norm(x - projX, y - projY) > r) {
            return null;
        }
        // Search recursively
        var we = (x < root.x) ? "we" : "ew";
        var ns = (y < root.y) ? "sn" : "ns";
        var node = search(root[ns[0] + we[0]]);
        if (norm(x - root.x, 0) < norm(0, y - root.y)) {
            node = search(root[ns[0] + we[1]]) || node;
            node = search(root[ns[1] + we[0]]) || node;
        } else {
            node = search(root[ns[1] + we[0]]) || node;
            node = search(root[ns[0] + we[1]]) || node;
        }
        node = search(root[ns[1] + we[1]]) || node;
        return node;
    };
    var closest = search(this.root);
    return closest;
};

/** Display a tree in a plot/ */
Tree2d.prototype.plot = function (plot, pointStyle, boxStyle, lineStyle) {
    var draw = function (node, pt, box, line) {
        if (!node || !(pt || box || line)) {
            return;
        }
        draw(node.nw, pt, box, line);
        draw(node.ne, pt, box, line);
        draw(node.sw, pt, box, line);
        draw(node.se, pt, box, line);
        if (node.data !== null && pt) {
            plot.addPath([node.x, node.x], [node.y, node.y], pt);
        }
        if (node.size && box) {
            var x = node.x;
            var y = node.y;
            var d = node.size;
            plot.addPath([x, x], [y - d, y + d], line);
            plot.addPath([x - d, x + d], [y, y], line);
            plot.addPath(
                [x - d, x + d, x + d, x - d, x - d],
                [y - d, y - d, y + d, y + d, y - d],
                box
            );
        }
    };
    pointStyle = pointStyle || !(boxStyle || lineStyle);
    pointStyle = (typeof pointStyle === 'object') ? pointStyle : {'marker': {'shape': 'circle'}};
    boxStyle = (!boxStyle) ? false : (typeof boxStyle === 'object') ? boxStyle : {'stroke': 'red'};
    lineStyle = (boxStyle && typeof lineStyle === 'object') ? lineStyle : boxStyle;
    plot.clear();
    draw(this.root, false, boxStyle, lineStyle);
    draw(this.root, pointStyle);
};

/** @class Plot.Tree2d.Node
* @private
* Class used to create the node of the tree.
* @constructor
*/
Tree2d.Node = function (x, y, i, data, size) {
    this.x = x;
    this.y = y;
    this.number = i;
    this.data = data;
    this.length = 1;
    if (data === null) {
        this.length = 0;
        this.size = size;
        this.nw = this.ne = null;
        this.sw = this.se = null;
    }
};

/** Add a node. */
Tree2d.Node.add = function (root, node, prevRoot) {
    // Assume that the node is inside root's bbox
    if (root === null || node === null) {
        return node || root;
    }

    if (root.data !== null) {
        // Leaf with same x/y
        if (root.x === node.x && root.y === node.y) {
            root.datas = root.datas || [root.data];
            root.datas.push(node.data);
            root.length++;
            return root;
        }
        // New leaf
        var newSize = prevRoot.size / 2;
        var newNode = new Tree2d.Node(prevRoot.x, prevRoot.y, null, null, newSize);
        newNode.x += (root.x < prevRoot.x) ? -newNode.size : +newNode.size;
        newNode.y += (root.y < prevRoot.y) ? -newNode.size : +newNode.size;
        Tree2d.Node.add(newNode, root, prevRoot);
        Tree2d.Node.add(newNode, node, prevRoot);
        return newNode;
    }

    // Insert in the right quadrant
    var we = (node.x < root.x) ? "w" : "e";
    var ns = (node.y < root.y) ? "s" : "n";
    root[ns + we] = Tree2d.Node.add(root[ns + we], node, root);
    root.length++;
    return root;
};

/** Remove a node. */
Tree2d.Node.remove = function (node, dataFilter) {
    if (node === null) {
        return null;
    }

    // If it is a leaf
    if (node.data !== null) {
        var newDatas = [], oldDatas = node.datas || [node.data];
        var k, N = oldDatas.length;
        for (k = 0; k < N; k++) {
            if (!dataFilter(oldDatas[k])) {
                newDatas.push(oldDatas[k]);
            }
        }
        if (!newDatas.length) {
            return null;
        }
        node.datas = (newDatas.length > 1) ? newDatas : [];
        node.data = newDatas[0];
        node.length = newDatas.length;
        return node;
    }

    // It is a node
    node.nw = Tree2d.Node.remove(node.nw, dataFilter);
    node.ne = Tree2d.Node.remove(node.ne, dataFilter);
    node.sw = Tree2d.Node.remove(node.sw, dataFilter);
    node.se = Tree2d.Node.remove(node.se, dataFilter);
    node.length = 0;
    node.length += (node.nw) ? node.nw.length : 0;
    node.length += (node.ne) ? node.ne.length : 0;
    node.length += (node.sw) ? node.sw.length : 0;
    node.length += (node.se) ? node.se.length : 0;
    if (!node.length) {
        return null;
    }

    // If only one child, the node could be removed
    return node;
};

/** hasInBBox function. */
Tree2d.Node.prototype.hasInBBox = function (x, y) {
    return x >= this.x - this.size
    && y >= this.y - this.size
    && x < this.x + this.size
    && y < this.y + this.size;
};

/** Counts the number of nodes present in a box. */
Tree2d.Node.prototype.count = function (xmin, ymin, xmax, ymax) {
    // If it is a leaf
    if (this.data !== null) {
        var x = this.x, y = this.y;
        var inside = (xmin <= x && x <= xmax && ymin <= y && y <= ymax);
        return (inside) ? this.length : 0;
    }
    // If it is a node
    var xminNode = this.x - this.size, xmaxNode = this.x + this.size;
    var yminNode = this.y - this.size, ymaxNode = this.y + this.size;
    // If outside
    if (xmax < xminNode || ymax < yminNode || xmin >= xmaxNode || ymin >= ymaxNode) {
        return 0;
    }
    // If included
    if (xmin <= xminNode && ymin <= yminNode && xmax >= xmaxNode && ymax >= ymaxNode) {
        return this.length;
    }
    // If overlapping
    var sum = 0;
    sum += (this.nw) ? this.nw.count(xmin, ymin, xmax, ymax) : 0;
    sum += (this.ne) ? this.ne.count(xmin, ymin, xmax, ymax) : 0;
    sum += (this.sw) ? this.sw.count(xmin, ymin, xmax, ymax) : 0;
    sum += (this.se) ? this.se.count(xmin, ymin, xmax, ymax) : 0;
    return sum;
};

export default Tree2d;
