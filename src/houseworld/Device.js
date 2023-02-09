const Observable = require('../utils/Observable')

class Device extends Observable{
    constructor (name, room, status, consumption, electricity) {
        super({name: name, room:room,status: status,consumption:consumption});

        this.name = name;
        this.status = status;
        this.consumption = consumption;
        this.electricity = electricity
        this.totalConsumption = 0;
    }
    getStatus(){
        return this.status
    }
    getName(){
        return this.name
    }
    getTotalConsumption(){
        return this.totalConsumption
    }
    

}


module.exports = Device;