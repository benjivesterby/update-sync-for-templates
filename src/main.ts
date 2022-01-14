import {promises as fs} from 'fs'
import path from 'path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import simpleGit from 'simple-git/promise'
import YAML from 'yaml'

interface Response {
  repositoryOwner: {
    repositories: {
      pageInfo: {
        hasNextPage: boolean
        endCursor?: string
      }
      nodes: Item[]
    }
  }
}
interface Item {
  name: string
  nameWithOwner: string
  url: string
  templateRepository: null | {
    name: string
    owner: {
      login: string
    }
  }
}

// YAML Structure
interface Group {
  group: GPE[]
}

interface GPE {
  files: File[]
  templates: string
  repos: string
}
interface File {
  source: string
  dest: string
}

async function run(): Promise<void> {
  try {
    /***************************************/
    /*           CONFIGURATION             */
    /***************************************/

    // Github Access Token
    const token: string = core.getInput('token')
    if (!token) {
      core.error(
        'Token is required to run this action. Please set the token in the action input.'
      )
    }

    const baseDir = path.join(process.cwd() || '')
    const syncYmlPath = core.getInput('sync_file')
    const authorEmail = core.getInput('author_email')
    const authorName = core.getInput('author_name')

    // Load templates to be synced
    // Load the configured sync file
    const syncYmlContent = await fs.readFile(syncYmlPath, {
      encoding: 'utf-8'
    })

    // Parse the YAML into JSON
    const sync: Group = await YAML.parseDocument(syncYmlContent).toJSON()

    let templates = sync.group
      .map(g => g.templates.split('\n'))
      .reduce((a, b) => a.concat(b), [])

    templates = templates.filter((t, i) =>
      t === null || t === undefined || templates.indexOf(t) !== i ? false : true
    )

    for (const template of templates) {
      if (!template || template === '') {
        continue
      }

      const templatePath = template.split('/')
      const templateOrg = templatePath[0]
      const templateRepo = templatePath[1]
      if (!templateOrg || !templateRepo) {
        core.error(`Invalid template path: ${template}`)
        continue
      }

      core.info(`Processing template: ${template}`)
      core.info(`Getting repository list for ${templateOrg}/${templateRepo}`)

      const org = core.getInput('org') || templateOrg

      const octokit = github.getOctokit(token, {
        previews: ['baptiste']
      })

      /***************************************/
      /*             QUERY GITHUB            */
      /***************************************/

      // Query the Github API for all repositories that were
      // created with this template
      let items: Item[] = []
      let nextPageCursor: string | null | undefined = null

      do {
        const result: Response = await octokit.graphql(
          `
          query orgRepos($owner: String!, $afterCursor: String) {
        repositoryOwner(login: $owner) {
          repositories(first: 100, after: $afterCursor, orderBy: { field: CREATED_AT, direction: DESC }) {
                pageInfo {
              hasNextPage
              endCursor
            }
                nodes {
              name
              nameWithOwner
              url
                  templateRepository {
                name
                    owner {
                  login
                }
              }
            }
          }
        }
      }
        `,
          {
            owner: org,
            afterCursor: nextPageCursor
          }
        )
        nextPageCursor = result.repositoryOwner.repositories.pageInfo
          .hasNextPage
          ? result.repositoryOwner.repositories.pageInfo.endCursor
          : undefined

        items = items.concat(result.repositoryOwner.repositories.nodes)
      } while (nextPageCursor !== undefined)

      core.info(
        `Checking ${items.length} repositories for repositories from ${templateOrg} `
      )

      const reposProducedByThis = items
        .filter(
          d =>
            d.templateRepository &&
            d.templateRepository.name === templateRepo &&
            d.templateRepository.owner.login === templateOrg
        )
        .map(d => `${d.nameWithOwner}`)

      if (reposProducedByThis.length > 0) {
        core.info(
          `Found ${reposProducedByThis.length} repositories which match template ${templateOrg}/${templateRepo}`
        )

        let entries = 0
        // Go through repositories and check if they exist in the sync file
        for (const repo of reposProducedByThis) {
          // Iterate through the configurations and update the repositories list for
          // each configuration for this template
          for (const item of sync.group) {
            // Check for template configs and if the repo is in the list
            if (item.templates && item.templates.includes(templateRepo)) {
              // Check if the current repo is in the list already
              // TODO: This only does a string compare, should be a regex, or something
              if (!item.repos.includes(repo)) {
                core.info(`Updating sync file; adding [${repo}]`)
                entries++
                item.repos += `${repo}\n`
              }
            }
          }
        }

        core.info(`Updated [${entries}] configs for template ${templateRepo}`)

        // Write out to the sync file
        await fs.writeFile(syncYmlPath, YAML.stringify(sync))

        // Push the sync file to the shared repository
        if (syncYmlContent !== YAML.stringify(sync)) {
          core.info('Changes found, committing')

          // Git obj in shared directory
          const git = simpleGit(baseDir)

          await git.addConfig('user.email', authorEmail)
          await git.addConfig('user.name', authorName)
          await git.add(syncYmlPath)

          const msg = `new-repo: 🥷🏽 Updating list of repos to sync for template [${templateRepo}]`
          await git.commit(msg, undefined, {
            '--author': `"${authorName} <${authorEmail}>"`
          })

          await git.push()
        } else {
          core.info('No changes, skipping')
        }
      }
    }
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

run()
