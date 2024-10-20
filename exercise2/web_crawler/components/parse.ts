export function parse(url: string): URL {
    // Convert the protocol and host to lower case
    const lowercased_url = url.replace(/^(https?:\/\/)([^\/]+)(.*)$/i, (match, protocol, host, path) => {
        const [userInfoAndHost, ...rest] = host.split('@')
        const userInfo = rest.length > 0 ? userInfoAndHost : ''
        const actualHost = rest.length > 0 ? rest.join('@') : userInfoAndHost
        
        const lowerCaseProtocol = protocol.toLowerCase()
        const lowerCaseHost = actualHost.toLowerCase()
        
        return `${lowerCaseProtocol}${userInfo ? userInfo + '@' : ''}${lowerCaseHost}${path}`
    })

    // add more tricks here
    
    return new URL(lowercased_url)
}