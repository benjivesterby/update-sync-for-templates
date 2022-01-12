import { promises as fs } from 'fs'
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

async function run(): Promise<void> {
  try {
    const authorEmail =
      core.getInput('author_email') || 'benji@devnw.com'
    const authorName = core.getInput('author_name') || 'Benji Vesterby'
    const baseDir = path.join(process.cwd() || '.')
    const sharedRepo = 'https://github.com/devnw/shared'
    const syncYmlPath = path.join(
      baseDir,
      "shared",
      core.getInput('syncFile') || 'sync.yml'
    )

    const token: string = core.getInput('token')
    const octokit = github.getOctokit(token, {
      previews: ['baptiste']
    })
    const { repo } = github.context
    const org = core.getInput('org') || repo.owner
    const repoName = core.getInput('repo') || repo.repo
    // const signingKey = core.getInput('signingKey') || ''

    let items: Item[] = []
    let nextPageCursor: string | null | undefined = null

    do {
      const result: Response = await octokit.graphql(
        `
        query orgRepos($owner: String!, $afterCursor: String) {
          repositoryOwner(login: $owner) {
            repositories(first: 100, after:$afterCursor, orderBy:{field:CREATED_AT, direction:DESC}) {
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
      nextPageCursor = result.repositoryOwner.repositories.pageInfo.hasNextPage
        ? result.repositoryOwner.repositories.pageInfo.endCursor
        : undefined

      items = items.concat(result.repositoryOwner.repositories.nodes)
    } while (nextPageCursor !== undefined)

    core.info(
      `Checking ${items.length} repositories for repositories from ${repoName}`
    )

    const reposProducedByThis = items
      .filter(
        d =>
          d.templateRepository &&
          d.templateRepository.name === repoName &&
          d.templateRepository.owner.login === org
      )
      .map(d => `[${d.nameWithOwner}](${d.url})`)

    const output = `${reposProducedByThis.join('\n* ')}`


    const git = simpleGit(baseDir)

    git.clone(sharedRepo, 'shared')

    const syncYmlContent = await fs.readFile(syncYmlPath, {
      encoding: 'utf-8'
    })

    const sync = YAML.parse(syncYmlContent)


    core.info(sync.group.repos.toString())

    // const updatedReadme = syncYmlContent.replace(
    //   /# Template Repos Start[\s\S]+# Template Repos Stop/,
    //   `<!-- TEMPLATE_LIST_START -->\n${output}\n<!-- TEMPLATE_LIST_END -->`
    // )

    await fs.writeFile(syncYmlPath, sync.toString())

    if (syncYmlContent !== sync.toString()) {
      core.info('Changes found, committing')
      await git.addConfig('user.email', authorEmail)
      await git.addConfig('user.name', authorName)
      await git.add(syncYmlPath)
      await git.commit(`docs: 📝 Updating template usage list`, undefined, {
        '--author': `"${authorName} <${authorEmail}>"`
      })
      await git.push()
      core.info('Committed')
    } else {
      core.info('No changes, skipping')
    }
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

run()
