# pluto-build-info github action

## What does it do?

In the Pluto system, we have a tool called pluto-versions-manager that lets us update the running container
versions on the fly.  This links to the CI system to show the latest builds for all built branches and PRs.

It relies on a build artifact called `build-info.yaml` to be present in order to get the required information.

This is a github CI action which communicates with the Github API to get this data and serialize it into yaml.

## How do I use it?

Put the following step into a Github Actions workflow:

```yaml
    - name: Output build-info.yaml
      uses: fredex42/pluto-build-info@v1.0
      with:
        builtimage: built/image/path:${{ env.GITHUB_RUN_NUMBER }} #REQUIRED, change this to whatever your image naming convention is
        token: ${{ secrets.GITHUB_TOKEN }} #REQUIRED, always required so it can talk to the github API
        filename: build-info.yaml #OPTIONAL, defaults to "build-info.yaml" in the current directory if not specified
        quiet: true #OPTIONAL, if set this prevents a comment being created in the PR giving the output built_image
```

This outputs a yaml file to the filename you specify.  You can then upload it as a build artifact:

```yaml
    - name: Upload build info
      uses: actions/upload-artifact@v3
      with:
        name: build-info
        path: build-info.yaml
```

Or do anything else you like with it.