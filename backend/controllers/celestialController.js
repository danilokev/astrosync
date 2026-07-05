const formats_utils = require('../utils/formats_utils');
const { JSDOM } = require('jsdom');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en ms.
const wikidataCache = new Map();
const commonsCache = new Map();
const wikipediaCache = new Map();
const Star = require('../models/stars');
const CuerpoCeleste = require('../models/cuerposCelestes');
const constellations = require('../data/ConstellationNamesDictionary');

function getCached(cache, key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCached(cache, key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Listado de planetas (+ Luna y Sol) y sus identificadores en Wikidata
const CELESTIAL_BODIES = {
  Mercury: 'Q308',
  Venus: 'Q313',
  Mars: 'Q111',
  Jupiter: 'Q319',
  Saturn: 'Q193',
  Uranus: 'Q324',
  Neptune: 'Q332',
  Pluto: 'Q339',
  Moon: 'Q405',
  Sun: 'Q525',
};

PARSECS_TO_LIGHT_YEARS_MULTIPLY_FACTOR = 3.262;

// Ejemplo petición Wikidata
/*
SELECT ?item ?itemLabel ?itemImage ?esArticle
WHERE
{
  BIND(wd:Q308 AS ?item)
  
  OPTIONAL { ?item wdt:P18 ?itemImage . }

  # Artículo en Wikipedia ES del componente
  OPTIONAL {
    ?esArticle schema:about ?item ;
               schema:isPartOf <https://es.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
}
*/

// Licencias permitidas
const ALLOWED_LICENSE_URLS = [
  'https://creativecommons.org/licenses/by/3.0',
  'https://creativecommons.org/licenses/by/4.0',
  'https://creativecommons.org/licenses/by-sa/3.0',
  'https://creativecommons.org/licenses/by-sa/4.0',
  'https://creativecommons.org/publicdomain/',
];

// Obtención de licencia de imagen (con caché)
async function getCommonsImageInfo(imageUrl) {
  const cached = getCached(commonsCache, imageUrl);
  if (cached) return cached;

  const fileName = decodeURIComponent(imageUrl.split('/').pop());

  const apiUrl =
    'https://commons.wikimedia.org/w/api.php' +
    '?action=query' +
    '&titles=File:' +
    encodeURIComponent(fileName) +
    '&prop=imageinfo' +
    '&iiprop=extmetadata' +
    '&format=json' +
    '&origin=*';

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Astrosync/1.0',
    },
  });

  const bodyText = await res.text();
  if (!res.ok) {
    console.error(
      'Commons API returned non-OK status',
      res.status,
      apiUrl,
      bodyText,
    );
    setCached(commonsCache, imageUrl, null);
    return null;
  }

  let json;
  try {
    json = JSON.parse(bodyText);
  } catch (error) {
    console.error(
      'Failed to parse Commons API response as JSON',
      apiUrl,
      bodyText.slice(0, 500),
      error,
    );
    setCached(commonsCache, imageUrl, null);
    return null;
  }

  const pages = json.query.pages;
  const page = pages[Object.keys(pages)[0]];
  if (!page.imageinfo) {
    setCached(commonsCache, imageUrl, null);
    return null;
  }

  const meta = page.imageinfo[0].extmetadata;

  const result = {
    license: meta.LicenseShortName?.value || null,
    licenseUrl: meta.LicenseUrl?.value || null,
    artist: meta.Artist?.value || null,
    attributionRequired: meta.AttributionRequired?.value === 'true',
    credit: meta.Credit?.value || null,
  };

  setCached(commonsCache, imageUrl, result);
  return result;
}

// Normalizar datos de licencia
function normalizeHtmlField(html) {
  if (!html || typeof html !== 'string') return null;

  // Decodificamos los caracteres Unicode si hay
  html = html
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>')
    .replace(/&amp;/g, '&');

  // Usamos JSDOM para extraer texto y enlaces
  const dom = new JSDOM(html);
  const doc = dom.window.document.body;

  // Buscamos primer <a>, si hay
  const a = doc.querySelector('a');
  if (a) {
    let href = a.getAttribute('href');
    if (href && href.startsWith('//')) href = 'https:' + href;
    const text = a.textContent.trim();
    return { name: text, profileUrl: href };
  }

  // Si no hay <a>, devolvemos texto
  const text = doc.textContent.trim();
  if (text) return { text };

  return null;
}

// Obtener información sobre la estrella usando sus identificadores de diferentes catálogos
// Adicionalmente permite la exportación en diferentes fromatos (PDF, ePub, XML y HTML) al indicarle el parámetro format
const getCelestialInfo = async (req, res) => {
  try {
    const { hip, hd, hr, gl, format } = req.query;

    // 1. Construimos VALUES según identificadores recibidos
    const codes = [];

    if (hip) codes.push(`"HIP ${hip}"`);
    if (hd) codes.push(`"HD ${hd}"`);
    if (hr) codes.push(`"HR ${hr}"`);
    if (gl) codes.push(`"${gl}"`);

    // Obtenemos datos de MongoDB
    const query = {};
    if (hip) query.hip = hip;
    if (hd) query.hd = hd;
    if (hr) query.hr = hr;
    if (gl) query.gl = gl;

    const mongoData = await Star.findOne(query).lean();

    if (codes.length === 0) {
      return res.status(400).json({ error: 'No identifiers provided.' });
    }

    // Clave de caché basada en identificadores
    const cacheKey = codes.sort().join('|');
    const cachedWikidata = getCached(wikidataCache, cacheKey);
    if (cachedWikidata && !format) {
      return res.json(cachedWikidata);
    }

    const valuesBlock = `VALUES ?code { ${codes.join(' ')} }`;

    const sparqlQuery = `
    SELECT ?item ?itemLabel ?itemDescription ?image ?esArticle ?system ?systemLabel ?systemDescription ?systemImage ?systemEsArticle WHERE {
      #VALUES ?code { "HD 48915" "HIP 32349" "HR 2491" "GJ 244" }
      ${valuesBlock}

      ?item wdt:P528 ?code .

      OPTIONAL { ?item wdt:P18 ?image . }

      # Artículo en Wikipedia ES del componente
      OPTIONAL {
        ?esArticle schema:about ?item ;
                    schema:isPartOf <https://es.wikipedia.org/> .
      }

      # Sistema padre si existe
      OPTIONAL {
        ?item wdt:P361 ?system .
        ?system wdt:P31/wdt:P279* wd:Q523 .  # debe ser estrella o sistema estelar

        OPTIONAL {
          ?systemEsArticle schema:about ?system ;
                            schema:isPartOf <https://es.wikipedia.org/> .
        }
        
        OPTIONAL {?system wdt:P18 ?systemImage . }
      }

      #SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "es". 
        ?item rdfs:label ?itemLabel .
        ?item schema:description ?itemDescription .
        ?system rdfs:label ?systemLabel .
        ?system schema:description ?systemDescription .
      }
    }`;

    const url =
      'https://query.wikidata.org/sparql?query=' +
      encodeURIComponent(sparqlQuery) +
      '&format=json';

    const wikidataResponse = await fetch(url, {
      headers: { 'User-Agent': 'CelestialInfoApp/1.0' },
    });

    const wikidataBody = await wikidataResponse.text();
    if (!wikidataResponse.ok) {
      console.error(
        'Wikidata API returned non-OK status',
        wikidataResponse.status,
        url,
        wikidataBody,
      );
      return res
        .status(502)
        .json({ error: 'Failed to fetch data from Wikidata.' });
    }

    let wikidataJson;
    try {
      wikidataJson = JSON.parse(wikidataBody);
    } catch (error) {
      console.error(
        'Failed to parse Wikidata API response as JSON',
        url,
        wikidataBody.slice(0, 500),
        error,
      );
      return res.status(502).json({ error: 'Invalid response from Wikidata.' });
    }

    const rows = wikidataJson.results?.bindings || [];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No matching object in Wikidata.' });
    }

    // 3. Elegimos el mejor resultado
    //    Prioridad:
    //      1) Sistema con artículo ES
    //      2) Componente con artículo ES
    //      3) Primer resultado
    let best = null;

    // 1 — sistema con artículo
    for (const r of rows) {
      if (r.systemEsArticle) {
        best = r;
        best.__useSystem = true;
        break;
      }
    }

    // 2 — componente con artículo
    if (!best) {
      for (const r of rows) {
        if (r.esArticle) {
          best = r;
          best.__useSystem = false;
          break;
        }
      }
    }

    // 3 — primero
    if (!best) {
      best = rows[0];
      best.__useSystem = false;
    }

    // 4. Seleccionamos el item final (sistema si corresponde)
    const finalItem = best.__useSystem && best.system ? best.system : best.item;
    const finalLabel =
      best.__useSystem && best.systemLabel
        ? best.systemLabel.value
        : best.itemLabel.value;

    const finalDescription =
      best.__useSystem && best.systemDescription
        ? best.systemDescription.value
        : best.itemDescription?.value || null;

    const finalArticle =
      best.__useSystem && best.systemEsArticle
        ? best.systemEsArticle.value
        : best.esArticle?.value || null;

    // const image = best.image?.value || null;
    let image =
      best.__useSystem && best.systemImage
        ? best.systemImage.value
        : best.image?.value || null;

    let imageMeta = null;

    if (image) {
      image = image.replace(/^http:/, 'https:');
      imageMeta = await getCommonsImageInfo(image);

      if (imageMeta) {
        const isAllowed = ALLOWED_LICENSE_URLS.some((u) =>
          imageMeta.licenseUrl?.startsWith(u),
        );

        // Normalizar quitando etiquetas HTML
        imageMeta.artist = normalizeHtmlField(imageMeta.artist);
        imageMeta.credit = normalizeHtmlField(imageMeta.credit);
      } else {
        imageMeta = {
          license: null,
          licenseUrl: null,
          artist: null,
          attributionRequired: false,
          credit: null,
        };
      }

      //if (!isAllowed || !ALLOWED_LICENSES.has(imageMeta.license)) {
      /*if (!isAllowed) {
        image = null;
        imageMeta = null;
      }*/
    }

    /*// Si no hay artículo en Wikipedia, devolvemos lo que hay
    if (!finalArticle) {
      return res.json({
        label: finalLabel,
        wikidataImage: image,
        wikipediaUrl: null,
        extract: null
      });
    }*/

    let fileUrl = '';
    if (image)
      fileUrl =
        'https://commons.wikimedia.org/wiki/File:' +
        image.substring(image.lastIndexOf('/') + 1);

    // 5. Respuesta inicial
    const json = {
      ...normalizeStarData(mongoData),
      label: finalLabel,
      wikidataImage: image,
      wikidataImageFileUrl: fileUrl,
      wikidataLicense: imageMeta,
      wikipediaUrl: null,
      extract: finalDescription,
      extractLicense: {
        source: null,
        license: null,
        licenseUrl: null,
      },
    };

    // 6. Obtenemos el extracto desde wikipedia.org (con caché)
    if (finalArticle) {
      const title = decodeURIComponent(finalArticle.split('/').pop());
      const wikiApiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

      let extract = null;
      const cachedWiki = getCached(wikipediaCache, title);
      if (cachedWiki) {
        extract = cachedWiki;
      } else {
        const wikiResponse = await fetch(wikiApiUrl, {
          headers: { 'User-Agent': 'AstroSync/1.0' },
        });

        const wikiBody = await wikiResponse.text();
        if (!wikiResponse.ok) {
          console.error(
            'Wikipedia API returned non-OK status',
            wikiResponse.status,
            wikiApiUrl,
            wikiBody,
          );
        } else {
          try {
            const wikiJson = JSON.parse(wikiBody);
            extract = wikiJson.extract || null;
            if (extract) {
              setCached(wikipediaCache, title, extract);
            }
          } catch (error) {
            console.error(
              'Failed to parse Wikipedia API response as JSON',
              wikiApiUrl,
              wikiBody.slice(0, 500),
              error,
            );
          }
        }
      }

      // 7. Respuesta final
      json.wikipediaUrl = finalArticle;
      json.extract = extract;
      ((json.extractLicense.source = 'Wikipedia (es)'),
        (json.extractLicense.license = 'CC BY-SA 4.0'),
        //json.extractLicenseUrl = "https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License#License"
        (json.extractLicense.licenseUrl =
          'https://creativecommons.org/licenses/by-sa/4.0/'));
    }

    // Guardar en caché Wikidata (solo JSON, no para descargas)
    if (!format) {
      setCached(wikidataCache, cacheKey, json);
    }

    // 8. Devolver
    // Fichero, si está indicado el formato
    if (format) {
      const buffer = await formats_utils.generateAllFormats(json, format);

      res.setHeader('Content-Type', mimeByFormat(format));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileNameByFormat(format, json.label)}"`,
      );

      return res.send(buffer);
    }
    // JSON, si no está indicado el formato
    else {
      return res.json(json);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

function mimeByFormat(format) {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'epub':
      return 'application/epub+zip';
    case 'html':
      return 'text/html; charset=utf-8';
    case 'xml':
      return 'application/xml; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function fileNameByFormat(format, title) {
  return `${title}.${format}`;
}

// Normalizar datos de estrellas
function normalizeStarData(data) {
  let normalizedData = { ...data };

  normalizedData.ci = ciToColor(data.ci); // color legible
  normalizedData.con = constellations[data.con]; // constelación

  // distancia
  if (!data.dist || data.dist >= 100000 || data.dist <= 0)
    normalizedData.dist = '-';
  else {
    const ly = data.dist * PARSECS_TO_LIGHT_YEARS_MULTIPLY_FACTOR;
    normalizedData.dist = ly.toFixed(2);
  }
  // console.log(normalizedData);
  return normalizedData;
}

// Color de estrella
function ciToColor(ci) {
  let color = '';

  if (ci < 0) color = 'azul';
  else if (ci < 0.3) color = 'azul claro';
  else if (ci < 0.6) color = 'blanco';
  else if (ci < 1.0) color = 'amarillo';
  else if (ci < 1.5) color = 'naranja';
  else color = 'rojo';

  return color;
}

// Obtener información de cuerpos celestes (planetas, Luna, Sol) para descargar
const getCuerpoCelesteInfo = async (req, res) => {
  try {
    const { _id, format } = req.query;

    if (!_id) {
      return res.status(400).json({ error: 'Se requiere el parámetro _id.' });
    }

    const cuerpo = await CuerpoCeleste.findById(_id).lean();

    if (!cuerpo) {
      return res.status(404).json({ error: 'Cuerpo celeste no encontrado.' });
    }

    const json = {
      label: cuerpo.label || '',
      wikidataImage: cuerpo.wikidataImage || '',
      wikidataImageFileUrl: cuerpo.wikidataImageFileUrl || '',
      wikipediaUrl: cuerpo.wikipediaUrl || '',
      extract: cuerpo.extract || '',
      wikidataLicense: cuerpo.wikidataLicense || {},
    };

    if (format) {
      const buffer = await formats_utils.generateAllFormats(json, format);

      res.setHeader('Content-Type', mimeByFormat(format));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileNameByFormat(format, json.label)}"`,
      );

      return res.send(buffer);
    }

    return res.json(json);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCelestialInfo,
  getCuerpoCelesteInfo,
};
