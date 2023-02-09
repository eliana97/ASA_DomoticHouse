const Observable = require('../utils/Observable');
const Intention = require('../bdi/Intention');
const Goal = require('../bdi/Goal');
const Clock = require('../utils/Clock');
const Device = require('./Device');


class Light extends Device {
    
    constructor(name, room,status, consumption, electricity_utility) {
        super(name,room, status, consumption)
        
        this.status = 'off'
        this.electricity_utility = electricity_utility
        // calculate the consumption at every clock increment
        this.consumption_callback = () => {
            let consumption = this.consumption / (60 / Clock.getIncrement().mm) 
            this.electricity_utility.total_consumption += consumption
        }

    }
    switchOn () {
      if(this.status == 'off'){
        this.status = 'on'
          this.electricity_utility.current_consumption += this.consumption
          Clock.global.observe('mm', this.consumption_callback)
      }
        
    }
    switchOff () {
        if (this.status == 'on') {
            this.status = 'off'
            this.electricity_utility.current_consumption -= this.consumption
            Clock.global.unobserve('mm', this.consumption_callback)
        }
    }
}

class LightSensorGoal extends Goal{
    constructor(lights){
        super()
    /** @type {Array<rooms>} rooms */
    this.lights = lights
    }
}

class LightSensorIntention extends Intention{
    constructor(agent,goal){
        super(agent,goal)
            this.lights = this.goal.lights
        
    }
    static applicable(goal){
        return goal instanceof LightSensorGoal
    }
    *exec(){
        var lightGoal = []
        for (let[name,light]in Object.entries(this.lights)){
            this.agent.beliefs.declare(`light_on ${light.name}`,light.status='on')
            let lightGoalPromise = new Promise(async res => {
                while(true){
                    await light.notifyChange('status')
                    this.agent.beliefs.declare(`light_on ${light.name}`, light.status == 'on')
                }
            
            
            
            });
            lightGoal.push(lightGoalPromise)
        }
        yield Promise.all(lightGoal)
    }
}
class LightControlGoal extends Goal {
    constructor(lights, people) {
        super()

        this.lights = lights
        this.people = people

    }
}
class LightControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.lights = this.goal.lights
        this.people = this.goal.people
    }

    static applicable(goal) {
        return goal instanceof LightControlGoal
    }

    *exec() {
        var lightControl = []
        for (let [name, light] of Object.entries(this.lights)) {
            let lightControlPromise = new Promise(async res => {
                while (true) {
                    await this.agent.beliefs.notifyChange(`brightness_high ${light.room.name}`)
                    this.adaptLights(light.room)
                }
            });
            lightControl.push(lightControlPromise)

            for (let [name, person] of Object.entries(this.people)) {
                let personPromise = new Promise(async res => {
                    while (true) {
                        await this.agent.beliefs.notifyChange(`person_in_room ${person.name} ${light.room.name}`)
                        this.adaptLights(light.room)
                    }
                });
                lightControl.push(personPromise)
            }
        }

        for (let [name, person] of Object.entries(this.people)) {
            let sleepPromise = new Promise(async res => {
                while (true) {
                    await this.agent.beliefs.notifyChange(`is_sleeping ${person.name}`)
                    this.adaptLights(person.in_room)
                }
            });
            lightControl.push(sleepPromise)
        }

        for (let [name, light] of Object.entries(this.lights)) {
            this.adaptLights(light.room)
        }

        yield Promise.all(lightControl)
    }

    adaptLights(room) {
        for (let [name, light] of Object.entries(this.lights)) {
            if (light.room.name != room.name)
                continue

            let brightness_high = this.agent.beliefs.check(`brightness_high ${light.room.name}`)

            let someone_in_room = false
            let someone_is_sleeping = false
            for (let [name, person] of Object.entries(this.people)) {
                if (this.agent.beliefs.check(`person_in_room ${person.name} ${light.room.name}`)) {
                    someone_in_room = true
                    if (this.agent.beliefs.check(`is_sleeping ${person.name}`)) {
                        someone_is_sleeping = true
                        break
                    }
                }
            }

            if (someone_in_room && !someone_is_sleeping && !brightness_high) {
                light.switchOn()
                this.log('lights switched on in room ' + light.room.name)
            }
            
            else{
                light.switchOff()
                this.log('lights switched off in room ' + light.room.name)
            }

        }

    }
}


module.exports = {Light,LightSensorGoal,LightSensorIntention, LightControlGoal,LightControlIntention}