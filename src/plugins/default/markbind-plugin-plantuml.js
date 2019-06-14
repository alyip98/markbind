const cheerio = module.parent.require('cheerio');
const md = require('./../../lib/markbind/src/lib/markdown-it');
const crypto = require('crypto');
const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const { exec } = require('child_process');

const JAR_PATH = `${__dirname}\\plantuml.jar`;
const OUT_PATH = path.resolve('_site', 'diagrams');
const URL_PREFIX = path.join('{{baseUrl}}', 'diagrams');

/**
 * Parses PlantUML diagrams
 */
function generateDiagram(umlCode) {
  const hash = crypto.createHash('md5').update(umlCode).digest('hex');
  const fileName = `diagram-${hash}.png`;
  const outputFilePath = `${OUT_PATH}/${fileName}`;
  const imgSrc = `${URL_PREFIX}/${fileName}`;
  const cmd = `java -jar "${JAR_PATH}" -pipe > "${outputFilePath}"`;

  if (!process.umlDiagrams) {
    process.umlDiagrams = new Set();
  }
  // Skip generation if diagram already exists
  if (process.umlDiagrams.has(hash)) {
    return imgSrc;
  }
  process.umlDiagrams.add(hash);
  console.log('Generating diagram', hash);

  const childProcess = exec(cmd);

  childProcess.stdin.write(
    umlCode,
    (e) => {
      if (e) {
        throw (e);
      }
      childProcess.stdin.end();
    },
  );

  childProcess.on('error', (error) => {
    throw error;
  });

  childProcess.stderr.on('data', (data) => {
    throw new Error(`stderr: ${data}`);
  });

  childProcess.on('close', (code) => {
    if (code !== 0) {
      throw new Error(`${cmd} exited with code ${code}`);
    }
  });

  return imgSrc;
}

module.exports = {
  preRender: (content) => {
    // console.log(content)
    const $ = cheerio.load(content, { xmlMode: false });
    $('uml').each((i, tag) => {
      const el = $(tag);
      const umlCode = el.text();
      // eslint-disable-next-line no-param-reassign
      tag.name = 'img';
      // eslint-disable-next-line no-param-reassign
      tag.attribs.src = generateDiagram(umlCode);
      el.text('');
    });

    // $('plantuml').remove();
    return $.html();
  },
};
