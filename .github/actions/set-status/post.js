const core = require('@actions/core');
const github = require('@actions/github');


async function run() {
  const myToken = core.getInput('token');
  const octokit = new github.GitHub(myToken);
  const context = github.context;
  const url = core.getInput('baseUrl');
  const id = core.getState('checkId');

  console.log("ID:", id);
  console.log("URL:", url);

  await octokit.checks.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    check_run_id: id,
    name: "GH Pages Preview",
    status: "completed",
    conclusion: "success",
    completed_at: new Date().toISOString(),
    details_url: url,
    output: {
      title: "Preview",
      summary: `[GitHub Pages](${url})`
    }
  });
}

run();
