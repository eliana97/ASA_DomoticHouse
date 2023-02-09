const Observable = require('../utils/Observable');
const Intention = require('../bdi/Intention');
const Goal = require('../bdi/Goal');
const Beliefset = require('../bdi/Beliefset');
const pddlActionIntention = require('../pddl/actions/pddlActionIntention')



class Person extends Observable {
    
    constructor (house, name, in_room, is_sleeping) {
        super()
        this.house = house;                     
        this.name = name;                     
        this.set('in_room', in_room)            
        this.set('is_sleeping',is_sleeping)     
    
    }
    
    moveTo (to) {
        
        if (this.house.rooms[this.in_room].doors_to.includes(to)) {
         
            this.in_room = to
            return true
        }
        else {
            console.log(this.name, 'Move failed', this.in_room, 'to', to)
            return false
        }
    }
    wakeUp(){
        this.is_sleeping = false
    }
    goSleep(){
        this.is_sleeping = true
    }
}


class SleepingSensorGoal extends Goal{
    constructor(people){
        super()
    this.people = people
    }
}

class SleepingSensorIntention extends Intention{
    constructor(agent, goal){
        super(agent,goal)

        this.people = this.goal.people
    }
    static applicable(goal){
        return goal instanceof SleepingSensorGoal
    }
    *exec(){
        var sleepGoal = []
        for(let[name,person] in Object.entries(this.people)){
            this.agent.beliefs.declare(`is_sleeping ${person.name}`, person.is_sleeping)
            console.log(this.agent.beliefs.declare(`is_sleeping ${person.name} `, person.is_sleeping))
            let sleepGoalPromise = new Promise( async res => {
                while(true){
                    await person.notifyChange('is_sleeping')
                    this.agent.beliefs.declare(`is_sleeping ${person.name} `, person.is_sleeping)
                }
            
            });
            sleepGoal.push(sleepGoalPromise)
        }
        yield Promise.all(sleepGoal)
    }
}

class PersonDetectionGoal extends Goal{
    constructor(people){
        super()

        this.people = people
    }
}
class PersonDetectionIntention extends Intention{
    constructor(agent,goal) {
        super(agent,goal)

        this.people = this.goal.people
    }
    static applicable(goal){
      return goal instanceof PersonDetectionGoal  
    }
    *exec() {
        var personDetection = []
        for (let [name, person] of Object.entries(this.people)) {
            this.agent.beliefs.declare(`person_in_room ${person.name} ${person.in_room}`) // set initial knowledge

            let personPromise = new Promise(async res => {
                while (true) {
                    let room = await person.notifyChange('in_room')
                    this.log(person.name + ' moved into ' + room)
                    for (let literal of this.agent.beliefs.matchingLiterals(`person_in_room ${person.name} *`)) {
                      this.agent.beliefs.undeclare(literal) // undeclare the previous position of the person
                    }
                    this.agent.beliefs.declare(`person_in_room ${person.name} ${room}`)
                }
            });

            personDetection.push(personPromise)
        }
        yield Promise.all(personDetection)
    }
   
}

class SomeoneInRoomDetectionGoal extends Goal {
    constructor(people, rooms) {
        super()

        this.people = people
        this.rooms = rooms
    }
}

class SomeoneInRoomDetectionIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.people = this.goal.people
        this.rooms = this.goal.rooms
    }

    static applicable(goal) {
        return goal instanceof SomeoneInRoomDetectionGoal
    }

    *exec() {
        for (let [name, room] of Object.entries(this.rooms)) {
            this.someone_detected(room) // set initial knowledge
        }

        var promises = []
        for (let [name, person] of Object.entries(this.people)) {
            let promise = new Promise(async res => {
                while (true) {
                    await person.notifyChange('in_room')
                    for (let [name, room] of Object.entries(this.rooms)) {
                        this.someone_detected(room)
                    }
                }
            });

            promises.push(promise)
        }
        yield Promise.all(promises)
    }

    someone_detected(room) {
        for (let [name, person] of Object.entries(this.people)) {
            if (person.in_room == room.name) {
                this.agent.beliefs.declare(`someone_in_room ${room.name}`)
                this.agent.beliefs.undeclare(`free_room ${room.name}`)
                return true
            }
        }

        this.agent.beliefs.undeclare(`someone_in_room ${room.name}`)
        this.agent.beliefs.declare(`free_room ${room.name}`)
        return false
    }
}

class DoorSensorDetectingGoal extends Goal{
    constructor(people){
        super()
        this.people = people
        
    }
}
class DoorSensorDetectingIntent extends Intention{
    constructor(agent,goal){
        super(agent,goal)
        
        this.people = this.goal.people
    }
    static applicable(goal){
        return goal instanceof DoorSensorDetectingGoal
    }
    *exec() {
        var doorDetectControl = []
        for (let[name,person]of Object.entries(this.people)){
            this.agent.beliefs.declare(`person_in_room ${person.name} ${person.in_room}`)
            let doorDetectPromise = new Promise(async res => {
                while (true) {
                    let room = await person.notifyChange('in_room')
                    this.log(person.name + ' moved into ' + room)
                        for (let literal of this.agent.beliefs.matchingLiterals(`person_in_room ${person.name} *`)) {
                           this.agent.beliefs.undeclare(literal) // undeclare the previous position of the person
                         }
                    this.agent.beliefs.declare(`person_in_room ${person.name} ${room}`)
                    this.agent.beliefs.declare(`open the principal Door`)
                }
            });

            doorDetectControl.push(doorDetectPromise)

        }
    }

}
class Move extends pddlActionIntention {

    *exec({ person, r1, r2 } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.person.moveTo(r2)
            yield new Promise(res => setTimeout(res, 0))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!
    }

    static parameters = ['person', 'r1', 'r2']
    static precondition = [['person_in_room', 'person', 'r1'], ['connected', 'r1', 'r2']]
    static effect = [['not person_in_room', 'person', 'r1'], ['person_in_room', 'person', 'r2']]

}

module.exports = {Person,SleepingSensorGoal,SleepingSensorIntention,PersonDetectionGoal,PersonDetectionIntention,
     DoorSensorDetectingGoal,DoorSensorDetectingIntent,
     SomeoneInRoomDetectionGoal, SomeoneInRoomDetectionIntention,
     Move}