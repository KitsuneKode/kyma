import { createServer } from 'node:http'

const port = Number(process.argv[2] ?? '8799')

if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) {
  throw new Error('Event sink port must be a valid TCP port.')
}

const server = createServer((request, response) => {
  const chunks: Buffer[] = []
  request.on('data', (chunk: Buffer) => chunks.push(chunk))
  request.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8')
    console.log(
      '[inngest-sink]',
      request.method,
      request.url,
      body.slice(0, 300)
    )
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ ids: ['local-sink'] }))
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Inngest event sink listening on http://127.0.0.1:${port}`)
})
