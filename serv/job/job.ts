import moment = require('moment');
import * as schedule from 'node-schedule';

export interface IJob {
    scheduleJob?: schedule.Job;
    rule: string;
    doJob(time: moment.Moment): Promise<void>
}

export class JobServ {
    jobs: IJob[] = [];
    
    async start(startup = false) {
        for (const job of this.jobs) {
            if (startup) {
                await job.doJob(moment());
            }
            
            job.scheduleJob = schedule.scheduleJob(job.rule, () => {
                job.doJob(moment());
            })
        }
    }
}

export const JobManager = new JobServ();