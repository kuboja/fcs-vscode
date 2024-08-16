import { GrammarKind, GrammarType } from "./grammarType";

export const unitSpaceGrammarNodes = [

    new GrammarType({ dot: 0, key: "Unit", kind: GrammarKind.Module }),
    new GrammarType({ dot: 1, key: "Unit.List", description: "List of units", kind: GrammarKind.Property }),

    // angle
    new GrammarType({ dot: 1, key: "Unit.rad", description: "[radian] (1 rad = 1 )" }),
    new GrammarType({ dot: 1, key: "Unit.mrad", description: "[miliradian] (1 mrad = 0.001 )" }),
    new GrammarType({ dot: 1, key: "Unit.deg", description: "[degree] (1 deg = 0.0174532925199433 )" }),
    new GrammarType({ dot: 1, key: "Unit.grad", description: "[grad] (1 grad = 0.015707963267949 )" }),

    // length
    new GrammarType({ dot: 1, key: "Unit.m", description: "[metre] (1 m = 1 m)" }),
    new GrammarType({ dot: 1, key: "Unit.nm", description: "[nanometre] (1 nm = 1E-09 m)" }),
    new GrammarType({ dot: 1, key: "Unit.mm", description: "[milimetre] (1 mm = 0.001 m)" }),
    new GrammarType({ dot: 1, key: "Unit.cm", description: "[centimetre] (1 cm = 0.01 m)" }),
    new GrammarType({ dot: 1, key: "Unit.km", description: "[kilometre] (1 km = 1000 m)" }),
    new GrammarType({ dot: 1, key: "Unit.in", description: "[inch] (1 in = 0.0254 m)" }),
    new GrammarType({ dot: 1, key: "Unit.ft", description: "[feet] (1 ft = 0.3048 m)" }),
    new GrammarType({ dot: 1, key: "Unit.yd", description: "[yard] (1 yd = 0.9144 m)" }),
    new GrammarType({ dot: 1, key: "Unit.mi", description: "[mile] (1 mi = 1609.344 m)" }),

    // area
    new GrammarType({ dot: 1, key: "Unit.m2", description: "[metre square] (1 m² = 1 m²)" }),
    new GrammarType({ dot: 1, key: "Unit.mm2", description: "[milimetre square] (1 mm² = 1E-06 m²)" }),
    new GrammarType({ dot: 1, key: "Unit.cm2", description: "[centimetre square] (1 cm² = 0.0001 m²)" }),
    new GrammarType({ dot: 1, key: "Unit.in2", description: "[inch square] (1 in² = 0.00064516 m²)" }),
    new GrammarType({ dot: 1, key: "Unit.ft2", description: "[feet square] (1 ft² = 0.09290304 m²)" }),

    // volume
    new GrammarType({ dot: 1, key: "Unit.m3", description: "[cubic metre] (1 m³ = 1 m³)" }),
    new GrammarType({ dot: 1, key: "Unit.cm3", description: "[cubic centimetre] (1 cm³ = 1E-06 m³)" }),
    new GrammarType({ dot: 1, key: "Unit.mm3", description: "[cubic milimetre] (1 mm³ = 1E-09 m³)" }),
    new GrammarType({ dot: 1, key: "Unit.l", description: "[litre] (1 l = 0.001 m³)" }),
    new GrammarType({ dot: 1, key: "Unit.in3", description: "[cubic inch] (1 in³ = 1.6387064E-05 m³)" }),
    new GrammarType({ dot: 1, key: "Unit.ft3", description: "[cubic foot] (1 ft³ = 0.028316846592 m³)" }),
    new GrammarType({ dot: 1, key: "Unit.bsh", description: "[bushel] (1 bsh = 0.035239072 m³)" }),

    // second moment of area
    new GrammarType({ dot: 1, key: "Unit.m4", description: "[metre to the fourth power] (1 m⁴ = 1 m⁴)" }),
    new GrammarType({ dot: 1, key: "Unit.cm4", description: "[centimetre to the fourth power] (1 cm⁴ = 1E-08 m⁴)" }),
    new GrammarType({ dot: 1, key: "Unit.mm4", description: "[milimetre to the fourth power] (1 mm⁴ = 1E-12 m⁴)" }),
    new GrammarType({ dot: 1, key: "Unit.in4", description: "[inches to the fourth power] (1 in⁴ = 4.162314256E-07 m⁴)" }),
    new GrammarType({ dot: 1, key: "Unit.ft4", description: "[foot to the fourth power] (1 ft⁴ = 0.008630974841241602 m⁴)" }),

    // warping moment
    new GrammarType({ dot: 1, key: "Unit.m6", description: "[metre to the sixth power] (1 m⁶ = 1 m⁶)" }),
    new GrammarType({ dot: 1, key: "Unit.cm6", description: "[centimetre to the sixth power] (1 cm⁶ = 1E-12 m⁶)" }),
    new GrammarType({ dot: 1, key: "Unit.mm6", description: "[milimetre to the sixth power] (1 mm⁶ = 1E-18 m⁶)" }),
    new GrammarType({ dot: 1, key: "Unit.in6", description: "[inch to the sixth power] (1 in⁶ = 2.6853586654E-10 m⁶)" }),
    new GrammarType({ dot: 1, key: "Unit.ft6", description: "[foot to the sixth power] (1 ft⁶ = 0.0008018438 m⁶)" }),

    // force
    new GrammarType({ dot: 1, key: "Unit.N", description: "[newton] (1 N = 1 kg·m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kN", description: "[kilonewton] (1 kN = 1000 kg·m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.MN", description: "[meganewton] (1 MN = 1000000 kg·m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kp", description: "[kilopond] (1 kp = 9.80665 kg·m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbf", description: "[pound-force] (1 lbf = 4.44822162 kg·m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kip", description: "[kilopound] (1 kip = 4448.22162 kg·m/s²)" }),

    // moment / torque
    new GrammarType({ dot: 1, key: "Unit.Nm", description: "[newtonmetre] (1 Nm = 1 kg·m²/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kNm", description: "[kilonewtonmetre] (1 kNm = 1000 kg·m²/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.MNm", description: "[meganewtonmetre] (1 MNm = 1000000 kg·m²/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbfin", description: "[inch-pound] (1 lbf·in = 0.112984829148 kg·m²/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbfft", description: "[foot-pound] (1 lbf·ft = 1.355817949776 kg·m²/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kipft", description: "[foot-kilopound] (1 kip·ft = 1355.817949776 kg·m²/s²)" }),

    // pressure
    new GrammarType({ dot: 1, key: "Unit.Pa", description: "[pascal] (1 Pa = 1 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kPa", description: "[kilopascal] (1 kPa = 1000 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.MPa", description: "[megapascal] (1 MPa = 1000000 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.GPa", description: "[gigapascal] (1 GPa = 1000000000 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.bar", description: "[bar] (1 bar = 100000 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.mbar", description: "[milibar] (1 mbar = 100 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.torr", description: "[torr] (1 torr = 133 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.psi", description: "[pound-force per square inch] (1 psi = 6894.8 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.ksi", description: "[kilo-pound-force per square inch] (1 ksi = 6894800 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.psf", description: "[pound-force per square feet] (1 psf = 47.8802595 kg/m·s²)" }),

    // line force
    new GrammarType({ dot: 1, key: "Unit.N_m", description: "[newton per meter] (1 N·m = 1 kg/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kN_m", description: "[kilonewton per meter] (1 kN/m = 1000 kg/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbf_ft", description: "[pound-force per feet] (1 lbf/ft = 14.593902952755904 kg/s²)" }),

    // area force
    new GrammarType({ dot: 1, key: "Unit.N_m2", description: "[newton per square meter] (1 N/m² = 1 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kN_m2", description: "[kilonewton per square meter] (1 kN/m² = 1000 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbf_in2", description: "[pound-force per square inch] (1 lbf/in² = 6894.8 kg/m·s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbf_ft2", description: "[pound-force per square feet] (1 lbf/ft² = 47.8802595 kg/m·s²)" }),

    // volume force
    new GrammarType({ dot: 1, key: "Unit.N_m3", description: "[newton per square meter] (1 N/m³ = 1 kg/m²s²)" }),
    new GrammarType({ dot: 1, key: "Unit.kN_m3", description: "[kilonewton per square meter] (1 kN/m³ = 1000 kg/m²s²)" }),
    new GrammarType({ dot: 1, key: "Unit.lbf_ft3", description: "[pound-force per square feet] (1 lbf/ft³ = 157.08746401362004 kg/m²s²)" }),

    // mass
    new GrammarType({ dot: 1, key: "Unit.kg", description: "[kilogram] (1 kg = 1 kg)" }),
    new GrammarType({ dot: 1, key: "Unit.gr", description: "[gram] (1 gr = 0.001 kg)" }),
    new GrammarType({ dot: 1, key: "Unit.t", description: "[metric ton] (1 t = 1000 kg)" }),
    new GrammarType({ dot: 1, key: "Unit.lbm", description: "[pound-mass] (1 lbm = 0.45359237 kg)" }),
    new GrammarType({ dot: 1, key: "Unit.lb", description: "[pound-mass] (1 lbm = 0.45359237 kg)" }),

    // mass density
    new GrammarType({ dot: 1, key: "Unit.kg_m3", description: "[kilogram per cubic metre] (1 kg/m³ = 1 kg/m³)" }),
    new GrammarType({ dot: 1, key: "Unit.t_m3", description: "[ton per cubic metre] (1 t/m³ = 1000 kg/m³)" }),
    new GrammarType({ dot: 1, key: "Unit.kg_l ", description: "[kilogram per litre] (1 kg/l  = 1000 kg/m³)" }),
    new GrammarType({ dot: 1, key: "Unit.lbm_ft3", description: "[pound-mass per cubic foot] (1 lbm/ft³ = 16.0184633739601 kg/m³)" }),
    new GrammarType({ dot: 1, key: "Unit.lb_ft3", description: "[pound-mass per cubic foot] (1 lb/ft³ = 16.0184633739601 kg/m³)" }),
    new GrammarType({ dot: 1, key: "Unit.pcf", description: "[pound-mass per cubic foot] (1 pcf = 16.0184633739601 kg/m³)" }),

    // time
    new GrammarType({ dot: 1, key: "Unit.s", description: "[second] (1 s = 1 s)" }),
    new GrammarType({ dot: 1, key: "Unit.ms", description: "[milisecond] (1 ms = 0.001 s)" }),
    new GrammarType({ dot: 1, key: "Unit.min", description: "[minute] (1 min = 60 s)" }),
    new GrammarType({ dot: 1, key: "Unit.hr", description: "[hour] (1 hr = 3600 s)" }),
    new GrammarType({ dot: 1, key: "Unit.day", description: "[day] (1 day = 86400 s)" }),
    new GrammarType({ dot: 1, key: "Unit.week", description: "[week] (1 week = 604800 s)" }),

    // electric current
    new GrammarType({ dot: 1, key: "Unit.A", description: "[ampere] (1 A = 1 A)" }),
    new GrammarType({ dot: 1, key: "Unit.mA", description: "[miliampere] (1 mA = 0.001 A)" }),
    new GrammarType({ dot: 1, key: "Unit.kA", description: "[kiloampere] (1 kA = 1000 A)" }),

    // temperature
    new GrammarType({ dot: 1, key: "Unit.C", description: "[degree of celsius] (1 C = 1 K)" }),
    new GrammarType({ dot: 1, key: "Unit.K", description: "[kelvin] (1 K = 1 K)" }),
    new GrammarType({ dot: 1, key: "Unit.F", description: "[fahrenheit] (1 F = 0.555555555555556 K)" }),
    new GrammarType({ dot: 1, key: "Unit.R", description: "[rankine] (1 R = 0.555555555555556 K)" }),

    // amount of substance
    new GrammarType({ dot: 1, key: "Unit.mol", description: "[mole] (1 mol = 1 mol)" }),
    
    // luminous intensity
    new GrammarType({ dot: 1, key: "Unit.cd", description: "[candela] (1 cd = 1 cd)" }),

    // speed
    new GrammarType({ dot: 1, key: "Unit.m_s", description: "[metre per second] (1 m/s = 1 m/s)" }),
    new GrammarType({ dot: 1, key: "Unit.km_h", description: "[kilometre per hour] (1 km/h = 0.277777777777778 m/s)" }),
    new GrammarType({ dot: 1, key: "Unit.mph", description: "[mile per hour] (1 mph = 0.44704 m/s)" }),
    new GrammarType({ dot: 1, key: "Unit.fps", description: "[feet per second] (1 fps = 0.3048 m/s)" }),
    new GrammarType({ dot: 1, key: "Unit.ft_s", description: "[feet per second] (1 ft/s = 0.3048 m/s)" }),

    // acceleration
    new GrammarType({ dot: 1, key: "Unit.g", description: "[gravitational acceleration] (1 g = 9.80665 m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.m_s2", description: "[metre per second squared] (1 m/s² = 1 m/s²)" }),
    new GrammarType({ dot: 1, key: "Unit.ft_s2", description: "[feet per second squared] (1 ft/s² = 0.3048 m/s²)" }),

    // dynamic viscosity
    new GrammarType({ dot: 1, key: "Unit.Ns_m2", description: "[newton-second per square meter] (1 Ns_m2 = 1 kg/m·s)" }),
    new GrammarType({ dot: 1, key: "Unit.Pas", description: "[pascal-second] (1 Pas = 1 kg/m·s)" }),
    new GrammarType({ dot: 1, key: "Unit.mPas", description: "[milipascal-second] (1 mPas = 0.001 kg/m·s)" }),
    new GrammarType({ dot: 1, key: "Unit.P", description: "[poise] (1 P = 0.1 kg/m·s)" }),
    new GrammarType({ dot: 1, key: "Unit.cP", description: "[centipoise] (1 cP = 0.001 kg/m·s)" }),
    new GrammarType({ dot: 1, key: "Unit.lbfs_ft2", description: "[pound-force-seconds per square foot] (1 lbfs_ft2 = 47.88025903135139 kg/m·s)" }),

    // kinematic viscosity
    new GrammarType({ dot: 1, key: "Unit.m2_s", description: "[square meter per second] (1 m2_s = 1 m²/s)" }),
    new GrammarType({ dot: 1, key: "Unit.mm2_s", description: "[square milimeter per second] (1 mm2_s = 1E-06 m²/s)" }),
    new GrammarType({ dot: 1, key: "Unit.cm2_s", description: "[square centimeter per second] (1 cm2_s = 0.0001 m²/s)" }),
    new GrammarType({ dot: 1, key: "Unit.St", description: "[stokes] (1 St = 0.0001 m²/s)" }),
    new GrammarType({ dot: 1, key: "Unit.cSt", description: "[centistokes] (1 cSt = 1E-06 m²/s)" }),
    new GrammarType({ dot: 1, key: "Unit.ft2_s", description: "[square feet per second] (1 ft2_s = 0.09290304 m²/s" }),

]