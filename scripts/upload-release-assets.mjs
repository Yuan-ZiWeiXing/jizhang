#!/usr/bin/env node
/**
 * 补全 GitHub Release 资源（当 npm run release 在创建 Release 步骤因代理失败时使用）
 * 用法：node scripts/upload-release-assets.mjs
 * 从 package.json 读取版本，若 tag 对应 Release 不存在则先创建，再上传 exe / blockmap / latest.yml
 */
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
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const ver = pkg.version
const TAG = `v${ver}`

function request(method, hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        'User-Agent': 'jizhang-upload',
        Accept: 'application/vnd.github+json',
        ...extraHeaders,
      },
    }
    if (body) {
      opts.headers['Content-Type'] = 'application/json'
      opts.headers['Content-Length'] = Buffer.byteLength(body)
    }
    const req = https.request(opts, (res) => {
      let raw = ''
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const err = new Error(`${res.statusCode}: ${raw}`)
          err.statusCode = res.statusCode
          err.body = raw
          reject(err)
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

async function getOrCreateRelease() {
  try {
    return await request('GET', 'api.github.com', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`)
  } catch (e) {
    if (e.statusCode !== 404) throw e
    console.log(`Release ${TAG} 不存在，正在创建...`)
    const body = JSON.stringify({
      tag_name: TAG,
      name: TAG,
      body: `## 记账本 ${TAG}\n\n### 安装\n下载下方 \`记账本 Setup ${ver}.exe\` 安装即可。`,
      draft: false,
      prerelease: false,
    })
    return await request('POST', 'api.github.com', `/repos/${OWNER}/${REPO}/releases`, body)
  }
}

async function uploadAsset(uploadUrl, filePath) {
  const buf = readFileSync(filePath)
  const name = filePath.split(/[/\\]/).pop()
  const path = `${uploadUrl}?name=${encodeURIComponent(name)}`
  return new Promise((resolve, reject) => {
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
}

async function main() {
  console.log(`版本: ${ver} (${TAG})\n`)
  const releases = await getOrCreateRelease()
  const uploadUrl = releases.upload_url.replace(/\{\?name,label\}/, '')
  const files = [
    join(root, 'release', `记账本 Setup ${ver}.exe`),
    join(root, 'release', `记账本 Setup ${ver}.exe.blockmap`),
    join(root, 'release', 'latest.yml'),
  ]
  for (const fp of files) {
    if (!existsSync(fp)) {
      console.error(`缺少文件: ${fp}`)
      process.exit(1)
    }
    const name = fp.split(/[/\\]/).pop()
    console.log('Uploading', name, '...')
    await uploadAsset(uploadUrl, fp)
    console.log('  OK', name)
  }
  console.log('\n完成:', releases.html_url)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
