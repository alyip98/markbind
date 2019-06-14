// Forked from https://github.com/deepelement/markdown-it-plantuml-offline
const crypto = require('crypto');
const fs = require('fs');
const tmp = require('tmp');
const { exec } = require('child_process');
const path = require('path');

const JAR_PATH = `${__dirname}\\plantuml.jar`;
const OUT_PATH = path.resolve('_site', 'diagrams');
const URL_PREFIX = path.join('{{baseUrl}}', 'diagrams');

module.exports = function umlPlugin(md, options) {
  function generateSourceDefault(umlCode) {
    const hash = crypto.createHash('md5').update(umlCode).digest('hex');
    const fileName = `diagram-${hash}.png`;
    const outputFilePath = `${OUT_PATH}/${fileName}`;
    const imgSrc = `${URL_PREFIX}/${fileName}`;
    const cmd = `java -jar "${JAR_PATH}" -pipe > "${outputFilePath}"`;

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

  // eslint-disable-next-line no-param-reassign
  options = options || {};

  const openMarker = options.openMarker || '@startuml';
  const openChar = openMarker.charCodeAt(0);
  const closeMarker = options.closeMarker || '@enduml';
  const closeChar = closeMarker.charCodeAt(0);
  const generateSource = options.generateSource || generateSourceDefault;
  const render = options.render || md.renderer.rules.image;

  // Track generated diagrams
  process.umlDiagrams = new Set();
  const outDir = OUT_PATH;
  if(fs.existsSync(outDir)) {
    fs.readdirSync(outDir)
      .forEach(val => process.umlDiagrams.add(val.split('diagram-')[1].split('.png')[0]));
  }

  function uml(state, startLine, endLine, silent) {
    let nextLine; let markup; let params; let token; let i;
    let autoClosed = false;
    let start = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];

    // Check out the first character quickly,
    // this should filter out most of non-uml blocks
    //
    if (openChar !== state.src.charCodeAt(start)) { return false; }

    // Check out the rest of the marker string
    //
    for (i = 0; i < openMarker.length; ++i) {
      if (openMarker[i] !== state.src[start + i]) { return false; }
    }

    markup = state.src.slice(start, start + i);
    params = state.src.slice(start + i, max);

    // Since start is found, we can report success here in validation mode
    //
    if (silent) { return true; }

    // Search for the end of the block
    //
    nextLine = startLine;

    for (;;) {
      nextLine++;
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break;
      }

      if (closeChar !== state.src.charCodeAt(start)) {
        // didn't find the closing fence
        continue;
      }

      if (state.sCount[nextLine] > state.sCount[startLine]) {
        // closing fence should not be indented with respect of opening fence
        continue;
      }

      for (i = 0; i < closeMarker.length; ++i) {
        if (closeMarker[i] !== state.src[start + i]) { return false; }
      }

      // make sure tail has spaces only
      if (state.skipSpaces(start + i) < max) {
        continue;
      }

      // found!
      autoClosed = true;
      break;
    }

    const contents = state.src
      .split('\n')
      .slice(startLine + 1, nextLine)
      .join('\n');

    // We generate a token list for the alt property, to mimic what the image parser does.
    const altToken = [];
    // Remove leading space if any.
    const alt = params ? params.slice(1) : 'uml diagram';
    state.md.inline.parse(
      alt,
      state.md,
      state.env,
      altToken,
    );

    token = state.push('uml_diagram', 'img', 0);
    // alt is constructed from children. No point in populating it here.
    token.attrs = [
      ['src', generateSource(contents)],
      ['alt', ''],
    ];
    token.block = true;
    token.children = altToken;
    token.info = params;
    token.map = [startLine, nextLine];
    token.markup = markup;

    state.line = nextLine + (autoClosed ? 1 : 0);

    return true;
  }

  md.block.ruler.before('fence', 'uml_diagram', uml, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  // eslint-disable-next-line no-param-reassign
  md.renderer.rules.uml_diagram = render;
};
