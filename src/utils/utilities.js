
function generateRandomInt(min,max){
    return Math.floor((Math.random() * (max-min)) +min);
}

Winter = ({
    01: 0,
    02: 0,
    03: 0,
    04: 0,
    05: 0,
    06: 0,
    07: 1,
    08: 1,
    09: generateRandomInt(1,4),
    10: generateRandomInt(1,4),
    11: generateRandomInt(1,4),
    12: generateRandomInt(1,4),
    13: generateRandomInt(1,5),
    14: generateRandomInt(1,4),
    15: generateRandomInt(1,3),
    16: generateRandomInt(1,3),
    17: generateRandomInt(1,3),
    18: generateRandomInt(1,2),
    19: 1,
    20: 0,
    21: 0,
    22: 0,
    23: 0,
    24: 0,
})


console.log(Winter[2])


module.exports = Winter
