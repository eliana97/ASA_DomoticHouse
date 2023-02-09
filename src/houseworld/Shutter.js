const Device = require('./Device');
const Goal = require('../bdi/Goal');
const Intention = require('../bdi/Intention');
const Clock = require('../utils/Clock');


class Shutter extends Device{
    constructor(name, room,status, consumption, electricity) {
        super(name,room, status, consumption)
        
        this.status = 'open'
        this.electricity = electricity
    }
    openShutter(){
        if(this.status == 'close') {
            this.status = 'open'
        }
       
    }
    closeShutter(){
        if(this.status == 'open'){
            this.status = 'close'
            
        } 
   
    }
    isOpen(){
        if(this.status == 'open') {
            return true
        }
        return false
    }
    getRoom(){
        return this.room
    }
}

 class ShutterSensorGoal extends Goal {
    constructor(shutters) {
        super()

        this.shutters = shutters
    }
}


class ShutterSensorIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.shutters = this.goal.shutters
    }

    static applicable(goal) {
        return goal instanceof ShutterSensorGoal
    }

    *exec() {
        var promises = []
        for (let [name, shutter] of Object.entries(this.shutters)) {
            this.agent.beliefs.declare(`shutter_open ${shutter.name}`, shutter.status == 'open') // set initial knowledge

            let promise = new Promise(async res => {
                while (true) {
                    await shutter.notifyChange('status')
                    this.agent.beliefs.declare(`shutter_open ${shutter.name}`, shutter.status == 'open')
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}

class ShutterControlGoal extends Goal {
    constructor(shutters,mounth) {
        super()

        this.shutters = shutters
        this.mounth = mounth
    }
}

/**
 * @class ShutterControlIntention
 * Control the shutters of the house: close the shutters with respect to mounth,
 *  that is a random variable between 0 to 11
 */
class ShutterControlIntention extends Intention {
    constructor(agent, goal,mounth) {
        super(agent, goal)

        this.shutters = this.goal.shutters
        this.mounth = this.goal.mounth
    }

    static applicable(goal) {
        return goal instanceof ShutterControlGoal
    }

    *exec() {
        var promises = []
        for (let [name, shutter] of Object.entries(this.shutters)) {
            let promise = new Promise(async res => {
                while (true) {
                    let hour = await Clock.global.notifyChange('hh')
                    // 1 FLOOR
                    this.controlFirstFloor(shutter,hour)
                                                 
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
    controlFirstFloor(shutter,hour){
        //In summer close the shutter in living_room and study_room from 8 to 12 and from 22 to 6
        // and in the kitchen from 12  to 16 and form 22 to 6 
        if(this.mounth == 7 || this.mounth == 8 || this.mounth == 9 ){
            if(shutter.name == 'shutter_living_room' || shutter.name == 'shutter_study_room' ){
                if ( hour <= 5 || hour >= 8 && hour<=11 || hour >= 22) {
                    if (this.agent.beliefs.check(`shutter_open ${shutter.name}`)) {
                        shutter.closeShutter()
                        this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
                    }
                } else {
                    if (!this.agent.beliefs.check(`shutter_open ${shutter.name}`)) {
                        shutter.openShutter()
                        this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
                    }
                }
                } else if (shutter.name == 'shutter_kitchen'){
                    if ( hour <= 5 || hour >= 12 && hour<=16 || hour >= 22) {
                        if (this.agent.beliefs.check(`shutter_open ${shutter.name}`)) {
                            shutter.closeShutter()
                            this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
                        }
                    } else {
                        if (!this.agent.beliefs.check(`shutter_open ${shutter.name}`)) {
                            shutter.openShutter()
                            this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
                        }
                    }
                }      
                }
                // in winter the shutter are closed from 19 to 7
                else if (this.mounth == 10 || this.mounth == 11 || this.mounth == 0 ||this.mounth == 1 || this.mounth == 2
                    || this.mounth == 3 || this.mounth == 4 || this.mounth == 5 || this.mounth == 6    ){
                    if ( hour <= 6 || hour >= 19) {
                        if (this.agent.beliefs.check(`shutter_open ${shutter.name}`)) {
                            shutter.closeShutter()
                            this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
                        }
                    } else {
                        if (!this.agent.beliefs.check(`shutter_open ${shutter.name}`)) {
                            shutter.openShutter()
                            this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
                        }
                    }
                }
    }

}


module.exports = {Shutter,ShutterControlGoal,ShutterControlIntention,ShutterSensorGoal,ShutterSensorIntention}

