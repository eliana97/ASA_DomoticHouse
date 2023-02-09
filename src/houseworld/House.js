const Beliefset =  require('../bdi/Beliefset')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Person = require('./Person')
const Light = require('./Light')
const {AlarmGoal, AlarmIntention} = require('./Alarm')
const {SenseLightsGoal, SenseLightsIntention} = require('./LightSensor')
const BrightnessSensor = require('./BrightnessSensor')
const Room = require('./Room')


class House{
    
    constructor(){
    // ............................ROOMS..............................................//
        this.rooms={
            kitchen: new Room.Room('kitchen',0,[],false),
            living_room: new Room('living_room',0,[],false),
            main_bathroom: new Room('main_bathroom',0,[],false),
            study_room: new Room('study_room',0,[],false),
            hall: new Room('hall',0,[],false)
        }
        this.rooms.kitchen.doors_to = [hall]
        this.rooms.living_room.doors_to = [hall]
        this.rooms.main_bathroom.doors_to = [hall]
        this.rooms.study_room.doors_to = [hall]
        this.rooms.hall.doors_to = [kitchen,living_room,main_bathroom,study_room]

    //...................................PEOPLE..............................................//
        this.people = {
            marco: new Person.Person(this,'Marco',this.rooms.living_room,false),
            ivana: new Person.Person(this,'Ivana',this.rooms.kitchen,false)
        }
    //........................................DEVICES...............................................//
        this.lights = {}
            for (let [key, room] of Object.entries(this.rooms)) {
               //this.lights['light_' + room.name] = new Light.Light('light_' + room.name, room, 10, this.utilities.electricity)
                this.lights['light_' + room.name] = new Light(this,'light'+ room.name, 100)
            }
        }
    }


module.exports = {House}
