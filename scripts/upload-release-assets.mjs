#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const envFile = join(root, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...vals] = line.trim().split('=')
    if (key && !key.startsWith('#') && vals.length) {
      process.env[key.trim()] = vals.join('=').trim()
    }
  }
}

const TOKEN = process.env.GH_TOKEN
if (!TOKEN) {
  console.error('Missing GH_TOKEN')
  process.exit(1)
}

const OWNER = 'Yuan-ZiWeiXing'
const REPO = 'jizhang'
const TAG = 'v1.0.7'

function githubRequest(method, hostname, path, body, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        'User-Agent': 'jizhang-upload',
        Accept: 'application/vnd.github+json',
      },
    }
    if (body) {
      opts.headers['Content-Type'] = contentType
      opts.headers['Content-Length'] = Buffer.byteLength(body)
    }
    const req = https.request(opts, (res) => {
      let raw = ''
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${raw}`))
        } else {
          try {
            resolve(raw ? JSON.parse(raw) : {})
          } catch {
            resolve(raw)
          }
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function main() {
  const releases = await githubRequest('GET', 'api.github.com', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`)
  const uploadUrl = releases.upload_url.replace(/\{\?name,label\}/, '')
  const files = [
    join(root, 'release', '记账本 Setup 1.0.7.exe'),
    join(root, 'release', '记账本 Setup 1.0.7.exe.blockmap'),
    join(root, 'release', 'latest.yml'),
  ]
  for (const fp of files) {
    const name = fp.split(/[/\\]/).pop()
    const buf = readFileSync(fp)
    const path = `${uploadUrl}?name=${encodeURIComponent(name)}`
    console.log('Uploading', name, buf.length, 'bytes...')
    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'uploads.github.com',
          path,
          method: 'POST',
          headers: {
            Authorization: `token ${TOKEN}`,
            'User-Agent': 'jizhang-upload',
            'Content-Type': 'application/octet-stream',
            'Content-Length': buf.length,
          },
        },
        (res) => {
          let raw = ''
          res.on('data', (c) => (raw += c))
          res.on('end', () => {
            if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${raw}`))
            else resolve(JSON.parse(raw))
          })
        }
      )
      req.on('error', reject)
      req.write(buf)
      req.end()
    })
    console.log('  OK', name)
  }
  console.log('\nDone:', releases.html_url)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
