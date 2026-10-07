// Read-only public upstream UI inspection. No production build or infrastructure calls.
import {chromium} from '@playwright/test'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../.artifacts/upstream-surveyor')
await mkdir(root,{recursive:true})
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true})
 const response=await page.goto('https://azurelocal.cloud/azurelocal-surveyor/',{waitUntil:'networkidle'})
 const summary={reviewedAt:new Date().toISOString(),url:page.url(),status:response.status(),title:await page.title(),headings:await page.locator('h1,h2,h3').allTextContents(),buttons:await page.getByRole('button').allTextContents(),links:await page.getByRole('link').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,href:node.href})))}
 await page.screenshot({path:resolve(root,'landing.png'),fullPage:true})
 await page.getByRole('link',{name:'Open Storage Sizing →',exact:true}).click()
 summary.storage={url:page.url(),buttons:await page.getByRole('button').allTextContents(),links:await page.getByRole('link').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,href:node.href})))}
 await page.screenshot({path:resolve(root,'storage.png'),fullPage:true})
 await page.getByRole('link',{name:'Storage Report',exact:true}).click()
 summary.report={url:page.url(),buttons:await page.getByRole('button').allTextContents()}
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export project JSON',exact:true}).click()
 const download=await pending;await download.saveAs(resolve(root,'live-storage-project.json'))
 const bytes=await readFile(resolve(root,'live-storage-project.json'));const exported=JSON.parse(bytes)
 summary.download={name:download.suggestedFilename(),sha256:createHash('sha256').update(bytes).digest('hex'),keys:Object.keys(exported),schemaVersion:exported.schemaVersion,version:exported.surveyorVersion,kind:exported.kind}
 await writeFile(resolve(root,'inspection.json'),JSON.stringify(summary,null,2)+'\n')
 console.log(JSON.stringify(summary,null,2))
}finally{await browser.close()}
