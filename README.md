# Update Sync Configuration for BetaHuhn/repo-file-sync-action

This action is used to update the sync configuration for the
[BetaHuhn/repo-file-sync-action](https://github.com/BetaHuhn/repo-file-sync-action)
action. Configuring this will allow for repositories created from a template to
be auto-configured to be synced from the shared repository.

## Configuring the Action

1. Setup the
   [BetaHuhn/repo-file-sync-action](https://github.com/BetaHuhn/repo-file-sync-action)
   action in your GitHub organization.
   1. Example here:
      [https://github.com/devnw/shared](https://github.com/devnw/shared)
1. Create a template repository and add your workflow file (ex: `.github/workflows/sync_update.yml`)
1. Configure your Action

Example Configuration

```yaml
name: Template Sync

on: [push, pull_request]

jobs:
  update-sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2.4.0
      - name: Shared Template Sync Update 
        uses: benjivesterby/update-sync-on-template-use@latest
        with: 
          token: "${{ secrets.GH_PAT }}" # Personal Access Token Is Required
          org: "devnw"
          template_repo: "oss-template"
          sync_repo: "devnw/shared"
          sync_file: "sync.yml"
```

### Options

| Option          | Required | Description                                                                                                                                                                                                           |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`         | ✅        | Personal access token which has permissions to both the configured `template_repo` and `sync_repo`, see [here](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) for more. |
| `template_repo` | ✅        | The template repo that this action should search for usages of                                                                                                                                                        |
| `sync_repo`     | ✅        | The sync repo which maintains the BetaHuhn/repo-file-sync-action sync configuration file                                                                                                                              |
| `sync_file`     | ❌        | The sync yaml file (default: `sync.yml`)                                                                                                                                                                              |
| `org`           | ❌        | Org override for template search (default: template organization)                                                                                                                                                     |
| `author_name`   | ❌        | The name of the user that will be displayed as the author of the commit.                                                                                                                                              |
| `author_email`  | ❌        | The email of the user that will be displayed as the author of the commit.                                                                                                                                             |

## Code in Main

Install the dependencies

```bash
$ npm install
```

Build the typescript and package it for distribution

```bash
$ npm run build && npm run package
```

Run the tests :heavy_check_mark:

```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:

```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

The action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in your repo (see [test.yml](.github/workflows/test.yml))

```yaml
uses: ./
with:
  milliseconds: 1000
```

See the [actions tab](https://github.com/actions/typescript-action/actions) for runs of this action! :rocket:

## Usage:

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action

This is a hard fork of [original work](https://github.com/maael/template-repository-usage-action) done by Matthew Elphick <matt.a.elphy@gmail.com>
