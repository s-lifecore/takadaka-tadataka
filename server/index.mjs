import { createServer } from 'node:http'
import { createScoringMiddleware, scoringOptionsFromEnv } from './scoring.mjs'

const handle = createScoringMiddleware(scoringOptionsFromEnv(process.env))
const server = createServer((req, res) => {
  void handle(req, res, () => { res.statusCode = 404; res.end('Not Found') })
})
server.requestTimeout = 120_000
server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => {
  console.log('Scoring API listening on port', server.address().port)
})
