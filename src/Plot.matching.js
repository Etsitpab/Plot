
export default function (Plot) {
    Plot.prototype.viewPatch = function(S, n, name, part) {
        const p = this;
        p.clear();
        const k = S.keypoints[n];
        let patch = k.descriptorsData[name].patch;
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
        this.clear();
        const scatterProperties = {
            "stroke": "none",
            "marker": {
                "shape": "circle",
                "fill": "red",
                "size": 2
            }
        };
        S.image.toImage(function() {
            this.addImage(this, 0, 0);
            const x = [], y = [], ie = S.keypoints.length;
            let i;
            for (i = 0; i < ie; i++) {
                x[i] = S.keypoints[i].x;
                y[i] = -S.keypoints[i].y;
            }
            this.addPath(x, y, scatterProperties);
            this.setTitle(S.keypoints.length + " Keypoints");
        });
        return this;
    };

    Plot.prototype.showMatches = async function(im1, im2, matches, align = "v") {
        this.clear();
        const [width, height] = im1.size();
        im1 = await im1.toImage();
        im2 = await im2.toImage();
        this.addImage(im1, 0, 0);

        // this.setTitle(m.length + " Matches");
        if (align.toLowerCase() === 'v') {
            this.addImage(im2, 0, -height);
            let i;
            for (i = 0; i < matches.length; i++) {
                const {k1, k2, isValid} = matches[i];
                this.addPath([k1.y, k2.y], [-k1.x, -height - k2.x], {
                    id: i,
                    stroke: isValid ? "lime" : "red"
                });
            }
        } else {
            this.addImage(im2, width, 0);
            let i;
            for (i = 0; i < matches.length; i++) {
                const {k1, k2, isValid} = matches[i];
                this.addPath([k1.y, k2.y + width], [-k1.x, -k2.x], {
                    id: i,
                    stroke: isValid ? "lime" : "red"
                });
            }
        }
    };
}
