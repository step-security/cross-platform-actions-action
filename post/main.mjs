import {existsSync} from 'fs'
import {spawnSync} from 'child_process'

if (
  existsSync('/tmp/cross-platform-actions.log') &&
  process.env.RUNNER_DEBUG === '1'
)
  spawnSync('sudo', ['cat', '/tmp/cross-platform-actions.log'], {stdio: 'inherit'})
