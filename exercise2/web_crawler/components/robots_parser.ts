export interface IRobotRule {
    allows: string[]
    disallows: string[]
    crawlDelay: number
}

export function parse_robots_file(robotsFile: string, url: string): IRobotRule {
    const robotRules = new Map<string, IRobotRule>();

    const segmentedRobotsFile = robotsFile.split("\n");
    let currentAgentNames = [];
    let hadRuleLast = false;

    const newRobotRule = {allows: [], disallows: [], crawlDelay: 0}
    
    for (const segment of segmentedRobotsFile) {        
        if (segment.includes("User-agent")) {
            const userAgentName = segment.split(": ")[1].split(" ")[0];
            robotRules.set(userAgentName, newRobotRule);  
            
            if (hadRuleLast) {
                currentAgentNames = []
                hadRuleLast = false;
            }
            currentAgentNames.push(userAgentName);
        }
        else if (segment.includes("Allow")) {
            addAllowOrDisallowRuleToRobotRules(segment, currentAgentNames, "allows", robotRules, hadRuleLast);
            hadRuleLast = true;
        }
        else if (segment.includes("Disallow")) {
            addAllowOrDisallowRuleToRobotRules(segment, currentAgentNames, "disallows", robotRules, hadRuleLast);
            hadRuleLast = true;
        }
        else if (segment.includes("Crawl-delay")) {
            addAllowOrDisallowRuleToRobotRules(segment, currentAgentNames, "crawlDelay", robotRules, hadRuleLast);
            hadRuleLast = true;
        }
    }

    const userAgentRule = robotRules.get("*");
    if (userAgentRule === undefined) return newRobotRule
    
    return userAgentRule;
}

function addAllowOrDisallowRuleToRobotRules(segment: string, currentAgentsName: string[], ruleType: "allows" | "disallows" | "crawlDelay", robotRules: Map<string, IRobotRule>, hadRuleLast: boolean) {
    let rule = segment.split(": ")[1];

    for (const agent of currentAgentsName) {
        const currentAgentRobotRules = robotRules.get(agent);
        if (!currentAgentRobotRules) throw new Error(`${ruleType}: Unable to find current user agent in robot rules.`); // Should never happen :)
    
        if (ruleType === "crawlDelay") {
            currentAgentRobotRules["crawlDelay"] = parseInt(rule)
        }
        else {
            currentAgentRobotRules[ruleType].push(rule);
        }
    }

}