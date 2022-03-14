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


/*
#!/bin/bash

## This simple shell script outputs a build-info YAML file that is used by pluto versions manager
## to understand where this build came from
echo ci_commit_branch: "${GITHUB_REF_NAME}" >> build-info.yaml
echo ci_commit_ref_name: "${GITHUB_REF_NAME}" >> build-info.yaml
echo ci_commit_sha: "${GITHUB_SHA}" >> build-info.yaml
echo ci_commit_timestamp: "${CI_COMMIT_TIMESTAMP}" >> build-info.yaml
echo ci_commit_title: "${CI_COMMIT_TITLE}" >> build-info.yaml
echo ci_job_url: "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID" >> build-info.yaml
echo ci_project_name: "${GITHUB_REPOSITORY}" >> build-info.yaml
echo ci_merge_request_project_url: "${CI_MERGE_REQUEST_PROJECT_URL}" >> build-info.yaml
echo ci_merge_request_title: "${CI_MERGE_REQUEST_TITLE}" >> build-info.yaml
echo ci_pipeline_iid: "${CI_PIPELINE_IID}" >> build-info.yaml
echo built_image: guardianmultimedia/deliverable-receiver:$CI_PIPELINE_IID >> build-info.yaml
 */

async function main() {
    const prId = github.context.payload.pull_request?.number;
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    console.log(`PR ID is ${prId}`);
    console.log(`owner is ${owner}`);
    console.log(`repo is ${repo}`);

    const commitInfo = await octokit.git.getCommit({ owner: owner, repo: repo, commit_sha: github.context.sha });
    const prInfo = prId ? await octokit.pulls.get({owner: owner, repo: repo, pull_number: prId }) : undefined;

    console.log("commitInfo: ", commitInfo);
    console.log("prInfo: ", prInfo);

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