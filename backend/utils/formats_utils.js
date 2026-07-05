const Epub = require('epub-gen');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const Handlebars = require('handlebars');
const sharp = require('sharp');

// Función para escapar caracteres especiales
/*function escapeXml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}*/
function escape(str, type = 'xml') {
  // Convertimos a string si no lo es
  str = str === null || str === undefined ? '' : String(str);

  const base = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (type === 'xml') {
    return base.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // HTML
  return base.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Función para preparar los datos que se pasarán al template
/*function prepareData(json) {
  const wikidata = json.wikidataLicense || {};
  const artist = wikidata.artist || {};

  return {
    // Datos principales de la estrella
    title: escapeXml(json.label),
    imageUrl: escapeXml(json.wikidataImage),
    description: escapeXml(json.extract),
    articleUrl: escapeXml(json.wikipediaUrl),

    // Datos de atribución de la imagen
    attributionRequired: wikidata.attributionRequired,
    artistText: escapeXml(artist.text),
    artistName: escapeXml(artist.name),
    artistProfileUrl: escapeXml(artist.profileUrl),
    license: escapeXml(wikidata.license),
    licenseUrl: escapeXml(wikidata.licenseUrl),
    wikimediaUrl: escapeXml(json.wikidataImageFileUrl),

    // Características de la estrella
    hip: escapeXml(json.hip),
    hd: escapeXml(json.hd),
    hr: escapeXml(json.hr),
    gl: escapeXml(json.gl),
    ra: escapeXml(json.ra),
    dec: escapeXml(json.dec),
    mag: escapeXml(json.mag),
    dist: escapeXml(json.dist),
    spect: escapeXml(json.spect),
    ci: escapeXml(json.ci),
    con: escapeXml(json.con)
  };
}*/

function prepareData(json, options = {}) {
  const { format = 'xml', escapeValues = true } = options;

  const esc = (v) => (escapeValues ? escape(v, format) : v || '');

  const wikidata = json.wikidataLicense || {};
  const artist = wikidata.artist || {};

  const hasCharacteristics =
    json.hip ||
    json.hd ||
    json.hr ||
    json.gl ||
    json.ra ||
    json.dec ||
    json.mag ||
    json.dist ||
    json.spect ||
    json.ci ||
    json.con;

  return {
    // Base
    title: esc(json.label),
    imageUrl: esc(json.wikidataImage),
    description: esc(json.extract),
    articleUrl: esc(json.wikipediaUrl),

    // Attribution
    attributionRequired: wikidata.attributionRequired,
    artistText: esc(artist.text),
    artistName: esc(artist.name),
    artistProfileUrl: esc(artist.profileUrl),
    license: esc(wikidata.license),
    licenseUrl: esc(wikidata.licenseUrl),
    wikimediaUrl: esc(json.wikidataImageFileUrl),

    // Star data
    hasCharacteristics: hasCharacteristics,
    hip: esc(json.hip),
    hd: esc(json.hd),
    hr: esc(json.hr),
    gl: esc(json.gl),
    ra: esc(json.ra),
    dec: esc(json.dec),
    mag: esc(json.mag),
    dist: esc(json.dist),
    spect: esc(json.spect),
    ci: esc(json.ci),
    con: esc(json.con),
  };
}

// Función principal para generar XML desde JSON usando un template
async function jsonToXml(json) {
  // 1. Leer el archivo de template XML
  const templatePath = path.join(process.cwd(), 'utils/templates/template.xml');
  const templateStr = await fsp.readFile(templatePath, 'utf-8');

  // 2. Compilar el template usando Handlebars
  const template = Handlebars.compile(templateStr);

  // 3. Preparar los datos para el template
  // const data = prepareData(json);
  const data = prepareData(json, { format: 'xml' });

  // 4. Generar el XML final
  const xml = template(data);

  return xml;
}

// Función para escapar caracteres especiales en HTML
/*function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}*/

// Preparar los datos para el template
/*function prepareHtmlData(json) {
  const wikidata = json.wikidataLicense || {};
  const artist = wikidata.artist || {};

  return {
    title: escapeHtml(json.label),
    imageUrl: escapeHtml(json.wikidataImage),
    description: escapeHtml(json.extract),
    articleUrl: escapeHtml(json.wikipediaUrl),
    
    // Atribución de la imagen
    attributionRequired: wikidata.attributionRequired,
    artistText: escapeHtml(artist.text),
    artistName: escapeHtml(artist.name),
    artistProfileUrl: escapeHtml(artist.profileUrl),
    license: escapeHtml(wikidata.license),
    licenseUrl: escapeHtml(wikidata.licenseUrl),
    wikimediaUrl: escapeHtml(json.wikidataImageFileUrl),

    // Características de la estrella
    hip: escapeHtml(json.hip),
    hd: escapeHtml(json.hd),
    hr: escapeHtml(json.hr),
    gl: escapeHtml(json.gl),
    ra: escapeHtml(json.ra),
    dec: escapeHtml(json.dec),
    mag: escapeHtml(json.mag),
    dist: escapeHtml(json.dist),
    spect: escapeHtml(json.spect),
    ci: escapeHtml(json.ci),
    con: escapeHtml(json.con)
  };
}*/

// Función principal para generar HTML desde JSON usando Handlebars
async function jsonToHtml(json) {
  // 1. Leer el archivo de template HTML
  const templatePath = path.join(
    process.cwd(),
    'utils/templates/template.html',
  );
  const templateStr = await fsp.readFile(templatePath, 'utf-8');

  // 2. Compilar el template con Handlebars
  const template = Handlebars.compile(templateStr);

  // 3. Preparar los datos para el template
  // const data = prepareHtmlData(json);
  const data = prepareData(json, { format: 'html' });

  // 4. Generar el HTML final
  const html = template(data);

  return html;
}

// Preparación de datos para la plantilla
/*function prepareEpubData(json) {
  const wikidata = json.wikidataLicense || {};
  const artist = wikidata.artist || {};
  return {
    title: escapeHtml(json.label),
    imageUrl: escapeHtml(json.wikidataImage),
    description: escapeHtml(json.extract),
    articleUrl: escapeHtml(json.wikipediaUrl),
    attributionRequired: wikidata.attributionRequired,
    artistText: escapeHtml(artist.text),
    artistName: escapeHtml(artist.name),
    artistProfileUrl: escapeHtml(artist.profileUrl),
    license: escapeHtml(wikidata.license),
    licenseUrl: escapeHtml(wikidata.licenseUrl),
    wikimediaUrl: escapeHtml(json.wikidataImageFileUrl),
  };
}*/

// Generación de ePub
async function jsonToEpub(json) {
  const templatePath = path.join(
    process.cwd(),
    'utils/templates/template.epub.html',
  );
  const templateStr = await fsp.readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateStr);

  // const data = prepareEpubData(json);
  const data = prepareData(json, { format: 'html' });
  const htmlContent = template(data);

  const outputPath = `${json.label}.epub`;

  const options = {
    title: json.label || 'Mi Libro',
    author: 'AstroSync',
    content: [
      {
        title: json.label,
        data: htmlContent,
      },
    ],
  };

  // Generamos ePub
  await new Epub(options, outputPath).promise;

  // Leemos y devolvemos bufer
  const buffer = await fsp.readFile(outputPath);

  // Eliminamos el fichero temporal
  await fsp.unlink(outputPath);

  return buffer;
}

// Obtener la imagen en base64
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;

    const options = {
      headers: {
        'User-Agent': 'AstroSync/1.0 (contact: astrosync.ua@gmail.com)',
      },
    };

    lib.get(u, options, (res) => {
      // Redirecciones
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        return resolve(fetchImage(res.headers.location));
      }

      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'];
        resolve({ buffer, contentType });
      });
      res.on('error', reject);
    });
  });
}

// Dibujar gradiente
function drawGradient(doc, width, height) {
  const steps = 100; // cantidad de líneas

  // Colores del gradiente
  const colors = ['#730744', '#352296', '#00035a'];

  // Conversión de HEX a RGB
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }

  const rgbColors = colors.map(hexToRgb);

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1); // 0..1
    let r, g, b;

    if (t < 0.5) {
      // entre colores[0] и colores[1]
      const tt = t / 0.5;
      r = Math.round(
        rgbColors[0][0] + tt * (rgbColors[1][0] - rgbColors[0][0]),
      );
      g = Math.round(
        rgbColors[0][1] + tt * (rgbColors[1][1] - rgbColors[0][1]),
      );
      b = Math.round(
        rgbColors[0][2] + tt * (rgbColors[1][2] - rgbColors[0][2]),
      );
    } else {
      // entre colores[0] и colores[1]
      const tt = (t - 0.5) / 0.5;
      r = Math.round(
        rgbColors[1][0] + tt * (rgbColors[2][0] - rgbColors[1][0]),
      );
      g = Math.round(
        rgbColors[1][1] + tt * (rgbColors[2][1] - rgbColors[1][1]),
      );
      b = Math.round(
        rgbColors[1][2] + tt * (rgbColors[2][2] - rgbColors[1][2]),
      );
    }

    doc.setFillColor(r, g, b);
    doc.rect(0, (height / steps) * i, width, height / steps, 'F');
  }
}

// Dimensiones de imagen PNG
function getPngDimensions(buffer) {
  // Comprobación de PNG signature
  if (
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.readUInt16BE(4) !== 0x0d0a
  ) {
    throw new Error('Not a PNG');
  }
  // IHDR empieza desde el byte 8
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

// Dimensiones de imagen JPEG
function getJpegDimensions(buffer) {
  let i = 0;
  while (i < buffer.length) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xc0) {
      // SOF0
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    i++;
  }
  throw new Error('Invalid JPEG');
}

// Conversión a PDF
async function jsonToPdfBuffer(json) {
  const data = prepareData(json, { escapeValues: false });

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 80;

  // Conectamos fuentes
  const fontRegular = fs
    .readFileSync(path.join(__dirname, './fonts/DejaVuSansCondensed.ttf'))
    .toString('base64');

  const fontBold = fs
    .readFileSync(path.join(__dirname, './fonts/DejaVuSans-Bold.ttf'))
    .toString('base64');

  doc.addFileToVFS('DejaVuSans.ttf', fontRegular);
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');

  doc.addFileToVFS('DejaVuSans-Bold.ttf', fontBold);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');

  // 1. Fondo con gradiente
  drawGradient(doc, pageWidth, pageHeight);

  // 2. Header
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text(data.title, pageWidth / 2, y, { align: 'center' });
  y += 40;
  doc.setFont('DejaVu', 'normal');

  // 3. Imagen centrada
  if (data.imageUrl) {
    try {
      const { buffer, contentType } = await fetchImage(data.imageUrl);

      /*let format = "PNG";
      let dimensions;
      if (contentType.includes("jpeg") || contentType.includes("jpg")) {
        format = "JPEG";
        dimensions = getJpegDimensions(buffer);
      }
      if (contentType.includes("png")) {
        format = "PNG";
        dimensions = getPngDimensions(buffer);
      }

      const base64 = buffer.toString("base64");*/

      const { buffer: normalizedBuffer, format } = await normalizeImage(
        buffer,
        contentType,
      );

      let dimensions;

      if (format === 'JPEG') {
        dimensions = getJpegDimensions(normalizedBuffer);
      } else {
        dimensions = getPngDimensions(normalizedBuffer);
      }

      const base64 = normalizedBuffer.toString('base64');

      const maxWidth = 300;
      /*const scale = Math.min(1, maxWidth / dimensions.width);
      const imgWidth = dimensions.width * scale;
      const imgHeight = dimensions.height * scale;*/
      const imgWidth = 300;
      const scale = maxWidth / dimensions.width;
      const imgHeight = dimensions.height * scale;

      const x = (pageWidth - imgWidth) / 2;

      doc.addImage(
        `data:${contentType};base64,${base64}`,
        format,
        x,
        y,
        imgWidth,
        imgHeight,
      );

      y += imgHeight + 20;
      // Atribución
      y = drawAttribution(doc, data, y, pageWidth, imgWidth);
    } catch (e) {
      console.warn('Error al cargar la imagen:', e.message);
    }
    y += 20;
  }

  // 4. Párrafo de texto
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);

  const margin = 50;
  const textWidth = pageWidth - 2 * margin;

  // Dividimos texto en líneas
  const lines = doc.splitTextToSize(data.description, textWidth);

  // altura de la línea (fontsize + un poco más)
  const lineHeight = 16;

  for (const line of lines) {
    // comprobación del final de la página
    if (y + lineHeight > pageHeight - 50) {
      doc.addPage();
      // dibujar gradiente en la página nueva
      drawGradient(doc, pageWidth, pageHeight);
      y = 80;
    }

    doc.text(line, margin, y);
    y += lineHeight;
  }

  y += 20;

  // 5. Enlace
  if (data.articleUrl) {
    // Comprobamos si hay que pasar a otra página
    if (y + lineHeight > pageHeight - 50) {
      doc.addPage();
      drawGradient(doc, pageWidth, pageHeight);
      y = 50;
    }

    // 1. Texto normal (no clickable)
    doc.setFont('DejaVu', 'bold');
    doc.setTextColor(255, 255, 255);
    const label = 'Artículo en Wikipedia: ';
    doc.text(label, margin, y);

    // 2. Enlace clickable
    doc.setTextColor(247, 184, 255);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont('DejaVu', 'normal');
    doc.textWithLink(data.articleUrl, margin + labelWidth, y, {
      url: data.articleUrl,
    });

    y += lineHeight;
  }

  // 6. Tabla con características (solo si hay datos de estrellas)
  if (data.hasCharacteristics) {
    y = drawCharacteristicsTable(doc, data, pageWidth, pageHeight);
  }

  // 7. Devolvemos PDF como Buffer
  return Buffer.from(doc.output('arraybuffer'));
}

// Para poder dibujar imágenes en otros formatos
async function normalizeImage(buffer, contentType) {
  // JPEG
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return { buffer, format: 'JPEG' };
  }

  // PNG
  if (contentType.includes('png')) {
    return { buffer, format: 'PNG' };
  }

  // SVG → PNG
  if (contentType.includes('svg')) {
    const pngBuffer = await sharp(buffer).png().toBuffer();
    return { buffer: pngBuffer, format: 'PNG' };
  }

  // TIFF → PNG
  if (contentType.includes('tiff') || contentType.includes('tif')) {
    const pngBuffer = await sharp(buffer).png().toBuffer();
    return { buffer: pngBuffer, format: 'PNG' };
  }

  // WebP → JPEG (или PNG)
  if (contentType.includes('webp')) {
    const jpgBuffer = await sharp(buffer).jpeg().toBuffer();
    return { buffer: jpgBuffer, format: 'JPEG' };
  }

  throw new Error('Formato de imagen no soportado: ' + contentType);
}

// Dibujar atribución centrada
function drawAttribution(doc, data, y, pageWidth) {
  if (!data.attributionRequired) return y;

  const maxWidth = 300;
  const lineHeight = 14;

  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(10);

  const parts = [];

  if (data.artistText) {
    parts.push({ text: data.artistText });
  }

  if (data.artistName) {
    parts.push({
      text: (parts.length ? ', ' : '') + data.artistName,
      link: data.artistProfileUrl,
    });
  }

  if (data.license) {
    parts.push({
      text: ', ' + data.license,
      link: data.licenseUrl,
    });
  }

  if (data.wikimediaUrl) {
    parts.push({
      text: ', via Wikimedia Commons',
      link: data.wikimediaUrl,
    });
  }

  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  for (const part of parts) {
    const partWidth = doc.getTextWidth(part.text);

    if (currentWidth + partWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }

    currentLine.push(part);
    currentWidth += partWidth;
  }

  if (currentLine.length) {
    lines.push(currentLine);
  }

  for (const line of lines) {
    const lineWidth = line.reduce(
      (sum, p) => sum + doc.getTextWidth(p.text),
      0,
    );

    let x = (pageWidth - lineWidth) / 2;

    for (const part of line) {
      if (part.link) {
        doc.setTextColor(180, 220, 255);
        doc.textWithLink(part.text, x, y, { url: part.link });
      } else {
        doc.setTextColor(200, 200, 200);
        doc.text(part.text, x, y);
      }

      x += doc.getTextWidth(part.text);
    }

    y += lineHeight;
  }

  return y;
}

// Dibujar tabla de características con 2 columnas en PDF
function drawCharacteristicsTable(doc, data, pageWidth, pageHeight) {
  doc.addPage();
  drawGradient(doc, pageWidth, pageHeight);

  let y = 80;
  const margin = 50;
  const lineHeight = 28;
  const padding = 5;

  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('Características', pageWidth / 2, y, { align: 'center' });
  y += 40;

  const characteristics = [
    {
      name: 'Hipparcos Catalog ID',
      value: data.hip ? 'HIP ' + data.hip : null,
      link: 'https://es.wikipedia.org/wiki/Cat%C3%A1logo_Hipparcos',
    },
    {
      name: 'Henry Draper Catalog ID',
      value: data.hd ? 'HD ' + data.hd : null,
      link: 'https://es.wikipedia.org/wiki/Cat%C3%A1logo_Henry_Draper',
    },
    {
      name: 'Yale Bright Star Catalog ID',
      value: data.hr ? 'HR ' + data.hr : null,
      link: 'https://es.wikipedia.org/wiki/Bright_Star_Catalogue',
    },
    {
      name: 'Gliese Catalog of Nearby Stars ID',
      value: data.gl || null,
      link: 'https://es.wikipedia.org/wiki/Cat%C3%A1logo_Gliese',
    },
    {
      name: 'Ascensión recta',
      value: data.ra || null,
      link: 'https://es.wikipedia.org/wiki/Ascensi%C3%B3n_recta',
    },
    {
      name: 'Declinación',
      value: data.dec || null,
      link: 'https://es.wikipedia.org/wiki/Declinaci%C3%B3n_(astronom%C3%ADa)',
    },
    {
      name: 'Magnitud aparente',
      value: data.mag || null,
      link: 'https://es.wikipedia.org/wiki/Magnitud_aparente',
    },
    { name: 'Distancia', value: data.dist ? `${data.dist} años de luz` : null },
    {
      name: 'Tipo espectral',
      value: data.spect || null,
      link: 'https://es.wikipedia.org/wiki/Clasificaci%C3%B3n_estelar',
    },
    { name: 'Color', value: data.ci || null },
    { name: 'Constelación', value: data.con || null },
  ]
    .filter((c) => c.value)
    .map((c) => ({
      ...c,
      value: String(c.value), // <-- преобразуем в строку
    }));

  if (characteristics.length === 0) return y;

  const lineWidth = pageWidth - 2 * margin;
  const colWidth = lineWidth / 2;
  let dark = true;

  for (let i = 0; i < characteristics.length; i++) {
    const char = characteristics[i];

    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      drawGradient(doc, pageWidth, pageHeight);
      y = margin;
    }

    if (dark) {
      doc.setFillColor(23, 21, 82);
    } else {
      doc.setFillColor(35, 32, 100);
    }
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.rect(margin, y - lineHeight + 4, lineWidth, lineHeight, 'FD');

    // Separación
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    const dividerX = margin + colWidth;
    doc.line(
      dividerX,
      y - lineHeight + 4,
      dividerX,
      y - lineHeight + 4 + lineHeight,
    );

    doc.setTextColor(255, 255, 255);
    doc.setFont('DejaVu', 'normal');
    doc.setFontSize(12);

    const nameX = margin + padding;
    const valueX = margin + colWidth + padding;
    // const textY = y + 5;
    const textY = y - lineHeight + 4 + lineHeight / 2 + 3; // +3 para centrar

    // Nombre o enlace en la primera columna
    if (char.link) {
      doc.textWithLink(char.name, nameX, textY, {
        url: char.link,
        align: 'left',
      });
    } else {
      doc.text(char.name, nameX, textY, { align: 'left' });
    }

    // Valor en la segunda columna
    doc.text(char.value, valueX, textY, { align: 'left' });

    y += lineHeight;
    dark = !dark;
  }

  return y;
}

// Función general
async function generateAllFormats(json, format) {
  switch (format) {
    case 'xml':
      const xml = jsonToXml(json);
      return xml;
    case 'html':
      const html = jsonToHtml(json);
      return html;
    case 'pdf':
      const pdfBuffer = jsonToPdfBuffer(json);
      return pdfBuffer;
    case 'epub':
      const epubBuffer = await jsonToEpub(json);
      return epubBuffer;
  }
}

module.exports = {
  generateAllFormats,
};
