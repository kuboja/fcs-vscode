"use strict";

import * as vscode from "vscode";


export enum GrammarKind {
    Constant,
    Function,
    FunctionEmpty,
    Object,
    Property,
    Module,
    Order,
    OrderWithoutParameters,
}

export class GrammarType {
    public dot: number;
    public key: string;
    public description: string;
    public kind: GrammarKind = GrammarKind.Constant;

    public constructor(init?: Partial<GrammarType>) {
        Object.assign(this, init);
    }

    private _completionItem: vscode.CompletionItem;

    public GetCompletionItem(): vscode.CompletionItem {
        if (this._completionItem) {
            return this._completionItem;
        }

        var itemLabel: string = this.name;
        var itemKind: vscode.CompletionItemKind = this.GetCompletionItemKind();

        var item: vscode.CompletionItem = new vscode.CompletionItem(itemLabel, itemKind);
        item.detail = this.description;

        if (this.kind === GrammarKind.Function) {
            item.insertText = new vscode.SnippetString( itemLabel + "( ${1} )" );
        } else if (this.kind === GrammarKind.FunctionEmpty) {
            item.insertText = itemLabel + "()";
        } else if (this.kind === GrammarKind.Object) {
            item.insertText = new vscode.SnippetString( itemLabel + "{ ${1} }" );
        } else if (this.kind === GrammarKind.Order) {
            item.insertText = itemLabel + " ";
        }

        this._completionItem = item;

        return item;
    }

    private GetCompletionItemKind(): vscode.CompletionItemKind {
        switch (this.kind) {
            case GrammarKind.Constant:
                return vscode.CompletionItemKind.Constant;
            case GrammarKind.Function:
                return vscode.CompletionItemKind.Function;
            case GrammarKind.FunctionEmpty:
                return vscode.CompletionItemKind.Function;
            case GrammarKind.Object:
                return vscode.CompletionItemKind.Class;
            case GrammarKind.Property:
                return vscode.CompletionItemKind.Property;
            case GrammarKind.Module:
                return vscode.CompletionItemKind.Module;
            case GrammarKind.Order:
                return vscode.CompletionItemKind.Keyword;
            case GrammarKind.OrderWithoutParameters:
                return vscode.CompletionItemKind.Keyword;

            default:
                return vscode.CompletionItemKind.Property;
        }
    }

    public get name(): string {
        var nodes: string[] = this.key.split(".");
        if (nodes && nodes.length > 0) {
            return nodes[nodes.length - 1];
        } else {
            return this.key;
        }
    }
}

export class FcsGrammar {

    private _grammarNodes : GrammarType[];

    get GrammarNodes(): GrammarType[] {
        if (this._grammarNodes) {
            return this._grammarNodes;
        } else {
            this._grammarNodes = grammarNodes;
            return grammarNodes;
        }
    }


    /** Match last word in text preceded by space or open paren/bracket. */
    // private priorWordPattern = /[\s\(\[]([A-Za-z0-9_\.]+)\s*$/;
    private priorWordPattern = /([A-Za-z][A-Za-z0-9_\.]*)$$/;

    public dotBefore(doc: vscode.TextDocument, pos: vscode.Position, currentWord: string): boolean {
        var text: string = doc.lineAt(pos.line).text;
        var currentWordLength: number = (currentWord) ? currentWord.length : 0;
        return text.substring(pos.character - 1 - currentWordLength, pos.character - currentWordLength) === ".";
    }

    /**
     * Get the previous word adjacent to the current position by getting the
     * substring of the current line up to the current position then use a compiled
     * regular expression to match the word nearest the end.
     */
    public priorWord(doc: vscode.TextDocument, pos: vscode.Position): string {
        var line: vscode.TextLine = doc.lineAt(pos.line);
        var text: string = line.text;
        const match: RegExpExecArray = this.priorWordPattern.exec(text.substring(0, pos.character));
        return (match && match.length > 1) ? match[1] : null;
    }

    /**
     * Get the word at the current position.
     */
    public currentWord(doc: vscode.TextDocument, pos: vscode.Position): string {
        const range: vscode.Range = doc.getWordRangeAtPosition(pos);
        return (range && !range.isEmpty) ? doc.getText(range) : null;
    }

}

const grammarNodes : GrammarType[] = [

    new GrammarType({ dot : 0, key : "Atan2", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Log10", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Exp", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Sqrt", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Sin", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Asin", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Cos", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Tan", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Abs", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Argb", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Max", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Min", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Round", kind : GrammarKind.Function }),
    new GrammarType({ dot : 0, key : "Truncate", kind : GrammarKind.Function }),

    new GrammarType({ dot : 0, key : "False", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 0, key : "True", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 0, key : "PI", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 0, key : "print", kind : GrammarKind.Order }),
    new GrammarType({ dot : 0, key : "browse_report", kind : GrammarKind.Order }),
    new GrammarType({ dot : 0, key : "import", kind : GrammarKind.Order }),
    new GrammarType({ dot : 0, key : "model_shell3d", kind : GrammarKind.OrderWithoutParameters }),
    new GrammarType({ dot : 0, key : "exportesaxml", kind : GrammarKind.Order }),

    new GrammarType({ dot : 0, key : "Math", kind : GrammarKind.Module }),
    new GrammarType({ dot : 1, key : "Math.ToInteger", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "Math.Interval", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "Math.Interval1D", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Math.Interval1D.Intersection", kind : GrammarKind.Function }),

    new GrammarType({ dot : 0, key : "GCS", kind : GrammarKind.Module }),
    new GrammarType({ dot : 1, key : "GCS.Rx", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.Ry", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.Rz", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.Tx", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.Ty", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.Tz", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.Origin", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 1, key : "GCS.Axes", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "GCS.Axes.Rx", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "GCS.Axes.Ry", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "GCS.Axes.Rz", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "GCS.GetLCS", kind : GrammarKind.FunctionEmpty }),
    new GrammarType({ dot : 2, key : "GCS.GetLCS().PointToGcs", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "GCS.GetLCS().GcsToLcs", kind : GrammarKind.Function }),

    new GrammarType({ dot : 0, key : "Fcs", kind : GrammarKind.Module }),

    new GrammarType({ dot : 1, key : "Fcs.Symbol", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Pow", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Log", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Exp", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Max", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Min", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Abs", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Sin", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Cos", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Tan", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Cotan", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Asin", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Acos", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Atan", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Sqrt", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Brace", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Constant", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Undefined", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Match", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Greater", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.GreaterOrEqual", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Between", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.LessOrEqual", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Less", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Conditional", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Switch", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Symbol.Case", kind : GrammarKind.Function }),

    new GrammarType({ dot : 1, key : "Fcs.EngineeringQuantity", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Coefficient", description : "coefficient [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Factor", description : "factor [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Multiplier", description : "multiplier [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.FactorPerLength", description : "factor per length [1/m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.FactorPerArea", description : "factor per area [1/m²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.StructureSlope", description : "structural slope [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.StructureAngle", description : "structural angle [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Slope", description : "slope [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Angle", description : "angle [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.CrossSectionAngle", description : "cross section angle [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Length", description : "length [m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Area", description : "area [m²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Volume", description : "volume [m³]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.StructureLength", description : "structural length [m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.DoorLength", description : "door length [m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.CrossSectionLength", description : "cross section length [m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.CrossSectionArea", description : "cross section area [m²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.CrossSectionModulus", description : "cross section modulus [m³]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.CrossSectionInertia", description : "cross section inertia [m⁴]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.CrossSectionWarpInertia",
        description : "cross section inertia in warping [m⁶]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Force", description : "force [kgm/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.BeamInternalForce", description : "beam internal force [kgm/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.BeamBendingMoment", description : "beam bending moment [kgm²/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.ShellInternalForce", description : "shell internal force [kg/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.ShellBendingMoment", description : "shell bending moment [kgm/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.LoadForce", description : "load force [kgm/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.LoadMoment", description : "load moment [kgm²/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.LoadForcePerLength",
        description : "load force per length intensity [kg/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.LoadMomentPerLength",
        description : "load moment per length intensity [kgm/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.LoadForcePerArea", description : "load force per area intensity [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.MassDensity", description : "volumetric mass density [kg/m³]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Mass", description : "mass [kg]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Speed", description : "speed [m/s]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Velocity", description : "velocity [m/s]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Acceleration", description : "acceleration [m/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.SpecificWeight", description : "specific weight [kg/m²s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Pressure", description : "pressure [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Stress", description : "stress [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.MaterialStrength", description : "material strenght [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.MaterialYieldLimit", description : "material yield strenght [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.MaterialUltimateLimit", description : "material ultimate strenght [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.MaterialElasticModulus",
        description : "material modulus of elasticity [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Time", description : "time [s]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.ConcreteAge", description : "concrete age [s]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Displacement", description : "displacement [m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Rotation", description : "rotation [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.DeformationTorque", description : "torque deformation [1/m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Curvature", description : "curvature [1/m]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.DeformationEnergy", description : "deformation energy [kgm²/s²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.EnergyDensity", description : "energy density [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.DeformationStrain", description : "strain [-]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.FluidVelocity", description : "fluid velocity [m/s]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.FluidVorticity", description : "fluid vorticity [1/s]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.FluidPressure", description : "fluid pressure [kg/ms²]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.Temperature", description : "temperature [K]"}),
    new GrammarType({ dot : 2, key : "Fcs.EngineeringQuantity.HeatFlux", description : "heat flux [kg/s³})]"}),

    new GrammarType({ dot : 0, key : "Unit", kind: GrammarKind.Module}),
    new GrammarType({ dot : 1, key : "Unit.List", description : "List of units", kind: GrammarKind.Property}),
    new GrammarType({ dot : 1, key : "Unit.rad", description : "[radian] (1 rad = 1 )"}),
    new GrammarType({ dot : 1, key : "Unit.mrad", description : "[miliradian] (1 mrad = 0.001 )"}),
    new GrammarType({ dot : 1, key : "Unit.deg", description : "[degree] (1 deg = 0.0174532925199433 )"}),
    new GrammarType({ dot : 1, key : "Unit.grad", description : "[grad] (1 grad = 0.015707963267949 )"}),
    new GrammarType({ dot : 1, key : "Unit.m", description : "[metre] (1 m = 1 m)"}),
    new GrammarType({ dot : 1, key : "Unit.nm", description : "[nanometre] (1 nm = 1E-09 m)"}),
    new GrammarType({ dot : 1, key : "Unit.mm", description : "[milimetre] (1 mm = 0.001 m)"}),
    new GrammarType({ dot : 1, key : "Unit.cm", description : "[centimetre] (1 cm = 0.01 m)"}),
    new GrammarType({ dot : 1, key : "Unit.km", description : "[kilometre] (1 km = 1000 m)"}),
    new GrammarType({ dot : 1, key : "Unit.in", description : "[inch] (1 in = 0.0254 m)"}),
    new GrammarType({ dot : 1, key : "Unit.ft", description : "[feet] (1 ft = 0.3048 m)"}),
    new GrammarType({ dot : 1, key : "Unit.m2", description : "[metre square] (1 m² = 1 m²)"}),
    new GrammarType({ dot : 1, key : "Unit.mm2", description : "[milimetre square] (1 mm² = 1E-06 m²)"}),
    new GrammarType({ dot : 1, key : "Unit.cm2", description : "[centimetre square] (1 cm² = 0.0001 m²)"}),
    new GrammarType({ dot : 1, key : "Unit.in2", description : "[inch square] (1 in² = 0.00064516 m²)"}),
    new GrammarType({ dot : 1, key : "Unit.m3", description : "[cubic metre] (1 m³ = 1 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.mm3", description : "[cubic milimetre] (1 mm³ = 1E-09 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.cm3", description : "[cubic centimetre] (1 cm³ = 1E-06 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.in3", description : "[cubic inch] (1 in³ = 1.6387064E-05 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.ft3", description : "[cubic foot] (1 ft³ = 0.028316846592 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.bsh", description : "[bushel] (1 bsh = 0.035239072 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.l", description : "[litre] (1 l = 0.001 m³)"}),
    new GrammarType({ dot : 1, key : "Unit.N", description : "[newton] (1 N = 1 kgm/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.kN", description : "[kilonewton] (1 kN = 1000 kgm/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.MN", description : "[meganewton] (1 MN = 1000000 kgm/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.kp", description : "[kilopond] (1 kp = 9.80665 kgm/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.lbf", description : "[pound-force] (1 lbf = 4.44822162 kgm/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.kip", description : "[kilopound] (1 kip = 4448.22162 kgm/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.Nm", description : "[newtonmetre] (1 Nm = 1 kgm²/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.kNm", description : "[kilonewtonmetre] (1 kNm = 1000 kgm²/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.MNm", description : "[meganewtonmetre] (1 MNm = 1000000 kgm²/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.lbfin", description : "[inch-pound] (1 lbfin = 0.112984829148 kgm²/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.lbfft", description : "[foot-pound] (1 lbfft = 1.355817949776 kgm²/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.kipft", description : "[foot-kilopound] (1 kipft = 1355.817949776 kgm²/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.Pa", description : "[pascal] (1 Pa = 1 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.kPa", description : "[kilopascal] (1 kPa = 1000 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.MPa", description : "[megapascal] (1 MPa = 1000000 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.psi", description : "[pound per square inch] (1 psi = 6894.8 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.psf", description : "[pound per square feet] (1 psf = 47.8802595 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.ksi", description : "[kilo-pound per square inch] (1 ksi = 6894800 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.N_m", description : "[newton per meter] (1 N·m = 1 kg/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.kN_m", description : "[kilonewton per meter] (1 kN/m = 1000 kg/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.N_m2", description : "[newton per square meter] (1 N/m² = 1000 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.kN_m2", description : "[kilonewton per square meter] (1 kN/m² = 1000 kg/ms²)"}),
    new GrammarType({ dot : 1, key : "Unit.kg", description : "[kilogram] (1 kg = 1 kg)"}),
    new GrammarType({ dot : 1, key : "Unit.gr", description : "[gram] (1 gr = 0.001 kg)"}),
    new GrammarType({ dot : 1, key : "Unit.t", description : "[metric ton] (1 t = 1000 kg)"}),
    new GrammarType({ dot : 1, key : "Unit.lbm", description : "[pound-mass] (1 lbm = 0.45359237 kg)"}),
    new GrammarType({ dot : 1, key : "Unit.kg_m3", description : "[kilogram per cubic metre] (1 kg/m³ = 1 kg/m³)"}),
    new GrammarType({ dot : 1, key : "Unit.t_m3", description : "[ton per cubic metre] (1 t/m³ = 1000 kg/m³)"}),
    new GrammarType({ dot : 1, key : "Unit.kg_l ", description : "[kilogram per litre] (1 kg/l  = 1000 kg/m³)"}),
    new GrammarType({ dot : 1, key : "Unit.lbm_ft3", description : "[poud per cubic foot] (1 lbm/ft³ = 16.0184633739601 kg/m³)"}),
    new GrammarType({ dot : 1, key : "Unit.s", description : "[second] (1 s = 1 s)"}),
    new GrammarType({ dot : 1, key : "Unit.ms", description : "[milisecond] (1 ms = 0.001 s)"}),
    new GrammarType({ dot : 1, key : "Unit.min", description : "[minute] (1 min = 60 s)"}),
    new GrammarType({ dot : 1, key : "Unit.hr", description : "[hour] (1 hr = 3600 s)"}),
    new GrammarType({ dot : 1, key : "Unit.day", description : "[day] (1 day = 86400 s)"}),
    new GrammarType({ dot : 1, key : "Unit.week", description : "[week] (1 week = 604800 s)"}),
    new GrammarType({ dot : 1, key : "Unit.A", description : "[ampere] (1 A = 1 A)"}),
    new GrammarType({ dot : 1, key : "Unit.mA", description : "[miliampere] (1 mA = 0.001 A)"}),
    new GrammarType({ dot : 1, key : "Unit.kA", description : "[kiloampere] (1 kA = 1000 A)"}),
    new GrammarType({ dot : 1, key : "Unit.C", description : "[degree of celsius] (1 C = 1 K)"}),
    new GrammarType({ dot : 1, key : "Unit.K", description : "[kelvin] (1 K = 1 K)"}),
    new GrammarType({ dot : 1, key : "Unit.F", description : "[fahrenheit] (1 F = 0.555555555555556 K)"}),
    new GrammarType({ dot : 1, key : "Unit.R", description : "[rankine] (1 R = 0.555555555555556 K)"}),
    new GrammarType({ dot : 1, key : "Unit.mol", description : "[mole] (1 mol = 1 mol)"}),
    new GrammarType({ dot : 1, key : "Unit.cd", description : "[candela] (1 cd = 1 cd)"}),
    new GrammarType({ dot : 1, key : "Unit.m_s", description : "[metre per second] (1 m/s = 1 m/s)"}),
    new GrammarType({ dot : 1, key : "Unit.km_h", description : "[kilometre per hour] (1 km/h = 0.277777777777778 m/s)"}),
    new GrammarType({ dot : 1, key : "Unit.g", description : "[gravitational acceleration] (1 g = 9.80665 m/s²)"}),
    new GrammarType({ dot : 1, key : "Unit.m_s2", description : "[metre per second squared] (1 m/s² = 1 m/s²)"}),

    new GrammarType({ dot : 1, key : "Fcs.Units", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Units.Setup", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Units.DefaultSI", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Units.DefaultFEM", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Units.DefaultSteel", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Units.DefaultImperialUS", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 1, key : "Fcs.Geometry", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Geometry.Vertex3D", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Geometry.Tools", kind : GrammarKind.Module }),
    new GrammarType({ dot : 3, key : "Fcs.Geometry.Tools.CreateDefaultLcsByTwoPoints", kind : GrammarKind.Function }),
    new GrammarType({ dot : 3, key : "Fcs.Geometry.Tools.CreateDefaultLcsByTwoPoints", kind : GrammarKind.Function }),
    new GrammarType({ dot : 3, key : "Fcs.Geometry.Tools.GetLinesIntersection", kind : GrammarKind.Function }),


    new GrammarType({ dot : 1, key : "Fcs.Converters", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Converters.StringToMd5Hash", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Converters.IntegerToRomanic", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Converters.EnumerableRange", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Converters.ToJson", kind : GrammarKind.Function }),

    new GrammarType({ dot : 1, key : "Fcs.Object", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Object.HasProperty", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Object.FindProperty", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Object.HasPropertyChainValue", kind : GrammarKind.Function }),

    new GrammarType({ dot : 1, key : "Fcs.Analysis", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Analysis.ResultCase", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Analysis.Result", kind : GrammarKind.Module }),

    new GrammarType({ dot : 3, key : "Fcs.Analysis.Result.Beam", kind : GrammarKind.Module }),

    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.N", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.Vy", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.Vz", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.Mx", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.My", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.My_mid", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.Mz", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.Mz_mid", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Beam.Central", kind : GrammarKind.Module }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.N", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.Vy", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.Vz", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.Mx", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.My", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.Mz", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.My_mid", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 5, key : "Fcs.Analysis.Result.Beam.Central.Mz_mid", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 3, key : "Fcs.Analysis.Result.Displacement", kind : GrammarKind.Module }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Displacement.Y", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Displacement.Z", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 3, key : "Fcs.Analysis.Result.Rotation", kind : GrammarKind.Module }),
    new GrammarType({ dot : 4, key : "Fcs.Analysis.Result.Rotation.Total", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 1, key : "Fcs.Reporting", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Setup", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Document", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Chapter", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Paragraph", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Text", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Symbol", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.LocalizedText", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Table", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Reporting.Table", kind : GrammarKind.Module }),
    new GrammarType({ dot : 3, key : "Fcs.Reporting.Table.Row", kind : GrammarKind.Function }),

    new GrammarType({ dot : 1, key : "Fcs.Diagnostics", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Diagnostics.Format", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Diagnostics.Clock", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Diagnostics.Clock2", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Diagnostics.TestSuite", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Diagnostics.Test", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Diagnostics.TraceDepth", kind : GrammarKind.Module }),
    new GrammarType({ dot : 3, key : "Fcs.Diagnostics.TraceDepth.Trace", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 1, key : "Fcs.Math", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Math.CylinderFieldBiCubicResamplingAndInterpolation", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Math.CylinderFieldBiCubic", kind : GrammarKind.Object }),

    new GrammarType({ dot : 1, key : "Fcs.Assembly", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.All", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.AllBeams", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.BeamsInLayers", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.BeamNameAndAbsoluteInterval", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.BeamByName", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.BeamByPath", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.BeamsInLayers", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.Union", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.BucketDefinition", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Assembly.Collector", kind : GrammarKind.Object }),

    new GrammarType({ dot : 1, key : "Fcs.Action", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Action.LoadCase", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Action.ResultClass", kind : GrammarKind.Object }),

    new GrammarType({ dot : 1, key : "Fcs.Mesh", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Mesh.ConnectRules", kind : GrammarKind.Module }),
    new GrammarType({ dot : 3, key : "Fcs.Mesh.ConnectRules.ConnectClub", kind : GrammarKind.Object }),
    new GrammarType({ dot : 3, key : "Fcs.Mesh.ConnectRules.HangingNodes", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Mesh.Element", kind : GrammarKind.Module }),
    new GrammarType({ dot : 3, key : "Fcs.Mesh.Element.Quadrilateral", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 1, key : "Fcs.Parameter", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ListType", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ListTypeOption", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemDouble", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemInteger", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemArray", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemList", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemAction", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemString", kind : GrammarKind.Object }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemClass", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcs.Parameter.ItemComment", kind : GrammarKind.Constant }),

    new GrammarType({ dot : 1, key : "Fcs.Exception", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcs.Exception.Throw", kind : GrammarKind.Function }),

    new GrammarType({ dot : 0, key : "Fcm", kind : GrammarKind.Module }),
    new GrammarType({ dot : 1, key : "Fcm.Mesh", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcm.Mesh.ConnectRules", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcm.Mesh.AutoConnect", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcm.Mesh.WeldNodes", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcm.Mesh.ElementSize", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 2, key : "Fcm.Mesh.DefaultElementType2D", kind : GrammarKind.Constant }),
    new GrammarType({ dot : 1, key : "Fcm.GetAnalysis", kind : GrammarKind.Function }),
    new GrammarType({ dot : 1, key : "Fcm.ResourceReader", kind : GrammarKind.Module }),
    new GrammarType({ dot : 2, key : "Fcm.ResourceReader.ReadAsBase64", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcm.ResourceReader.ReadJsonAsDynamicObjectArray", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcm.ResourceReader.ReadGridValues", kind : GrammarKind.Function }),
    new GrammarType({ dot : 2, key : "Fcm.BomItems", kind : GrammarKind.Constant }),

    new GrammarType({ dot : -1, key : "ToString", kind : GrammarKind.FunctionEmpty }),

    new GrammarType({ dot : -1, key : "Select", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Aggregate", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Max", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "MaxBy", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "IndexOfMax", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Min", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "MinBy", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "IndexOfMin", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "OrderByAscending", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "OrderByAscendingMore", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "OrderByDescending", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "OrderByDescendingMore", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Where", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Find", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "FindOrDefault", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Take", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Skip", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Reverse", kind : GrammarKind.FunctionEmpty, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Zip", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "CollectBy", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "CumulativeSums", kind : GrammarKind.Constant, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Sum", kind : GrammarKind.Constant, description : "Array function" }),
    new GrammarType({ dot : -1, key : "SumItems", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Buckets", kind : GrammarKind.Constant, description : "Array function" }),
    new GrammarType({ dot : -1, key : "IsEmpty", kind : GrammarKind.Constant, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Count", kind : GrammarKind.Constant, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Empty", kind : GrammarKind.Constant, description : "Array function" }),
    new GrammarType({ dot : -1, key : "GetSpacings", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "GetCumulativeSums", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Any", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "All", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "Mul", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "MultiplyElements", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "MaskedSpanSums", kind : GrammarKind.Function, description : "Array function" }),
    new GrammarType({ dot : -1, key : "MergeDoubles", kind : GrammarKind.Function, description : "Array function" }),

    new GrammarType({ dot : -1, key : "Substring", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "Contains", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "EndsWith", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "IndexOf", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "LastIndexOf", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "Trim", kind : GrammarKind.FunctionEmpty, description : "String function" }),
    new GrammarType({ dot : -1, key : "Insert", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "Replace", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "Remove", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "ToLower", kind : GrammarKind.FunctionEmpty, description : "String function" }),
    new GrammarType({ dot : -1, key : "ToUpper", kind : GrammarKind.FunctionEmpty, description : "String function" }),
    new GrammarType({ dot : -1, key : "StartsWith", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "PadLeft", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "PadRight", kind : GrammarKind.Function, description : "String function" }),
    new GrammarType({ dot : -1, key : "Length", kind : GrammarKind.Constant, description : "String function" }),

];