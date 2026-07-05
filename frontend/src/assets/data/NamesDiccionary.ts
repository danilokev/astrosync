// constellations.ts
export const constellations: Record<string, string> = {
  And: "Andrómeda",
  Ant: "Antlia",
  Aps: "Ave del Paraíso",
  Aql: "Águila",
  Aqr: "Acuario",
  Ara: "Altar",
  Ari: "Aries",
  Aur: "Auriga",
  Boo: "Boyero",
  CMa: "Can Mayor",
  CMi: "Can Menor",
  CVn: "Canes Venatici",
  Cae: "Caelum",
  Cam: "Jirafa",
  Cap: "Capricornio",
  Car: "Carina",
  Cas: "Casiopea",
  Cen: "Centauro",
  Cep: "Cefeo",
  Cet: "Cetus",
  Cha: "Camaleón",
  Cir: "Circinus",
  Cnc: "Cáncer",
  Col: "Columba",
  Com: "Coma Berenices",
  CrA: "Corona Austral",
  CrB: "Corona Boreal",
  Crt: "Crater",
  Cru: "Cruz del Sur",
  Crv: "Corvus",
  Cyg: "Cygnus",
  Del: "Delfín",
  Dor: "Dorado",
  Dra: "Dragón",
  Equ: "Equuleus",
  Eri: "Erídano",
  For: "Fornax",
  Gem: "Géminis",
  Gru: "Grulla",
  Her: "Hércules",
  Hor: "Horologium",
  Hya: "Hidra",
  Hyi: "Hidrus",
  Ind: "Indus",
  LMi: "León Menor",
  Lac: "Lacerta",
  Leo: "Leo",
  Lep: "Liebre",
  Lib: "Libra",
  Lup: "Lupus",
  Lyn: "Lince",
  Lyr: "Lira",
  Men: "Mesa",
  Mic: "Microscopium",
  Mon: "Unicornio",
  Mus: "Mosca",
  Nor: "Norma",
  Oct: "Octans",
  Oph: "Ofiuco",
  Ori: "Orión",
  Pav: "Pavo",
  Peg: "Pegaso",
  Per: "Perseo",
  Phe: "Fénix",
  Pic: "Pictor",
  PsA: "Pez Austral",
  Psc: "Piscis",
  Pup: "Puppis",
  Pyx: "Brújula",
  Ret: "Retículo",
  Scl: "Sculptor",
  Sco: "Escorpio",
  Sct: "Escudo",
  Ser: "Serpens",
  Sex: "Sextans",
  Sge: "Sagitta",
  Sgr: "Sagitario",
  Tau: "Tauro",
  Tel: "Telescopium",
  TrA: "Triángulo Austral",
  Tri: "Triángulo",
  Tuc: "Tucana",
  UMa: "Osa Mayor",
  UMi: "Osa Menor",
  Vel: "Vela",
  Vir: "Virgo",
  Vol: "Volans",
  Vul: "Vulpecula"
};

function normalizeConstellation(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const constellationsReverse: Record<string, string> = {};

Object.entries(constellations).forEach(([abbr, name]) => {
  const normalized = normalizeConstellation(name);
  constellationsReverse[normalized] = abbr; // 👈 mantiene "And", "Ori", etc.
});

/**************
 *  USO:

import { constellations } from './constellations';

const abbrev = "Ori";
console.log(constellations[abbrev]); // "Orión"

***************/