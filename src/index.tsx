import { Hono } from 'hono'
import qr from 'qr-image'

type Bindings = {
    URL_BINDING: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
    return c.html(
        <html>
            <h1>URL短縮サービス</h1>
            <div>
                <span>短縮したいURLを入力してください</span>
            </div>
            <form action='/shorten' method='post'>
                <div>
                    <label>URL</label>
                    <input type='url' name='url' required />
                    <button>短縮</button>
                </div>
            </form>
        </html>
    )
})

app.post('/shorten', async (c) => {
    const body = await c.req.parseBody()
    const url = body['url']
    if (!url) {
        c.status(500)
        return c.text("URLは必須です")
    }
    if (typeof url != "string") {
        c.status(400)
        return c.text("文字列以外はだめです")
    }
    const generator = (len: number) => {
        const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        return Array.from({ length: len }, () => c.charAt(Math.floor(Math.random() * c.length))).join('')
    }
    let exists = false
    let key = ""
    do {
        key = generator(6)
        const v = await c.env.URL_BINDING.get(key)
        if (v != null) {
            exists = true
        } else {
            exists = false
        }
    } while (exists)

    await c.env.URL_BINDING.put(key, url)
    const shortenURL = `${new URL(c.req.url).origin}/${key}`
    const QRBase64 = `data:image/png;base64,${qr.imageSync(shortenURL).toString('base64')}`
    return c.html(
        <html>
            <h1>短縮URLが生成されました！</h1>
            <h2>{shortenURL}</h2>
            <img src={QRBase64} />
        </html>
    )
})

app.get('/:key', async (c) => {
    const key = c.req.param('key')
    const url = await c.env.URL_BINDING.get(key)
    if (url == null) {
        return c.notFound()
    }
    return c.redirect(url)
})

export default app
