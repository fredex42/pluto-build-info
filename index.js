const core = require("@actions/core");
const github = require("@actions/github");
const yaml = require('js-yaml');
const fs   = require('fs');
const { Octokit } = require("@octokit/rest");

const token = core.getInput("token") ?? process.env.GITHUB_TOKEN;

const octokit = new Octokit({
    auth: token,
    userAgent: "pluto-build-info v1.0",
});

async function main() {
    const prId = github.context.payload.pull_request?.number;
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    console.log(`PR ID is ${prId}`);
    console.log(`owner is ${owner}`);
    console.log(`repo is ${repo}`);

    /* if you need to work out what the available fields are, insert a `console.log` line for these objects then
    run the action to see what you get
     */
    const commitInfo = await octokit.git.getCommit({ owner: owner, repo: repo, commit_sha: github.context.sha });
    const prInfo = prId ? await octokit.pulls.get({owner: owner, repo: repo, pull_number: prId }) : undefined;

    try {
        const data = {
            ci_commit_branch: prInfo ? prInfo.data.head.ref : github.context.ref,
            ci_commit_ref_name: github.context.ref,
            ci_commit_sha: github.context.sha,
            ci_commit_timestamp: commitInfo.data.author.date,
            ci_commit_title: commitInfo.data.message,
            ci_job_url: `${github.context.serverUrl}/${repo}/actions/runs/${github.context.runId}`,
            ci_project_name: github.context.payload.repository.full_name,
            ci_merge_request_project_url: github.context.payload.pull_request ? github.context.payload.pull_request.html_url : "",
            ci_merge_request_title: prInfo ? prInfo.data.title : "",
            built_image: core.getInput("builtImage")
        }

        const contentToWrite = yaml.dump(data);
        fs.writeFileSync(core.getInput("filename"), contentToWrite);
    } catch(err) {
        core.setFailed(err);
    }
}

/**
 * Helper function that ensures that node never terminates early, waiting until all callbacks are done.
 * No polling is done; instead we keep the process alive with a very long do-nothing interval timer which is
 * revoked when the main function promise completes
 * @param entryPoint async main function to call.
 */
function wrapPromiseMain(entryPoint) {
    const pollTime = 1000000;
    const interval = setInterval(()=> {}, pollTime);
    return entryPoint()
        .catch((err)=>core.setFailed(err))
        .finally(()=>clearInterval(interval));
}

wrapPromiseMain(main);