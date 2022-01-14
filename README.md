# Update Sync Configuration for BetaHuhn/repo-file-sync-action

[![Build & Test](https://github.com/benjivesterby/update-sync-for-templates/actions/workflows/build.yml/badge.svg)](https://github.com/benjivesterby/update-sync-for-templates/actions/workflows/build.yml)
![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/benjivesterby/update-sync-for-templates?color=orange&label=Release&sort=semver)

This action is used to update the sync configuration for the
[repo-file-sync-action](https://github.com/BetaHuhn/repo-file-sync-action)
action. Configuring this will allow for repositories created from a configured
template to be auto-added to the sync.yaml file.

## Configuring the Action

Create your sync file using the group format as described in the
   [repo-file-sync-action](https://github.com/BetaHuhn/repo-file-sync-action#sync-the-same-files-to-multiple-repositories)

Add the new templates entry to the sync file

```yaml
group:
  - files:
      - source: file1.txt
        dest: file1.txt
      - source: file2.txt
        dest: file2.txt
    templates: |
      devnw/oss-template
      devnw/template
    repos: |
      devnw/plex
```

Create your workflow (I used
[`.github/workflows/sync.yml`](https://github.com/devnw/shared/blob/main/.github/workflows/sync.yml))

```yaml
name: Sync Files
on:
  push:
    branches:
      - main
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@main
      - name: Sync Template Generated Repositories
        uses: benjivesterby/update-sync-for-templates@main
        with: 
          token: "${{ secrets.GH_PAT }}"
      - name: Run Repo File Sync Action
        uses: BetaHuhn/repo-file-sync-action@latest
        with:
          GH_PAT: ${{ secrets.GH_PAT }}
          CONFIG_PATH: sync.yml
          COMMIT_EACH_FILE: false
          SKIP_PR: true
          GIT_EMAIL: ${{ secrets.GIT_EMAIL }}
          GIT_NAME: ${{ secrets.GIT_NAME }}
```

1. Setup the
   [BetaHuhn/repo-file-sync-action](https://github.com/BetaHuhn/repo-file-sync-action)
   action in your GitHub organization.
   1. Example here:
      [https://github.com/devnw/shared](https://github.com/devnw/shared)
1. Create a template repository and add your workflow file
   1. Here's a functional example: [Template Sync
      Action](https://github.com/devnw/oss-template/blob/main/.github/workflows/sync.yml)
   1. I recommend `.github/workflows/sync.yml`
1. Configure your Action
   1. Using the [Configuration Options below](#options) configure your action.

## Example Configuration

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
        uses: benjivesterby/update-sync-for-templates@latest
        with: 
          token: "${{ secrets.GH_PAT }}" # Personal Access Token Is Required
          org: "devnw"
          template_repo: "oss-template"
          sync_repo: "devnw/shared"
          sync_file: "sync.yml"
```

## Options

| Option         | Required | Description                                                                                                                                                                                              |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`        | ✅        | Personal access token which has permissions the configured templates in the sync file, see [here](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) for more. |
| `sync_file`    | ❌        | The sync yaml file (default: `sync.yml`)                                                                                                                                                                 |
| `org`          | ❌        | Org override for template search (default: template organization)                                                                                                                                        |
| `author_name`  | ❌        | The name of the user that will be displayed as the author of the commit. (default: Github Action Bot)                                                                                                    |
| `author_email` | ❌        | The email of the user that will be displayed as the author of the commit. (default: Github Action Bot)                                                                                                   |

This action is a heavily modified hard fork of [original
work](https://github.com/maael/template-repository-usage-action) done by Matthew
Elphick <matt.a.elphy@gmail.com>
