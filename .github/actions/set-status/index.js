const core = require('@actions/core');
const github = require('@actions/github');


async function run() {
  const myToken = core.getInput('token');
  const octokit = new github.GitHub(myToken);
  const context = github.context;

  const response = await octokit.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: "GH Pages Preview",
    head_sha: context.sha,
    status: "in_progress",
    started_at: new Date().toISOString()
  });

  const id = response.data.id;
  console.log('ID: ', id);
  core.saveState('checkId', id.toString());
}

run();
