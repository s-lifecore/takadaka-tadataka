import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { loadEnv } from 'vite'

const target = process.argv[2]
const environments = new Set(['prod'])

if (!environments.has(target)) {
  console.error('Usage: CONFIRM_PROD_DEPLOY=1 npm run deploy:hosting -- prod')
  process.exit(1)
}

const envFile = `.env.${target}.local`
if (!existsSync(envFile)) {
  console.error(
    `Missing ${envFile}. Copy .env.example to that file and fill in the ${target} settings.`,
  )
  process.exit(1)
}

if (target === 'prod' && process.env.CONFIRM_PROD_DEPLOY !== '1') {
  console.error('Production deploy requires CONFIRM_PROD_DEPLOY=1.')
  console.error('Example: CONFIRM_PROD_DEPLOY=1 npm run deploy:hosting -- prod')
  process.exit(1)
}

const env = loadEnv(target, process.cwd(), '')
const projectId = env.FIREBASE_PROJECT_ID

if (!projectId) {
  console.error(`FIREBASE_PROJECT_ID is required in ${envFile}.`)
  process.exit(1)
}

const childEnv = { ...process.env, ...env }
const build = spawnSync('npm', ['run', 'build', '--', '--mode', target], {
  env: childEnv,
  stdio: 'inherit',
})

if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

const deploy = spawnSync(
  'npx',
  ['--yes', 'firebase-tools@15.34.2', 'deploy', '--only', 'hosting', '--project', projectId],
  {
    env: childEnv,
    stdio: 'inherit',
  },
)

process.exit(deploy.status ?? 1)
