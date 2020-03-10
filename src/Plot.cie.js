import CIE, {illuminants}   from "@etsitpab/cie";
import ColorConversions     from "@etsitpab/colorconversions";

export default function (Plot) {

    Plot.prototype.addChromaticityDiagram = function(diagram, args) {
        const param = Object.assign({
            "Planckian locus": true,
            "Daylight locus": true,
            "Spectrum locus": true,
            "Standards illuminants": true,
            "Gamut": true
        }, args);

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
        const pLProperties = {
            'id': 'Planckian locus',
            'stroke': 'black',
            'stroke-width': 1
        };
        const sLProperties = {
            'id': 'Spectrum locus',
            'stroke': 'lightseagreen',
            'stroke-width': 2,
            'stroke-dasharray': "5 2"
        };
        const pGProperties = {
            'id': 'Gamut',
            'stroke': 'red',
            'stroke-width': 1
        };
        const sIProperties = {
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
        const prim = CIE.getPrimaries('current', diagram);

        // Plot spectrum locus
        if (param["Spectrum locus"] === true) {
            const sL = CIE.getSpectrumLocus(diagram);
            this.addPath(sL[0], sL[1], sLProperties);
        }
        // Plot planckian locus
        if (param["Planckian locus"] === true) {
            const pL = CIE.getPlanckianLocus(diagram);
            this.addPath(pL[0], pL[1], pLProperties);
        }

        // Plot primaries gamut
        if (param["Gamut"] === true) {
            const xPrim = [prim[0], prim[3], prim[6], prim[0]];
            const yPrim = [prim[1], prim[4], prim[7], prim[1]];
            this.addPath(xPrim, yPrim, pGProperties);
        }

        // Plot standards illuminants
        if (param["Standards illuminants"] === true) {
            // Get standards illuminants data
            const xStdIll = [], yStdIll = [];
            let illName;
            for (illName of Object.keys(illuminants)) {
                const ill = CIE.getIlluminant(illName, diagram);
                xStdIll.push(ill[0]);
                yStdIll.push(ill[1]);
            }
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

    Plot.prototype.addChromaticitiesFromRgb = function(r, g, b, args, diagram = "xyY", wp = undefined) {
        const defaultArgs = Object.assign(this.getProperties('chromaticityPath'), args);
        const N = r.length;
        const data = new Float32Array(N * 3),
            x = data.subarray(0, N),
            y = data.subarray(N, N * 2),
            z = data.subarray(N * 2);

        x.set(r);
        y.set(g);
        z.set(b);

        ColorConversions['RGB to ' + diagram](data, N, N, 1, wp);
        this.addPath(x, y, defaultArgs);
        return this;
    };

};
