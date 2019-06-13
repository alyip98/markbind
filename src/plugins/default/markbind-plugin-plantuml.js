const cheerio = module.parent.require('cheerio');
const md = require('./../../lib/markbind/src/lib/markdown-it');
const crypto = require('crypto');
const fs = require('fs');
const tmp = require('tmp');
const { exec } = require('child_process');

const JAR_PATH = `${__dirname}\\plantuml.jar`;
const OUT_PATH = 'out';

/**
 * Parses PlantUML diagrams
 */
function generateDiagram(umlCode) {
  const hash = crypto.createHash('md5').update(umlCode).digest('hex');
  const outputFilePath = `${OUT_PATH}/diagram-${hash}.png`;
  const cmd = `java -jar "${JAR_PATH}" -pipe > "${outputFilePath}"`;

  if (!process.umlDiagrams) {
    process.umlDiagrams = new Set();
  }

  // Skip generation if diagram already exists
  if (process.umlDiagrams.has(hash)) {
    return outputFilePath;
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

  return outputFilePath;
}

module.exports = {
  preRender: (content) => {
    // console.log(content)
    const $ = cheerio.load(content, { xmlMode: false });
    $('plantuml').each((i, tag) => {
      const el = $(tag);
      const umlCode = el.text();
      console.log('\n\n\n\n', umlCode, '\n\n\n\n');
      // el.after(`<img src="${generateDiagram(umlCode)}"/>`);
    });

    // $('plantuml').remove();
    return $.html();
  },
};
