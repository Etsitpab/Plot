
let matchingExtension = function (Plot) {
    Plot.prototype.viewPatch = function(S, n, name, part) {
        var p = this;
        p.clear();
        var k = S.keypoints[n];
        var patch = k.descriptorsData[name].patch;
        if (part === "norm") {
            patch = patch[part];
            patch = patch.rdivide(patch.max2());
        } else if (part === "RGB") {
            patch = patch[part];
        } else if (part === undefined) {
            patch = phaseNormImage(patch.phase, patch.norm, true, k.orientation);
        }
        patch.toImage(function() {
            //var axis = p.getCurrentAxis();
            p.remove("patch");
            // var shift = this.width / 2;
            // p.addImage(this, k.x - shift, -(k.y - shift), {id: "patch"});
            p.addImage(this, 0, 0, {
                id: "patch"
            });
            //p.setAxis(axis);
            p.setAxis();
            p.setTitle(name);
        });
    };

    Plot.prototype.showKeypoints = function(S) {
        var p = this;
        p.clear();
        S.image.toImage(function() {
            p.addImage(this, 0, 0);
            var scatterProperties = {
                "stroke": "none",
                "marker": {
                    "shape": "circle",
                    "fill": "red",
                    "size": 2
                }
            };

            var x = [],
            y = [];
            var i, ie;
            for (i = 0, ie = S.keypoints.length; i < ie; i++) {
                x[i] = S.keypoints[i].x;
                y[i] = -S.keypoints[i].y;
            }
            p.addPath(x, y, scatterProperties);
            p.setTitle(S.keypoints.length + " Keypoints");
        });
        return this;
    };

    Plot.prototype.showMatches = function(im1, im2, matches, align) {
        align = align || 'v';
        var p = this,
        offset;
        p.clear();

        if (align === 'v') {
            offset = im1.getSize(0);
            im1.toImage(function() {
                p.addImage(this, 0, 0);
                im2.toImage(function() {
                    p.addImage(this, 0, -offset);
                    var m = matches;
                    for (var i = 0; i < m.length; i++) {
                        var k1 = m[i].k1,
                        k2 = m[i].k2;
                        if (m[i].isValid) {
                            p.addPath([k1.x, k2.x], [-k1.y, -offset - k2.y], {
                                id: i,
                                stroke: "lime"
                            });
                        } else {
                            p.addPath([k1.x, k2.x], [-k1.y, -offset - k2.y], {
                                id: i,
                                stroke: "red"
                            });
                        }
                    }
                    // p.setTitle(m.length + " Matches");
                });
            });
        } else {
            offset = im1.getSize(1);
            im1.toImage(function() {
                p.addImage(this, 0, 0);
                im2.toImage(function() {
                    p.addImage(this, offset, 0);
                    var m = matches;
                    for (var i = 0; i < m.length; i++) {
                        var k1 = m[i].k1,
                        k2 = m[i].k2;
                        if (m[i].isValid) {
                            p.addPath([k1.x, k2.x + offset], [-k1.y, -k2.y], {
                                id: i,
                                stroke: "lime"
                            });
                        } else {
                            p.addPath([k1.x, k2.x + offset], [-k1.y, -k2.y], {
                                id: i,
                                stroke: "red"
                            });
                        }
                    }
                    // p.setTitle(m.length + " Matches");
                });
            });
        }
    };
}

export default matchingExtension;
