const cheerio = module.parent.require('cheerio');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const JAR_PATH = path.resolve(__dirname, 'plantuml.jar');

/**
 * Parses PlantUML diagrams
 * Replaces <puml> tags with <pic> tags with the appropriate src attribute
 */
function generateDiagram(src) {
  // Output path for path/to/diagram.puml is puml/path/to/diagram.png
  const diagramSrc = path.join('puml', src.replace('.puml', '.png'));
  const outputFilePath = path.resolve(diagramSrc);
  const outputDir = path.dirname(outputFilePath);

  // Creates output dir if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read diagram file
  fs.readFile(src, (err, data) => {
    if (err) {
      throw err;
    }

    const umlCode = data.toString();

    const cmd = `java -jar "${JAR_PATH}" -pipe > "${path.resolve('_site', outputFilePath)}"
    -checkmetadata`;
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

    childProcess.stderr.on('data', (error) => {
      throw new Error(`stderr: ${error}`);
    });

    childProcess.on('close', (code) => {
      if (code !== 0) {
        throw new Error(`${cmd} exited with code ${code}`);
      }
    });
  });

  return diagramSrc;
}

module.exports = {
  preRender: (content) => {
    const $ = cheerio.load(content, { xmlMode: false });
    $('puml').each((i, tag) => {
      // eslint-disable-next-line no-param-reassign
      tag.name = 'pic';
      const { src } = tag.attribs;
      // eslint-disable-next-line no-param-reassign
      tag.attribs.src = generateDiagram(src);
    });

    return $.html();
  },
};
