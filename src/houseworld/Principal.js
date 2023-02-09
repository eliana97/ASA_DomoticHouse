const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Device = require('./Device')


class Principal extends Device{
    constructor(name, room,status, consumption, electricity_utility) {
        super(name,room, status, consumption)
        
        this.status = 'close'
        this.electricity_utility = electricity_utility
    
    }
    open(){
        if(this.status == close){
            this.status == 'open'
        }
        
    }
    close(){
        if(this.status == open)
        this.status == 'close'
    }
  
}

class PrincipalDoorGoal extends Goal{
    constructor(principalDoor){
        super()
    
    this.principalDoor = principalDoor
    }
}

class  PrincipalDoorIntention extends Intention{
    constructor(agent,goal){
        super(agent,goal)

        this.principalDoor = this.goal.principalDoor
    }
    static applicable(goal){
        return goal instanceof PrincipalDoorGoal
    }
    *exec(){
        var doorGoal = []
        for (let [name, door] of Object.entries(this.doors)) {
            this.agent.beliefs.declare(`principal_door_open ${door.name}`, door.status == 'open')

            let doorPromise = new Promise(async res => {
                while (true) {
                    await door.notifyChange('status')
                    this.agent.beliefs.declare(`principal_door_open ${door.name}`, door.status == 'open')
                }
            });

            doorGoal.push(doorPromise)
        }

        yield Promise.all(doorGoal)
    }
}

class PrincipalDoorControlGoal extends Goal{
    constructor(principalDoor){
        super()
        this.principalDoor = principalDoor
    }
}

class PrincipalDoorControlIntention extends Intention{
    constructor(agent,goal){
        super(agent,goal)
        
        this.principalDoor = this.goal.principalDoor
    }
    static applicable(goal){
        return goal instanceof PrincipalDoorControlGoal
    }
    *exec() {
        var doorControl = []
        for (let [name, door] of Object.entries(this.door)) {
            let doorControlPromise = new Promise(async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')

                    if (hh >= 23) { // close the  door if open at 11.00 PM
                        if (this.agent.beliefs.check(`principal_door_open ${door.name}`)) {
                            door.close()
                            this.log('closing ' + door.name)
                        }
                    }


                }
            });

            doorControl.push(doorControlPromise)
        }

        yield Promise.all(doorControl)
    }

}



module.exports = {Principal,PrincipalDoorGoal,PrincipalDoorIntention,PrincipalDoorControlGoal,PrincipalDoorControlIntention}