// servers/home/lib/solvers.js

export const solvers = {
    "Find Largest Prime Factor": (data) => {
        let n = data;
        let maxPrime = -1;
        while (n % 2 === 0) {
            maxPrime = 2;
            n >>= 1;
        }
        for (let i = 3; i <= Math.sqrt(n); i += 2) {
            while (n % i === 0) {
                maxPrime = i;
                n = n / i;
            }
        }
        if (n > 2) maxPrime = n;
        return maxPrime;
    },
    
    "Subarray with Maximum Sum": (data) => {
        let max_so_far = data[0];
        let curr_max = data[0];
        for (let i = 1; i < data.length; i++) {
            curr_max = Math.max(data[i], curr_max + data[i]);
            max_so_far = Math.max(max_so_far, curr_max);
        }
        return max_so_far;
    },

    "Total Ways to Sum": (data) => {
        let ways = new Array(data + 1).fill(0);
        ways[0] = 1;
        for (let i = 1; i < data; i++) {
            for (let j = i; j <= data; j++) {
                ways[j] += ways[j - i];
            }
        }
        return ways[data];
    },

    "Spiralize Matrix": (data) => {
        let result = [];
        let r1 = 0, r2 = data.length - 1;
        let c1 = 0, c2 = data[0].length - 1;
        while (r1 <= r2 && c1 <= c2) {
            for (let c = c1; c <= c2; c++) result.push(data[r1][c]);
            for (let r = r1 + 1; r <= r2; r++) result.push(data[r][c2]);
            if (r1 < r2 && c1 < c2) {
                for (let c = c2 - 1; c > c1; c--) result.push(data[r2][c]);
                for (let r = r2; r > r1; r--) result.push(data[r][c1]);
            }
            r1++; r2--; c1++; c2--;
        }
        return result;
    },

    "Array Jumping Game": (data) => {
        let n = data.length;
        let reachable = 0;
        for (let i = 0; i < n; i++) {
            if (i > reachable) return 0;
            reachable = Math.max(reachable, i + data[i]);
        }
        return 1;
    },

    "Merge Overlapping Intervals": (data) => {
        data.sort((a, b) => a[0] - b[0]);
        let result = [];
        for (let interval of data) {
            if (result.length === 0 || result[result.length - 1][1] < interval[0]) {
                result.push(interval);
            } else {
                result[result.length - 1][1] = Math.max(result[result.length - 1][1], interval[1]);
            }
        }
        return result;
    },

    "Generate IP Addresses": (data) => {
        let result = [];
        for (let a = 1; a <= 3; ++a) {
            for (let b = 1; b <= 3; ++b) {
                for (let c = 1; c <= 3; ++c) {
                    for (let d = 1; d <= 3; ++d) {
                        if (a + b + c + d === data.length) {
                            let A = parseInt(data.substring(0, a), 10);
                            let B = parseInt(data.substring(a, a + b), 10);
                            let C = parseInt(data.substring(a + b, a + b + c), 10);
                            let D = parseInt(data.substring(a + b + c, a + b + c + d), 10);
                            if (A <= 255 && B <= 255 && C <= 255 && D <= 255) {
                                let ip = [
                                    A.toString(), B.toString(),
                                    C.toString(), D.toString()
                                ].join(".");
                                if (ip.length === data.length + 3) {
                                    result.push(ip);
                                }
                            }
                        }
                    }
                }
            }
        }
        return result;
    },

    "Algorithmic Stock Trader I": (data) => {
        let maxProfit = 0;
        for (let i = 0; i < data.length; i++) {
            for (let j = i + 1; j < data.length; j++) {
                let profit = data[j] - data[i];
                if (profit > maxProfit) maxProfit = profit;
            }
        }
        return maxProfit;
    },
    
    "Algorithmic Stock Trader II": (data) => {
        let profit = 0;
        for (let i = 1; i < data.length; i++) {
            if (data[i] > data[i - 1]) {
                profit += data[i] - data[i - 1];
            }
        }
        return profit;
    }
};
