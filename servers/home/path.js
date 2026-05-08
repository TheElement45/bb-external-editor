/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];

    if (!target) {
        ns.tprint("ERROR: Please provide a target server hostname.");
        ns.tprint("Usage: run path.js <hostname>");
        ns.tprint("Example: run path.js CSEC");
        return;
    }

    // A dictionary to map servers to their shortest path from "home"
    let paths = { "home": ["home"] };
    let queue = ["home"];
    
    // Breadth-First Search (BFS) to find the shortest path
    while (queue.length > 0) {
        let current = queue.shift();

        // If we found the target, construct and print the connect string
        if (current === target) {
            let route = paths[current];
            
            // Remove "home" from the beginning since we are already there
            route.shift();

            if (route.length === 0) {
                ns.tprint("You are already on the target server.");
                return;
            }

            // Create a copy-pasteable string for the terminal
            let connectStr = route.map(server => `connect ${server};`).join(" ");
            connectStr += " backdoor;"; // Append backdoor command at the end for convenience
            
            ns.tprint(`[SUCCESS] Path to ${target} found!`);
            ns.tprint(`Copy/paste this into your terminal:`);
            ns.tprint(`\n${connectStr}\n`);
            return;
        }

        // Scan current server for neighbors
        let neighbors = ns.scan(current);
        for (let neighbor of neighbors) {
            // If we haven't visited this neighbor yet, add it to the queue
            if (!paths[neighbor]) {
                paths[neighbor] = [...paths[current], neighbor];
                queue.push(neighbor);
            }
        }
    }

    // If queue is empty and target wasn't found
    ns.tprint(`[ERROR] Server '${target}' not found on the network. Make sure the hostname is correct.`);
}
