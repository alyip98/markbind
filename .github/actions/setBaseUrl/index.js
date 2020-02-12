const core = require('@actions/core');
const fs = require('fs').promises;
// const github = require('@actions/github');

try {
  const file = core.getInput('file', {required: true});
  const key = core.getInput('key', {required: true});
  const value = core.getInput('value', {required: true});
  let obj = {};
  fs.readFile(file)
    .then(buffer => JSON.parse(buffer.toString()))
    .then(obj => {
      obj[key] = value;
      core.setOutput('obj', JSON.stringify(obj));
      fs.writeFile(file, JSON.stringify(obj));
    })
} catch (error) {
  core.setFailed(error.message);
}
