export async function fetch_url(url: string, userAgentName: string): Promise<string> {
    const res = await fetch(url, {headers: {'User-Agent': userAgentName}})
    const page_html = await res.text()
    return page_html
}