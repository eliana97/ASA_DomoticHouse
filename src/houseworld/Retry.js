
const Goal = require("../bdi/Goal");
const Intention = require("../bdi/Intention");
const Beliefset =  require('../bdi/Beliefset');


class RetryGoal extends Goal { }

class RetryIntention extends Intention {

	static applicable (goal) {
		return goal instanceof RetryGoal
	}

	*exec ({goal}=parameters) {
        for(let i = 0; i < 4; i++) {
            let goalAchieved = yield this.agent.postSubGoal( goal )
            if (goalAchieved)
                return;
			this.log('wait for something to change on beliefset before retrying for the ' + (i+2) + 'th time goal', goal.toString())
            yield this.agent.beliefs.notifyAnyChange()
        }
    }
}

module.exports = {RetryGoal, RetryIntention}; 