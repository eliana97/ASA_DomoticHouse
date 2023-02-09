const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')

class BrightnessSensorGoal extends Goal {
    constructor(rooms) {
        super()

        this.rooms = rooms
    }
}

class BrightnessSensorIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
    }

    static applicable(goal) {
        return goal instanceof BrightnessSensorGoal
    }

    *exec() {
        var promises = []
        for (let [name, room] of Object.entries(this.rooms)) {
            
            this.agent.beliefs.declare(`brightness_high ${room.name}`, (Clock.global.hh >= 7 && Clock.global.hh <= 19)) // set initial knowledge

            let promise = new Promise(async res => {
                while (true) {
                    let hour = await Clock.global.notifyChange('hh')
                    let brightness
                    // from 7 to 19, brightness is high
                    hour >= 7 && hour <= 19 ? brightness = 'high': brightness = 'low'

                    let changes = this.agent.beliefs.declare(`brightness_high ${room.name}`, brightness == 'high')
                    if (changes)
                        this.log('brightness ' + room.name + ' ' + brightness)
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}

module.exports = { BrightnessSensorGoal, BrightnessSensorIntention }