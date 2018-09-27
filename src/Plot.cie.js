
let cieExtension = function (Plot) {

    Plot.prototype.addChromaticityDiagram = function(diagram, args) {
        var param = {
            "Planckian locus": true,
            "Daylight locus": true,
            "Spectrum locus": true,
            "Standards illuminants": true,
            "Gamut": true
        };

        var i;
        for (i in args) {
            if (args.hasOwnProperty(i)) {
                param[i] = args[i];
            }
        }

        if (diagram === 'rgY') {
            this.setTitle('CIE rg Diagram', 'r chromaticity', 'g chromaticity');
        } else if (diagram === 'xyY') {
            this.setTitle('CIE xy Diagram', 'x chromaticity', 'y chromaticity');
        } else if (diagram === '1960 uvY') {
            this.setTitle('CIE 1960 uv Diagram', 'u chromaticity', 'v chromaticity');
        } else if (diagram === "1976 u'v'Y") {
            this.setTitle("CIE 1976 u'v' Diagram", "u' chromaticity", "v' chromaticity");
        } else {
            throw new Error('Plot.drawChromaticityDiagram: ' +
            diagram + ' is not a chromaticity diagram.');
        }

        // Plot properties
        var pLProperties = {
            'id': 'Planckian locus',
            'stroke': 'black',
            'stroke-width': 1
        };
        var sLProperties = {
            'id': 'Spectrum locus',
            'stroke': 'lightseagreen',
            'stroke-width': 2,
            'stroke-dasharray': "5 2"
        };
        var pGProperties = {
            'id': 'Gamut',
            'stroke': 'red',
            'stroke-width': 1
        };
        var sIProperties = {
            'id': 'Standards illuminants',
            'stroke': 'none',
            'fill': 'none',
            'marker': {
                'shape': 'circle',
                'fill': 'orange',
                'size': 2,
                'stroke': 'none'
            }
        };

        // Get primaries Data
        var prim = CIE.getPrimaries('current', diagram);

        // Get standards illuminants data
        var stdIll = CIE.getIlluminantList();
        var xStdIll = [],
        yStdIll = [];

        var i;
        for (i = stdIll.length; i--; i) {
            var ill = CIE.getIlluminant(stdIll[i], diagram);
            xStdIll.push(ill[0]);
            yStdIll.push(ill[1]);
        }

        // Plot spectrum locus
        if (param["Spectrum locus"] === true) {
            var sL = CIE.getSpectrumLocus(diagram);
            this.addPath(sL[0], sL[1], sLProperties);
        }
        // Plot planckian locus
        if (param["Planckian locus"] === true) {
            var pL = CIE.getPlanckianLocus(diagram);
            this.addPath(pL[0], pL[1], pLProperties);
        }

        // Plot primaries gamut
        if (param["Gamut"] === true) {
            var xPrim = [prim[0], prim[3], prim[6], prim[0]];
            var yPrim = [prim[1], prim[4], prim[7], prim[1]];
            this.addPath(xPrim, yPrim, pGProperties);
        }

        // Plot standards illuminants
        if (param["Standards illuminants"] === true) {
            this.addPath(xStdIll, yStdIll, sIProperties);
        }

        return this;
    };

    Plot.prototype.properties.chromaticityPath = {
        'id': 'scatter',
        'fill': 'none',
        'stroke': 'none',
        'marker': {
            'shape': 'circle',
            'size': 0.25,
            'fill': 'blue'
        }
    };

    Plot.prototype.addChromaticitiesFromRgb = function(r, g, b, args, diagram, wp) {
        diagram = diagram || 'xyY';

        var defaultArgs = this.getProperties('chromaticityPath');
        var i, end;
        for (i in args) {
            if (args.hasOwnProperty(i)) {
                defaultArgs[i] = args[i];
            }
        }
        var N = r.length;
        var data = new Float32Array(N * 3),
        x = data.subarray(0, N),
        y = data.subarray(N, N * 2),
        z = data.subarray(N * 2);

        x.set(r);
        y.set(g);
        z.set(b);

        Matrix.Colorspaces['RGB to ' + diagram](data, N, N, 1, wp);
        this.addPath(x, y, defaultArgs);
        return this;
    };

};

export default cieExtension;
