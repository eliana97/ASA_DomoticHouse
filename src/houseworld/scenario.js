const Beliefset =  require('../bdi/Beliefset')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Person = require('./Person')
const Principal = require ('./Principal')
const Light = require('./Light')
const {AlarmGoal, AlarmIntention} = require('./Alarm')
const Brightness = require('./BrightnessSensor')
const {SenseLightsGoal, SenseLightsIntention, SenseOneLightGoal, SenseOneLightIntention} = require('./LightSensor')
const Room = require('./Room')
const Shutter = require('./Shutter')
const VacuumCleaner = require ('./VacuumCleaner')
const MessageDispatcher = require('./MessageDispatcher')
const Retry = require('./Retry')
const SolarPanel = require('./SolarPanel')
const ResourceMonitor = require('./ResourceMon')

class RetryGoal extends Goal { }
class RetryIntention extends Intention {
    static applicable(goal) {
        return goal instanceof RetryGoal
    }
    *exec({ goal } = parameters) {
        for (let i = 0; i < 10; i++) {
            let goalAchieved = yield this.agent.postSubGoal(goal)
            if (goalAchieved)
                return;
            this.log('wait for something to change on beliefset or timeout before retrying for the ' + (i + 2) + 'th time goal', goal.toString())
            // yield this.agent.beliefs.notifyAnyChange()
            yield new Promise(res => {
                this.agent.beliefs.observeAny((value, key, observer) => { res(value) })
                // Clock.global.observe('hh', (hh, key) => {res(hh)})
                setTimeout(() => { res() }, 100)
            })
        }
    }
}

//Function that generates random value range:0-12
function generateRandomInt(min,max){
    return Math.floor((Math.random() * (max-min)) +min);
}
mounth = generateRandomInt(0,12)
console.log("THE MOUNTH IS ",mounth)


class House{
    
    constructor() {

        this.utilities = {
            electricity: new Observable({ total_consumption: 0, current_consumption: 0 }),
        }
        
    // .............ROOMS...................//
        this.rooms={
            hall: new Room.Room('hall',0,[],true),
            kitchen: new Room.Room('kitchen',0,[],true),
            living_room: new Room.Room('living_room',0,[],true),
            main_bathroom: new Room.Room('main_bathroom',0,[],true),
            study_room: new Room.Room('study_room',0,[],true),
            entrance: new Room.Room('entrance', 0, [], true),
            bedroom: new Room.Room('bedroom',0,[],true)
        }
        let doors_to = [
            [this.rooms.living_room,this.rooms.hall],
            [this.rooms.kitchen,this.rooms.hall],
            [this.rooms.main_bathroom,this.rooms.hall],
            [this.rooms.study_room,this.rooms.hall],
            [this.rooms.entrance, this.rooms.hall],
            [this.rooms.bedroom, this.rooms.hall]
        ]
     
        doors_to.forEach(pair => {
            let room1 = pair[0]
            let room2 = pair[1]
            room1.doors_to.push(room2.name)
            room2.doors_to.push(room1.name)
        })
        
    //..............PEOPLE...................//
        this.people = {
            marco: new Person.Person(this, 'Marco', this.rooms.entrance,false),
            ivana: new Person.Person(this, 'Ivana', this.rooms.entrance,false)
        }
    //.................DEVICES...................//
        this.devices = {}
        this.lights = {
            light_hall: new Light.Light('light_hall', this.rooms.hall, 'off', 5, this.utilities.electricity),
            light_main_bathroom: new Light.Light('light_main_bathroom', this.rooms.main_bathroom, 'off', 5, this.utilities.electricity),
            light_living_room: new Light.Light('light_living_room', this.rooms.living_room, 'off', 5, this.utilities.electricity),
            light_kitchen: new Light.Light('light_kitchen', this.rooms.kitchen, 'off', 5, this.utilities.electricity),
            light_bedroom: new Light.Light('light_bedroom', this.rooms.bedroom, 'off', 5, this.utilities.electricity)
        }
        
        
        this.shutters = {
            shutter_study_room: new Shutter.Shutter('shutter_study_room', this.rooms.study_room, 'close', 300, this.utilities.electricity),
            shutter_living_room: new Shutter.Shutter('shutter_living_room', this.rooms.living_room, 'close', 300, this.utilities.electricity),
            shutter_kitchen: new Shutter.Shutter('shutter_kitchen', this.rooms.kitchen, 'close', 300, this.utilities.electricity)
        }
        this.devices['solar_panels'] = new SolarPanel.SolarPanelDevice('solar_panels', this.utilities.electricity)
        this.devices['vacuum_cleaner1'] = new VacuumCleaner.VacuumCleanerDevice('vacuum_cleaner1', this.rooms.living_room, this.rooms)
        this.devices['principal_door'] = new Principal.Principal('principal_door', this.rooms.entrance, 'open', 10, this.utilities.electricity)
       
    }       
}

/**
 * @class HouseCleanGoal
 */
class HouseCleanGoal extends Goal {
    constructor(rooms, vacuum_cleaner, vacuum_agent_name) {
        super()

        this.rooms = rooms
        this.vacuum_cleaner = vacuum_cleaner
        this.vacuum_agent_name = vacuum_agent_name
    }
}

/**
 * @class HouseCleanIntention
 * The house agent interacts with the vacuum cleaner in order to clean the rooms.
 */
class HouseCleanIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
        this.vacuum_cleaner = this.goal.vacuum_cleaner
        this.vacuum_agent_name = this.goal.vacuum_agent_name
    }

    static applicable(goal) {
        return goal instanceof HouseCleanGoal
    }

    *exec() {
        let vacuum_cleaner_goal = this.rooms.map(r => { return `not (dirty ${r.name})` }).concat([`at ${this.vacuum_cleaner.at}`])
        yield MessageDispatcher.MessageDispatcher.authenticate(this.agent)
            .sendTo(this.vacuum_agent_name, new PlanningGoal({ goal: vacuum_cleaner_goal }))
    }
}

var house = new House()
let agents = []

// ------------------------people agents--------------------------------------------------------------------
{
    agents.marco_agent = new Agent('marco_agent',{person:house.people.marco})
    agents.ivana_agent = new Agent('ivana_agent', { person: house.people.ivana})

    agents.marco_agent.intentions.push(Room.RoomConnectionIntention)
    agents.marco_agent.postSubGoal(new Room.RoomConnectionGoal(Object.values(house.rooms)))

    agents.marco_agent.intentions.push(Person.PersonDetectionIntention)
    agents.marco_agent.postSubGoal(new Person.PersonDetectionGoal({ marco: house.people.marco }))

    let { PlanningIntention } = require('../pddl/Blackbox')([Person.Move])
    agents.marco_agent.intentions.push(PlanningIntention)

    agents.ivana_agent.intentions.push(Room.RoomConnectionIntention)
    agents.ivana_agent.postSubGoal(new Room.RoomConnectionGoal(Object.values(house.rooms)))

    agents.ivana_agent.intentions.push(Person.PersonDetectionIntention)
    agents.ivana_agent.postSubGoal(new Person.PersonDetectionGoal({ ivana: house.people.ivana }))

    //let { PlanningIntention } = require('../pddl/Blackbox')([Person.Move])
    agents.ivana_agent.intentions.push(PlanningIntention)

}

// ------------------------house agent--------------------------------------------------------------------
agents.house_agent = new Agent('house_agent')

agents.house_agent.intentions.push(SolarPanel.SolarPanelMonitorIntention)
agents.house_agent.postSubGoal(new SolarPanel.SolarPanelMonitorGoal(house.devices.solar_panels))

agents.house_agent.intentions.push(Principal.PrincipalDoorIntention)
agents.house_agent.postSubGoal(new Principal.PrincipalDoorGoal([house.devices.principal_door]))

agents.house_agent.intentions.push(Principal.PrincipalDoorControlIntention)
agents.house_agent.postSubGoal(new Principal.PrincipalDoorControlGoal([house.devices.principal_door]))

agents.house_agent.intentions.push(ResourceMonitor.EnergyMonitorIntention)
agents.house_agent.postSubGoal(new ResourceMonitor.EnergyMonitorGoal(house.utilities.electricity))


// ------------------------light agent--------------------------------------------------------------------
agents.light_agent = new Agent('light_agent')

agents.light_agent.intentions.push(Person.PersonDetectionIntention)
agents.light_agent.postSubGoal(new Person.PersonDetectionGoal(house.people))

agents.light_agent.intentions.push(Person.SleepingSensorIntention)
agents.light_agent.postSubGoal(new Person.SleepingSensorGoal(house.people))

agents.light_agent.intentions.push(Brightness.BrightnessSensorIntention)
agents.light_agent.postSubGoal(new Brightness.BrightnessSensorGoal(house.rooms))

agents.light_agent.intentions.push(Light.LightSensorIntention)
agents.light_agent.postSubGoal(new Light.LightSensorGoal(house.lights))

agents.light_agent.intentions.push(Light.LightControlIntention)
agents.light_agent.postSubGoal(new Light.LightControlGoal(house.lights, house.people))

//-----------------------------------Shutter Agent---------------------------------------------------

agents.shutter_agent = new Agent('shutter_agent')

agents.shutter_agent.intentions.push(Shutter.ShutterSensorIntention)
agents.shutter_agent.postSubGoal(new Shutter.ShutterSensorGoal(house.shutters))

agents.shutter_agent.intentions.push(Shutter.ShutterControlIntention)
agents.shutter_agent.postSubGoal(new Shutter.ShutterControlGoal(house.shutters,mounth))


// ------------------------vacuum cleaner agents--------------------------------------------------------------------
{
   
    agents.vacuum_cleaner1 = new Agent('vacuum_cleaner1', { vacuum_cleaner: house.devices.vacuum_cleaner1 })
    let rooms = [house.rooms.study_room, house.rooms.hall, house.rooms.main_bathroom, house.rooms.living_room, house.room.bedroom]
 

    agents.vacuum_cleaner1.intentions.push(Room.RoomConnectionIntention)
    agents.vacuum_cleaner1.postSubGoal(new Room.RoomConnectionGoal(rooms))

    agents.vacuum_cleaner1.intentions.push(Person.SomeoneInRoomDetectionIntention)
    agents.vacuum_cleaner1.postSubGoal(new Person.SomeoneInRoomDetectionGoal(house.people, rooms))

    agents.vacuum_cleaner1.intentions.push(VacuumCleaner.VacuumSensorIntention)
    agents.vacuum_cleaner1.postSubGoal(new VacuumCleaner.VacuumSensorGoal(rooms, house.people))

    agents.vacuum_cleaner1.intentions.push(VacuumCleaner.Move, VacuumCleaner.Suck)
    agents.vacuum_cleaner1.intentions.push(MessageDispatcher.PostmanAcceptAllRequest)

    let { PlanningIntention } = require('../pddl/Blackbox')([VacuumCleaner.Suck, VacuumCleaner.Move])
    agents.vacuum_cleaner1.intentions.push(PlanningIntention)

    agents.vacuum_cleaner1.postSubGoal(new MessageDispatcher.Postman())
}


// ------------------------Scenarios-------------------------------------------------------------------

Clock.global.observe('mm', (mm, key) => {
    var time = Clock.global
    if (time.dd == 0 && time.hh == 6 && time.mm == 0) {
        house.people.marco.is_sleeping=false
        house.people.marco.moveTo('main_bathroom')
        house.people.ivana.is_sleeping = true
        house.people.marco.moveTo('kitchen')
           
    } else if (time.dd == 0 && time.hh == 6 & time.mm == 30) {
        house.people.ivana.is_sleeping = true
        house.people.ivana.moveTo('main_bathroom')
        house.people.ivana.moveTo('kitchen')
    }
    else if (time.dd == 0 && time.hh == 8 & time.mm == 00) {
        house.devices.solar_panels.activate()

        let rooms1 = [house.rooms.living_room, house.rooms.main_bathroom, house.rooms.hall, house.rooms.kitchen]
        agents.house_agent.intentions.push(HouseCleanIntention)
        agents.house_agent.postSubGoal(new HouseCleanGoal(rooms1, house.devices.vacuum_cleaner1, agents.vacuum_cleaner1.name))
        console.log("GOAL", agents.house_agent.postSubGoal(new HouseCleanGoal(rooms1, house.devices.vacuum_cleaner1, agents.vacuum_cleaner1.name)))
    }else if (time.dd == 0 && time.hh == 13 & time.mm == 30) {
        let rooms1 = [house.rooms.living_room, house.rooms.main_bathroom, house.rooms.hall, house.rooms.kitchen]
        agents.house_agent.intentions.push(HouseCleanIntention)
        agents.house_agent.postSubGoal(new HouseCleanGoal(rooms1, house.devices.vacuum_cleaner1, agents.vacuum_cleaner1.name))
        console.log("GOAL", agents.house_agent.postSubGoal(new HouseCleanGoal(rooms1, house.devices.vacuum_cleaner1, agents.vacuum_cleaner1.name)))
    } else if (time.dd == 0 && time.hh == 18 & time.mm == 00) {
        house.devices.solar_panels.deactivate()
    }
    else if (time.dd == 0 && time.hh == 20 & time.mm == 00) {
        house.people.ivana.moveTo('living_room')
        house.people.marco.moveTo('living_room')
    }
    else if (time.dd == 0 && time.hh == 23 & time.mm == 00) {
        house.people.ivana.moveTo('bedroom')
        house.people.marco.moveTo('bedroom')
    }
})
    

    


Clock.startTimer()